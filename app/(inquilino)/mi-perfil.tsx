import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { StyleSheet, type TextInput, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import { detalleTecnico, mensajeDeError } from '@/api/errores';
import type { PerfilInquilino } from '@/api/inquilino';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { DetalleTecnico } from '@/componentes/DetalleTecnico';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { SeccionFoto } from '@/componentes/inmuebles/SeccionFoto';
import { useSubidaFoto } from '@/componentes/inmuebles/useSubidaFoto';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import {
  useActualizarPerfilInquilino,
  usePerfilInquilino,
  useSubirFotoCedulaInquilino,
} from '@/consultas/inquilino';
import {
  camposCambiadosPerfilInquilino,
  esquemaPerfilInquilino,
  type ValoresPerfilInquilino,
} from '@/perfil/esquemas';
import { colores, espaciado, tintaAlfa } from '@/tema';

// Perfil del inquilino: nombre y teléfono se editan; cédula y correo son solo lectura. El cambio
// NO modifica los contratos: conservan lo que escribió el arrendador. R4-B: campos con etiqueta fuera,
// "Guardar cambios" (con sus avisos) en la barra fija y los datos de solo lectura en filas.
export default function MiPerfilInquilino() {
  const { data: perfil, isPending, isError, error, refetch } = usePerfilInquilino();

  if (perfil === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={3} />
        ) : (
          <>
            {error instanceof ErrorApi && error.status === 404 ? (
              <EstadoMensaje titulo="No encontrado" mensaje="No pudimos encontrar tu perfil." />
            ) : (
              <Aviso mensaje={mensajeDeError(isError ? error : null)} />
            )}
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }

  return <FormularioPerfil key={perfil.id} perfil={perfil} />;
}

const esquema = esquemaPerfilInquilino();

function FormularioPerfil({ perfil }: { perfil: PerfilInquilino }) {
  const actualizar = useActualizarPerfilInquilino();
  const [guardado, setGuardado] = useState(false);
  const [sinCambios, setSinCambios] = useState(false);
  const [errorServidor, setErrorServidor] = useState<{
    mensaje: string;
    detalle: string | null;
  } | null>(null);
  const enviando = useRef(false);
  const telefono = useRef<TextInput>(null);
  const original: ValoresPerfilInquilino = { nombre: perfil.nombre, telefono: perfil.telefono };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoresPerfilInquilino>({
    resolver: zodResolver(esquema) as unknown as Resolver<ValoresPerfilInquilino>,
    defaultValues: original,
  });

  const alEnviar = handleSubmit(async (valores) => {
    setErrorServidor(null);
    setGuardado(false);
    setSinCambios(false);
    const cambios = camposCambiadosPerfilInquilino(original, valores);
    if (Object.keys(cambios).length === 0) {
      setSinCambios(true);
      return;
    }
    try {
      // El PATCH es idempotente: tras "sin respuesta" se puede reintentar directo.
      await actualizar.mutateAsync(cambios);
      setGuardado(true);
    } catch (falla) {
      setErrorServidor({ mensaje: mensajeDeError(falla), detalle: detalleTecnico(falla) });
    }
  });

  async function enviar() {
    if (enviando.current) return;
    enviando.current = true;
    try {
      await alEnviar();
    } finally {
      enviando.current = false;
    }
  }

  // La acción principal queda fija abajo; lo que pasó al guardar va justo encima.
  const accionFija = (
    <View style={estilos.barra}>
      {errorServidor ? (
        <>
          <Aviso mensaje={errorServidor.mensaje} />
          <DetalleTecnico detalle={errorServidor.detalle} />
        </>
      ) : null}
      {guardado ? <Aviso mensaje="Cambios guardados." tono="exito" /> : null}
      {sinCambios ? <Aviso mensaje="No hiciste ningún cambio." tono="informacion" /> : null}
      <Boton
        titulo="Guardar cambios"
        tituloCargando="Guardando…"
        cargando={isSubmitting}
        ancho="completo"
        onPress={() => void enviar()}
      />
    </View>
  );

  return (
    <PantallaPila accionFija={accionFija}>
      <View style={estilos.grupo}>
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <CampoTexto
              etiqueta="Nombre completo"
              valor={field.value}
              onCambio={field.onChange}
              onBlur={field.onBlur}
              error={errors.nombre?.message}
              keyboardType="default"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => telefono.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="telefono"
          render={({ field }) => (
            <CampoTexto
              etiqueta="Teléfono"
              valor={field.value}
              onCambio={field.onChange}
              onBlur={field.onBlur}
              error={errors.telefono?.message}
              inputRef={telefono}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={() => void enviar()}
            />
          )}
        />
        <Texto variante="secundario" color={colores.textoSecundario}>
          Tus contratos conservan los datos que tu arrendador escribió; este cambio no los modifica.
        </Texto>

        <View style={estilos.soloLectura}>
          <Superficie relleno="ninguno">
            <DatoPerfil etiqueta="Cédula" valor={perfil.cedula ?? 'No registrada'} />
            <DatoPerfil etiqueta="Correo" valor={perfil.correo ?? 'No registrado'} separador />
          </Superficie>
          <Texto variante="secundario" color={colores.textoSecundario}>
            La cédula y el correo no se pueden cambiar aquí.
          </Texto>
        </View>
      </View>
      <FotoCedula perfil={perfil} />
    </PantallaPila>
  );
}

/** Un dato de solo lectura: etiqueta arriba (fuera) y valor debajo, como fila. */
function DatoPerfil({
  etiqueta,
  valor,
  separador = false,
}: {
  etiqueta: string;
  valor: string;
  separador?: boolean;
}) {
  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      <View testID="dato-perfil" style={estilos.dato}>
        <Texto variante="etiqueta" color={colores.textoFuerte}>
          {etiqueta}
        </Texto>
        <Texto variante="cuerpoFuerte">{valor}</Texto>
      </View>
    </View>
  );
}

/**
 * Foto de la cédula: documento SENSIBLE. La URL firmada solo vive en la caché en memoria de la
 * consulta; la imagen usa cachePolicy "memory" (no se guarda en disco) y no lleva clave de caché.
 * Ni la URL ni la foto se registran, ni salen en mensajes de error.
 */
function FotoCedula({ perfil }: { perfil: PerfilInquilino }) {
  const subirFoto = useSubirFotoCedulaInquilino();
  const subida = useSubidaFoto((foto) => subirFoto.mutateAsync(foto));
  const { refetch } = usePerfilInquilino();
  return (
    <View style={estilos.foto}>
      <SeccionFoto
        titulo="Foto de tu cédula"
        url={perfil.foto_cedula_url}
        cachePolicy="memory"
        icono="documento"
        descripcion="Foto de tu cédula"
        nota="Es un documento privado: solo se usa para tus contratos."
        subida={subida}
        onElegida={(foto) => void subida.elegir(foto)}
        alFallarUrl={() => void refetch({ cancelRefetch: false })}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  barra: { gap: espaciado.sm },
  soloLectura: { gap: espaciado.xs, marginTop: espaciado.xs },
  dato: {
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  separador: { height: 1, marginLeft: espaciado.md, backgroundColor: tintaAlfa(0.07) },
  foto: { marginTop: espaciado.lg },
});
