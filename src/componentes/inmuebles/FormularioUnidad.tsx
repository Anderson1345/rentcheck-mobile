import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useRef, useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Switch, type TextInput, View } from 'react-native';

import { detalleTecnico, mensajeDeErrorInmueble } from '../../api/errores';
import type {
  DatosActualizarUnidad,
  DatosCrearUnidad,
  Inmueble,
  UnidadInmueble,
} from '../../api/inmuebles';
import {
  armarCuerpoCrearUnidad,
  camposCambiadosUnidad,
  esquemaUnidad,
  tipoSugeridoUso,
  type ValoresUnidad,
  valoresDeUnidad,
  VALORES_UNIDAD_VACIOS,
} from '../../unidades/esquemas';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { PantallaPila } from '../PantallaPila';
import { CampoDinero } from '../CampoDinero';
import { CampoTexto } from '../CampoTexto';
import { ControlSegmentado } from '../ControlSegmentado';
import { DetalleTecnico } from '../DetalleTecnico';
import { Texto } from '../Texto';
import { SelectorTipoUnidad } from './SelectorTipoUnidad';

const OPCIONES_USO = [
  { valor: 'RESIDENCIAL', etiqueta: 'Residencial' },
  { valor: 'COMERCIAL', etiqueta: 'Comercial' },
] as const;

type Props = {
  inmueble: Inmueble;
  onEditarInmueble: () => void;
  /** Antes de los campos (avisos de la pantalla). */
  encabezado?: ReactNode;
  /** Después de los campos (foto, duplicar, eliminar). */
  pie?: ReactNode;
} & (
  | {
      modo: 'crear';
      onCrear: (cuerpo: DatosCrearUnidad) => Promise<void>;
      /** Duplicar (R2-A): los campos de otra unidad, con el nombre vacío. */
      valoresIniciales?: ValoresUnidad;
      /** Enfoca el nombre al abrir (al duplicar, es lo único que falta). */
      enfocarNombre?: boolean;
    }
  | {
      modo: 'editar';
      unidad: UnidadInmueble;
      /** Recibe SOLO los campos que cambiaron. */
      onGuardar: (cambios: DatosActualizarUnidad) => Promise<void>;
    }
);

/**
 * Formulario de unidad (crear y editar), con su propia pantalla: el formulario es largo, así que el botón
 * principal queda fijo abajo (`accionFija`). Residencial pide área, habitaciones, baños, ocupantes y
 * mascotas; Comercial los oculta (y no se envían). Dinero en centavos con CampoDinero.
 */
export function FormularioUnidad(props: Props) {
  const crear = props.modo === 'crear';
  const unidad = props.modo === 'editar' ? props.unidad : null;
  const [errorServidor, setErrorServidor] = useState<{
    mensaje: string;
    detalle: string | null;
  } | null>(null);
  const [sinCambios, setSinCambios] = useState(false);
  const enviando = useRef(false);
  const area = useRef<TextInput>(null);
  const habitaciones = useRef<TextInput>(null);
  const banos = useRef<TextInput>(null);
  const ocupantes = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ValoresUnidad>({
    resolver: zodResolver(esquemaUnidad) as unknown as Resolver<ValoresUnidad>,
    defaultValues: unidad
      ? valoresDeUnidad(unidad)
      : props.modo === 'crear' && props.valoresIniciales
        ? props.valoresIniciales
        : VALORES_UNIDAD_VACIOS,
  });
  const uso = useWatch({ control, name: 'uso' });
  const residencial = uso === 'RESIDENCIAL';
  // Sin estrato no se puede tener una unidad residencial nueva (regla 6): se avisa antes de enviar.
  const avisarEstrato =
    residencial &&
    props.inmueble.estrato === null &&
    (crear || unidad?.uso_permitido !== 'RESIDENCIAL');

  const alEnviar = handleSubmit(async (valores) => {
    setErrorServidor(null);
    setSinCambios(false);
    try {
      if (props.modo === 'crear') {
        await props.onCrear(armarCuerpoCrearUnidad(valores));
        return;
      }
      const cambios = camposCambiadosUnidad(props.unidad, valores);
      if (Object.keys(cambios).length === 0) {
        setSinCambios(true);
        return;
      }
      await props.onGuardar(cambios);
    } catch (error) {
      setErrorServidor({ mensaje: mensajeDeErrorInmueble(error), detalle: detalleTecnico(error) });
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

  const boton = (
    <Boton
      titulo={crear ? 'Crear unidad' : 'Guardar cambios'}
      tituloCargando={crear ? 'Creando unidad…' : 'Guardando…'}
      cargando={isSubmitting}
      ancho="completo"
      onPress={() => void enviar()}
    />
  );

  return (
    <PantallaPila accionFija={boton}>
      {props.encabezado}
      <View style={estilos.formulario}>
        {errorServidor ? (
          <View style={estilos.grupo}>
            <Aviso mensaje={errorServidor.mensaje} />
            <DetalleTecnico detalle={errorServidor.detalle} />
          </View>
        ) : null}
        {sinCambios ? <Aviso mensaje="No hiciste ningún cambio." tono="informacion" /> : null}

        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <CampoTexto
              etiqueta="Nombre de la unidad"
              valor={field.value}
              onCambio={field.onChange}
              onBlur={field.onBlur}
              error={errors.nombre?.message}
              keyboardType="default"
              autoCapitalize="words"
              returnKeyType="done"
              autoFocus={props.modo === 'crear' && props.enfocarNombre === true}
            />
          )}
        />

        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <SelectorTipoUnidad
              valor={field.value}
              onCambio={(tipo) => {
                field.onChange(tipo);
                const sugerido = tipoSugeridoUso(tipo);
                if (sugerido) setValue('uso', sugerido);
              }}
            />
          )}
        />

        <View style={estilos.grupo}>
          <Texto variante="etiqueta" color={colores.textoFuerte}>
            Uso
          </Texto>
          <Controller
            control={control}
            name="uso"
            render={({ field }) => (
              <ControlSegmentado
                opciones={OPCIONES_USO}
                valor={field.value}
                onCambio={field.onChange}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="canonCentavos"
          render={({ field }) => (
            <CampoDinero
              etiqueta="Canon base"
              valorCentavos={field.value}
              onCambio={field.onChange}
              error={errors.canonCentavos?.message}
            />
          )}
        />

        {avisarEstrato ? (
          <View style={estilos.grupo}>
            <Aviso
              tono="advertencia"
              mensaje="Este inmueble no tiene estrato; edítalo para agregar una unidad residencial."
            />
            <Boton
              titulo="Editar inmueble"
              variante="secundario"
              ancho="completo"
              onPress={props.onEditarInmueble}
            />
          </View>
        ) : null}

        {residencial ? (
          <>
            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <CampoTexto
                  etiqueta="Área (m²)"
                  valor={field.value}
                  onCambio={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.area?.message}
                  inputRef={area}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => habitaciones.current?.focus()}
                />
              )}
            />
            <Controller
              control={control}
              name="habitaciones"
              render={({ field }) => (
                <CampoTexto
                  etiqueta="Habitaciones"
                  valor={field.value}
                  onCambio={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.habitaciones?.message}
                  inputRef={habitaciones}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => banos.current?.focus()}
                />
              )}
            />
            <Controller
              control={control}
              name="banos"
              render={({ field }) => (
                <CampoTexto
                  etiqueta="Baños"
                  valor={field.value}
                  onCambio={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.banos?.message}
                  inputRef={banos}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => ocupantes.current?.focus()}
                />
              )}
            />
            <Controller
              control={control}
              name="ocupantes"
              render={({ field }) => (
                <CampoTexto
                  etiqueta="Ocupantes máximos"
                  valor={field.value}
                  onCambio={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.ocupantes?.message}
                  inputRef={ocupantes}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              )}
            />
            <Controller
              control={control}
              name="mascotas"
              render={({ field }) => (
                <View style={estilos.interruptor}>
                  <Texto variante="cuerpoFuerte" style={estilos.textoInterruptor}>
                    Acepta mascotas
                  </Texto>
                  <Switch
                    accessibilityLabel="Acepta mascotas"
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{ true: colores.tinta }}
                  />
                </View>
              )}
            />
          </>
        ) : null}
      </View>
      {props.pie}
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: espaciado.md },
  grupo: { gap: espaciado.xs },
  interruptor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textoInterruptor: { flex: 1 },
});
