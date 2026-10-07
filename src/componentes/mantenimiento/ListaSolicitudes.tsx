// Lista de solicitudes de mantenimiento del contrato seleccionado: "Abiertas" (pendientes y en proceso,
// por defecto) y "Resueltas", cada una con su contador. El segmento es solo de la app: el servidor
// devuelve todas, de la más reciente a la más antigua. Crear solo se ofrece con contrato ACTIVO; con
// otro estado se explica por qué, pero la lista sigue a la vista. R4-A: filas en un contenedor con la
// miniatura (si hay foto), la descripción, "Urgencia X · hace N días" y el estado.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ContratoInquilinoResumen } from '../../api/inquilino';
import type { SolicitudInquilino } from '../../api/mantenimiento';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import { useMisSolicitudes } from '../../consultas/mantenimiento';
import {
  contarSegmentos,
  filtrarSegmento,
  puedeCrearSolicitud,
  type SegmentoSolicitudes,
  textoSinCrear,
} from '../../mantenimiento/reglas';
import { textoSolicitud } from '../../inquilino/miPanel';
import { colores, espaciado, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { ControlSegmentado } from '../ControlSegmentado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { ESTADOS_MANTENIMIENTO } from '../estados';
import { EstadoMensaje } from '../EstadoMensaje';
import { MiniaturaSolicitud } from '../inquilino/BloquesMiPanel';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

const VACIO: Record<SegmentoSolicitudes, { titulo: string; mensaje: string }> = {
  abiertas: {
    titulo: 'No tienes solicitudes abiertas',
    mensaje: 'Cuando algo de tu vivienda necesite arreglo, pídelo aquí y sigue cómo avanza.',
  },
  resueltas: {
    titulo: 'No tienes solicitudes resueltas',
    mensaje: 'Aquí verás las que tu arrendador marque como resueltas.',
  },
};

function FilaSolicitud({
  solicitud,
  separador,
}: {
  solicitud: SolicitudInquilino;
  separador: boolean;
}) {
  const router = useRouter();
  const detalle = textoSolicitud(solicitud.urgencia, solicitud.creado_en);
  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={`${detalle}. ${ESTADOS_MANTENIMIENTO[solicitud.estado].etiqueta}`}
        onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: solicitud.id } })}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <MiniaturaSolicitud solicitud={solicitud} />
        <View style={estilos.textos}>
          <Texto variante="filaTitulo" numberOfLines={2}>
            {solicitud.descripcion}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {detalle}
          </Texto>
        </View>
        <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
      </Pressable>
    </View>
  );
}

export function ListaSolicitudes({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  const consulta = useMisSolicitudes(contrato.id);
  useRefrescarAlEnfocar(consulta);
  const [segmento, setSegmento] = useState<SegmentoSolicitudes>('abiertas');
  const motivoSinCrear = textoSinCrear(contrato.estado);

  return (
    <View style={estilos.grupo}>
      {puedeCrearSolicitud(contrato.estado) ? (
        <Boton
          titulo="Nueva solicitud"
          icono="anadir"
          variante="acento"
          ancho="completo"
          onPress={() => router.push('/nueva-solicitud')}
        />
      ) : motivoSinCrear ? (
        <Aviso tono="informacion" mensaje={motivoSinCrear} />
      ) : null}

      {consulta.data === undefined ? (
        consulta.isPending ? (
          <EsqueletoCarga filas={3} />
        ) : (
          <ErrorConReintento error={consulta.error} onReintentar={() => void consulta.refetch()} />
        )
      ) : (
        <ListaConSegmentos
          solicitudes={consulta.data}
          segmento={segmento}
          onSegmento={setSegmento}
        />
      )}
    </View>
  );
}

function ListaConSegmentos({
  solicitudes,
  segmento,
  onSegmento,
}: {
  solicitudes: SolicitudInquilino[];
  segmento: SegmentoSolicitudes;
  onSegmento: (segmento: SegmentoSolicitudes) => void;
}) {
  const cuenta = contarSegmentos(solicitudes);
  const visibles = filtrarSegmento(solicitudes, segmento);
  return (
    <>
      <ControlSegmentado
        opciones={[
          { valor: 'abiertas', etiqueta: 'Abiertas', contador: cuenta.abiertas },
          { valor: 'resueltas', etiqueta: 'Resueltas', contador: cuenta.resueltas },
        ]}
        valor={segmento}
        onCambio={onSegmento}
      />
      {visibles.length === 0 ? (
        <EstadoMensaje titulo={VACIO[segmento].titulo} mensaje={VACIO[segmento].mensaje} />
      ) : (
        <Superficie relleno="ninguno">
          {visibles.map((s, indice) => (
            <FilaSolicitud key={s.id} solicitud={s} separador={indice > 0} />
          ))}
        </Superficie>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },
  presionada: { backgroundColor: tintaAlfa(0.03) },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  separador: { height: 1, marginLeft: 72, backgroundColor: tintaAlfa(0.07) },
});
