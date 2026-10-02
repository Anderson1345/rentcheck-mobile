import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { ContratoInquilinoResumen } from '@/api/inquilino';
import type { UrgenciaSolicitud } from '@/api/mantenimiento';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { SelectorAdjunto } from '@/componentes/mantenimiento/SelectorAdjunto';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { descripcionContrato } from '@/inquilino/seleccion';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import {
  MAXIMO_DESCRIPCION,
  OPCIONES_URGENCIA,
  puedeCrearSolicitud,
  textoSinCrear,
  URGENCIA_POR_DEFECTO,
  validarDescripcion,
} from '@/mantenimiento/reglas';
import { useCrearSolicitud } from '@/mantenimiento/useCrearSolicitud';
import { colores, espaciado, radios, tintaAlfa, tipografia } from '@/tema';
import type { AdjuntoElegido } from '@/utilidades/adjuntoSolicitud';

// Pantalla de pila propia (necesita todo el ancho y el teclado; dos grupos de rutas no pueden
// compartir URL). La unidad sale del contrato seleccionado (`unidad.id`): nunca se le pide a la
// persona. Sin confirmación previa: no es una acción de dinero ni legal.
export default function NuevaSolicitud() {
  const router = useRouter();
  const { lista, contrato } = useContratoSeleccionado();

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/solicitudes');
  }

  let cuerpo;
  if (lista.data === undefined) {
    cuerpo = lista.isPending ? (
      <EsqueletoCarga filas={3} />
    ) : (
      <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
    );
  } else if (contrato === null) {
    cuerpo = (
      <EstadoMensaje
        titulo="Aún no tienes contratos"
        mensaje="Agrega tu contrato con el código que te dio tu arrendador para pedir arreglos."
      >
        <Boton titulo="Volver a Solicitudes" variante="acento" ancho="completo" onPress={volver} />
      </EstadoMensaje>
    );
  } else if (!puedeCrearSolicitud(contrato.estado)) {
    // El servidor respondería 409 CONTRATO_NO_ACTIVO: ni se abre el formulario.
    cuerpo = (
      <EstadoMensaje
        titulo="No puedes crear solicitudes"
        mensaje={textoSinCrear(contrato.estado) ?? undefined}
      >
        <Boton titulo="Volver a Solicitudes" variante="acento" ancho="completo" onPress={volver} />
      </EstadoMensaje>
    );
  } else {
    cuerpo = <Formulario contrato={contrato} onListo={volver} />;
  }

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        Nueva solicitud
      </Texto>
      {cuerpo}
    </PantallaPila>
  );
}

function Formulario({
  contrato,
  onListo,
}: {
  contrato: ContratoInquilinoResumen;
  onListo: () => void;
}) {
  const envio = useCrearSolicitud(contrato.id);
  const [descripcion, setDescripcion] = useState('');
  const [urgencia, setUrgencia] = useState<UrgenciaSolicitud>(URGENCIA_POR_DEFECTO);
  const [adjunto, setAdjunto] = useState<AdjuntoElegido | null>(null);

  const validacion = validarDescripcion(descripcion);
  const enviando = envio.fase === 'enviando';
  const ayudaUrgencia = OPCIONES_URGENCIA.find((o) => o.valor === urgencia)?.ayuda;
  // Solo se avisa del tope: vacío no es un error mientras la persona aún escribe.
  const errorDescripcion =
    'error' in validacion && descripcion.trim() !== '' ? validacion.error : undefined;

  function enviar() {
    if ('error' in validacion) return;
    void envio.enviar({
      unidadId: contrato.unidad.id,
      descripcion: validacion.valor,
      urgencia,
      adjunto,
    });
  }

  if (envio.fase === 'exito') {
    return (
      <View style={estilos.grupo}>
        <Aviso tono="exito" mensaje="Solicitud enviada. Tu arrendador la verá en su lista." />
        <Boton titulo="Volver a Solicitudes" ancho="completo" onPress={onListo} />
      </View>
    );
  }

  return (
    <View style={estilos.grupo}>
      <Texto variante="cuerpoFuerte">{descripcionContrato(contrato)}</Texto>

      <View style={estilos.campo}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          ¿Qué necesita arreglo?
        </Texto>
        <TextInput
          accessibilityLabel="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          editable={!enviando}
          multiline
          textAlignVertical="top"
          placeholder="Cuéntale a tu arrendador qué pasa y dónde."
          placeholderTextColor={colores.textoSecundario}
          cursorColor={colores.tintaCapa}
          selectionColor={colores.lima}
          style={[tipografia.cuerpo, estilos.entrada, errorDescripcion ? estilos.conError : null]}
        />
        <Texto
          variante="secundario"
          color={errorDescripcion ? colores.peligroTexto : colores.textoSecundario}
        >
          {errorDescripcion ?? `${descripcion.trim().length} / ${MAXIMO_DESCRIPCION}`}
        </Texto>
      </View>

      <View style={estilos.campo}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Urgencia
        </Texto>
        <ControlSegmentado
          opciones={OPCIONES_URGENCIA.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
          valor={urgencia}
          onCambio={setUrgencia}
        />
        {ayudaUrgencia ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            {ayudaUrgencia}
          </Texto>
        ) : null}
      </View>

      <View style={estilos.campo}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Adjunto (opcional)
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          Una foto o un video MP4 de hasta 20 MB. Los videos cortos suben más rápido.
        </Texto>
        <SelectorAdjunto valor={adjunto} onCambio={setAdjunto} deshabilitado={enviando} />
      </View>

      {envio.cancelado ? <Aviso tono="informacion" mensaje="Envío cancelado." /> : null}
      {envio.error ? <Aviso mensaje={envio.error} /> : null}

      {enviando && envio.progreso !== null ? <Progreso fraccion={envio.progreso} /> : null}
      <Boton
        titulo="Enviar solicitud"
        tituloCargando="Enviando…"
        cargando={enviando}
        deshabilitado={'error' in validacion}
        variante="acento"
        ancho="completo"
        onPress={enviar}
      />
      {enviando ? (
        <Boton
          titulo="Cancelar envío"
          variante="secundario"
          ancho="completo"
          onPress={envio.cancelar}
        />
      ) : null}
    </View>
  );
}

function Progreso({ fraccion }: { fraccion: number }) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
  return (
    <View style={estilos.campo}>
      <Texto variante="secundario" color={colores.textoSecundario}>
        {`Subiendo… ${porcentaje} %`}
      </Texto>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
        style={estilos.pista}
      >
        <View style={[estilos.barra, { width: `${porcentaje}%` }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  campo: { gap: espaciado.xs },
  entrada: {
    minHeight: 120,
    padding: espaciado.md,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.05),
    color: colores.texto,
  },
  conError: { boxShadow: `0 0 0 2px ${colores.peligroTexto}` },
  pista: { height: 8, borderRadius: 4, backgroundColor: tintaAlfa(0.1), overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, backgroundColor: colores.tinta },
});
