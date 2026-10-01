import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, type TextInput, View } from 'react-native';

import type { ArchivoFoto, DatosActualizarInmueble, UsoPermitido } from '../../api/inmuebles';
import { mensajeDeErrorInmueble } from '../../api/errores';
import {
  camposCambiados,
  type DatosFormularioCrear,
  type DatosFormularioEditar,
  esquemaCrearInmueble,
  esquemaEditarInmueble,
} from '../../inmuebles/esquemas';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoTexto } from '../CampoTexto';
import { ControlSegmentado } from '../ControlSegmentado';
import { Texto } from '../Texto';
import { OpcionesFoto } from './OpcionesFoto';
import { PortadaInmueble } from './PortadaInmueble';
import { SelectorEstrato } from './SelectorEstrato';

const OPCIONES_USO = [
  { valor: 'RESIDENCIAL', etiqueta: 'Residencial' },
  { valor: 'COMERCIAL', etiqueta: 'Comercial' },
] as const satisfies readonly { valor: UsoPermitido; etiqueta: string }[];

type Props =
  | {
      modo: 'crear';
      /** Debe lanzar si falla: el formulario muestra el mensaje por código. */
      onCrear: (datos: DatosFormularioCrear, foto: ArchivoFoto | null) => Promise<void>;
    }
  | {
      modo: 'editar';
      valoresIniciales: DatosFormularioEditar;
      /** Recibe SOLO los campos que cambiaron. Debe lanzar si falla. */
      onGuardar: (cambios: DatosActualizarInmueble) => Promise<void>;
    };

/** En editar el uso de la unidad principal no existe: este valor del formulario no se usa ni se envía. */
type Valores = DatosFormularioEditar & { uso_unidad_principal: UsoPermitido };

/**
 * Formulario de crear y de editar inmueble: dirección, ciudad y matrícula (obligatorias,
 * recortadas), estrato 1 a 6 y, al crear, el uso de la unidad principal y la foto de portada.
 */
export function FormularioInmueble(props: Props) {
  const crear = props.modo === 'crear';
  const valoresIniciales = props.modo === 'editar' ? props.valoresIniciales : null;
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [avisoSinCambios, setAvisoSinCambios] = useState(false);
  const [foto, setFoto] = useState<ArchivoFoto | null>(null);
  const ciudad = useRef<TextInput>(null);
  const matricula = useRef<TextInput>(null);
  // handleSubmit no impide un segundo envío mientras el primero espera al servidor.
  const enviando = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({
    // En editar el esquema no tiene el uso de la unidad principal: el resto de campos es idéntico.
    resolver: zodResolver(
      crear ? esquemaCrearInmueble : esquemaEditarInmueble,
    ) as unknown as Resolver<Valores>,
    defaultValues: {
      direccion: valoresIniciales?.direccion ?? '',
      ciudad: valoresIniciales?.ciudad ?? '',
      matricula_inmobiliaria: valoresIniciales?.matricula_inmobiliaria ?? '',
      estrato: valoresIniciales?.estrato ?? null,
      uso_unidad_principal: 'RESIDENCIAL',
    },
  });
  const uso = useWatch({ control, name: 'uso_unidad_principal' });
  const verEstrato = !crear || uso === 'RESIDENCIAL';

  const alEnviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    setAvisoSinCambios(false);
    try {
      if (props.modo === 'crear') {
        await props.onCrear(datos, foto);
        return;
      }
      const cambios = camposCambiados(props.valoresIniciales, datos);
      if (Object.keys(cambios).length === 0) {
        setAvisoSinCambios(true);
        return;
      }
      await props.onGuardar(cambios);
    } catch (error) {
      setErrorServidor(mensajeDeErrorInmueble(error));
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

  return (
    <View style={estilos.formulario}>
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}
      {avisoSinCambios ? <Aviso mensaje="No hiciste ningún cambio." tono="informacion" /> : null}

      <Controller
        control={control}
        name="direccion"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Dirección"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.direccion?.message}
            keyboardType="default"
            autoCapitalize="words"
            autoComplete="street-address"
            returnKeyType="next"
            onSubmitEditing={() => ciudad.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="ciudad"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Ciudad"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.ciudad?.message}
            inputRef={ciudad}
            keyboardType="default"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => matricula.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="matricula_inmobiliaria"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Matrícula inmobiliaria"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.matricula_inmobiliaria?.message}
            inputRef={matricula}
            keyboardType="default"
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={() => void enviar()}
          />
        )}
      />

      {crear ? (
        <View style={estilos.grupo}>
          <Texto variante="etiqueta" color={colores.textoFuerte}>
            Uso de la unidad principal
          </Texto>
          <Controller
            control={control}
            name="uso_unidad_principal"
            render={({ field }) => (
              <ControlSegmentado
                opciones={OPCIONES_USO}
                valor={field.value}
                onCambio={field.onChange}
              />
            )}
          />
        </View>
      ) : null}

      {verEstrato ? (
        <Controller
          control={control}
          name="estrato"
          render={({ field }) => (
            <View style={estilos.grupo}>
              <SelectorEstrato
                valor={field.value}
                onCambio={field.onChange}
                error={errors.estrato?.message}
              />
              {!crear && field.value !== null ? (
                <Boton
                  titulo="Quitar estrato"
                  variante="secundario"
                  onPress={() => field.onChange(null)}
                />
              ) : null}
            </View>
          )}
        />
      ) : null}

      {crear ? (
        <View style={estilos.grupo}>
          <Texto variante="etiqueta" color={colores.textoFuerte}>
            Foto de portada (opcional)
          </Texto>
          {foto ? (
            <>
              <PortadaInmueble
                url={foto.uri}
                variante="grande"
                descripcion="Vista previa de la foto de portada"
              />
              <Boton
                titulo="Quitar foto"
                variante="secundario"
                ancho="completo"
                onPress={() => setFoto(null)}
              />
            </>
          ) : null}
          <OpcionesFoto onElegida={setFoto} deshabilitado={isSubmitting} />
        </View>
      ) : null}

      <Boton
        titulo={crear ? 'Crear inmueble' : 'Guardar cambios'}
        tituloCargando={crear ? 'Creando inmueble…' : 'Guardando…'}
        cargando={isSubmitting}
        ancho="completo"
        onPress={() => void enviar()}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: espaciado.md },
  grupo: { gap: espaciado.xs },
});
