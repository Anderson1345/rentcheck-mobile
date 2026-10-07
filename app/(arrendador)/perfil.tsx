import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef, useState } from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { StyleSheet, type TextInput, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import { detalleTecnico, mensajeDeError } from '@/api/errores';
import type { PerfilArrendador } from '@/api/perfil';
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
import { useActualizarPerfil, usePerfil, useSubirFotoCedula } from '@/consultas/perfil';
import { camposCambiadosPerfil, esquemaPerfil, type ValoresPerfil } from '@/perfil/esquemas';
import { colores, espaciado } from '@/tema';

// Mi perfil del arrendador (rediseño R4-C, como el del inquilino en R4-B): el correo es una fila de solo
// lectura; nombre, teléfono y cédula se editan con sus validaciones de siempre; "Guardar cambios" (con
// sus avisos) va en la barra fija; la foto de la cédula no cambia.
export default function MiPerfil() {
  const { data: perfil, isPending, isError, error, refetch } = usePerfil();

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

function FormularioPerfil({ perfil }: { perfil: PerfilArrendador }) {
  const actualizar = useActualizarPerfil();
  const [guardado, setGuardado] = useState(false);
  const [sinCambios, setSinCambios] = useState(false);
  const [errorServidor, setErrorServidor] = useState<{
    mensaje: string;
    detalle: string | null;
  } | null>(null);
  const enviando = useRef(false);
  const telefono = useRef<TextInput>(null);
  const cedula = useRef<TextInput>(null);
  const original: ValoresPerfil = {
    nombre: perfil.nombre,
    telefono: perfil.telefono,
    cedula: perfil.cedula ?? '',
  };
  const esquema = useMemo(() => esquemaPerfil(original.cedula), [original.cedula]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoresPerfil>({
    resolver: zodResolver(esquema) as unknown as Resolver<ValoresPerfil>,
    defaultValues: original,
  });

  const alEnviar = handleSubmit(async (valores) => {
    setErrorServidor(null);
    setGuardado(false);
    setSinCambios(false);
    const cambios = camposCambiadosPerfil(original, valores);
    if (Object.keys(cambios).length === 0) {
      setSinCambios(true);
      return;
    }
    try {
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
        <View style={estilos.soloLectura}>
          <Superficie relleno="ninguno">
            <View testID="dato-perfil" style={estilos.dato}>
              <Texto variante="etiqueta" color={colores.textoFuerte}>
                Correo
              </Texto>
              <Texto variante="cuerpoFuerte">{perfil.correo}</Texto>
            </View>
          </Superficie>
          <Texto variante="secundario" color={colores.textoSecundario}>
            No se puede cambiar.
          </Texto>
        </View>

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
              returnKeyType="next"
              onSubmitEditing={() => cedula.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="cedula"
          render={({ field }) => (
            <CampoTexto
              etiqueta="Cédula o NIT"
              valor={field.value}
              onCambio={field.onChange}
              onBlur={field.onBlur}
              error={errors.cedula?.message}
              ayuda="La cédula es obligatoria para confirmar un contrato."
              inputRef={cedula}
              keyboardType="number-pad"
              maxLength={16}
              returnKeyType="done"
              onSubmitEditing={() => void enviar()}
            />
          )}
        />
      </View>
      <FotoCedula perfil={perfil} />
    </PantallaPila>
  );
}

/**
 * Foto de la cédula/NIT: documento SENSIBLE. La URL firmada solo vive en la caché en memoria de
 * la consulta; la imagen usa cachePolicy "memory" (no se guarda en disco) y no lleva clave de
 * caché. Ni la URL ni la foto se registran, ni salen en mensajes de error.
 */
function FotoCedula({ perfil }: { perfil: PerfilArrendador }) {
  const subirFoto = useSubirFotoCedula();
  const subida = useSubidaFoto((foto) => subirFoto.mutateAsync(foto));
  const { refetch } = usePerfil();
  return (
    <View style={estilos.foto}>
      <SeccionFoto
        titulo="Foto de la cédula o NIT"
        url={perfil.foto_cedula_nit_url}
        cachePolicy="memory"
        icono="documento"
        descripcion="Foto de tu cédula o NIT"
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
  soloLectura: { gap: espaciado.xs },
  dato: {
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  foto: { marginTop: espaciado.lg },
});
