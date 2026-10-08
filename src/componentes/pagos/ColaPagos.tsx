// Cola de validación del arrendador (rediseño R4-C): sus pagos por estado, del más reciente al más
// antiguo (el orden lo da el servidor). "En revisión" (PENDIENTE) es el segmento por defecto;
// REEMPLAZADO no se ofrece (es un comprobante que el inquilino ya sustituyó). Los tres segmentos se piden
// al abrir: cada uno muestra su conteo y cambiar de segmento no vuelve a cargar nada (a8).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FiltroPagos, PagoRespuesta } from '../../api/pagos';
import { usePagos } from '../../consultas/pagos';
import { mesDePeriodo } from '../../contratos/acciones';
import { inicialesDe } from '../../contratos/lectura';
import { comparacionDePago } from '../../pagos/reglas';
import { colores, espaciado, fuentes, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { ChipEstado } from '../ChipEstado';
import { ControlSegmentado } from '../ControlSegmentado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

type Segmento = Extract<FiltroPagos, 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>;

const SEGMENTOS: { valor: Segmento; etiqueta: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'En revisión' },
  { valor: 'APROBADO', etiqueta: 'Aprobados' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados' },
];

/** Vacío de cada segmento: qué pasa y qué hacer. */
const VACIO: Record<Segmento, { titulo: string; mensaje: string }> = {
  PENDIENTE: {
    titulo: 'No hay comprobantes por validar',
    mensaje:
      'Cuando un inquilino reporte un pago, aparecerá aquí para que lo apruebes o lo rechaces.',
  },
  APROBADO: {
    titulo: 'Aún no hay pagos aprobados',
    mensaje: 'Los pagos que apruebes quedan aquí.',
  },
  RECHAZADO: {
    titulo: 'No hay pagos rechazados',
    mensaje: 'Los pagos que rechaces quedan aquí, con su motivo.',
  },
};

/**
 * Un pago: iniciales del inquilino, "unidad · mes", el inquilino y la fecha reportada, y a la derecha el
 * monto, "esperado $X" solo si difiere del saldo del período (dato del servidor, solo en revisión) y el
 * estado. Toca → detalle.
 */
function FilaPagoArrendador({
  pago,
  separador,
  conEsperado,
}: {
  pago: PagoRespuesta;
  separador: boolean;
  conEsperado: boolean;
}) {
  const router = useRouter();
  const comparacion = conEsperado ? comparacionDePago(pago) : null;
  const esperado =
    comparacion && comparacion.saldo !== pago.monto_centavos ? comparacion.saldo : null;
  const { inquilino, unidad } = pago.contrato;
  const fecha = `Reportado el ${formatearFechaCorta(pago.fecha_reportada)}`;
  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={`${unidad.nombre}, ${mesDePeriodo(pago.periodo)}. ${fecha}.`}
        onPress={() => router.push({ pathname: '/pago/[id]', params: { id: pago.id } })}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <View style={estilos.avatar}>
          <Texto variante="etiqueta" color={colores.lima} style={estilos.iniciales}>
            {inicialesDe(inquilino.nombre)}
          </Texto>
        </View>
        <View style={estilos.textos}>
          <Texto variante="filaTitulo" numberOfLines={1}>
            {`${unidad.nombre} · ${mesDePeriodo(pago.periodo)}`}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {inquilino.nombre}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {fecha}
          </Texto>
        </View>
        <View style={estilos.derecha}>
          <Texto variante="cuerpoFuerte" cifras>
            {centavosAPesosTexto(pago.monto_centavos)}
          </Texto>
          {esperado !== null ? (
            <Texto variante="secundario" color={colores.textoSecundario} cifras>
              {`esperado ${centavosAPesosTexto(esperado)}`}
            </Texto>
          ) : null}
          <ChipEstado tipo="pago" estado={pago.estado} />
        </View>
      </Pressable>
    </View>
  );
}

export function ColaPagos() {
  const [estado, setEstado] = useState<Segmento>('PENDIENTE');
  const consultas: Record<Segmento, ReturnType<typeof usePagos>> = {
    PENDIENTE: usePagos('PENDIENTE'),
    APROBADO: usePagos('APROBADO'),
    RECHAZADO: usePagos('RECHAZADO'),
  };
  const consulta = consultas[estado];

  return (
    <View style={estilos.grupo}>
      <ControlSegmentado
        opciones={SEGMENTOS.map((s) => {
          const datos = consultas[s.valor].data;
          return {
            valor: s.valor,
            etiqueta: s.etiqueta,
            ...(datos !== undefined ? { contador: datos.length } : {}),
          };
        })}
        valor={estado}
        onCambio={setEstado}
      />
      {consulta.data === undefined ? (
        consulta.isPending ? (
          <EsqueletoCarga filas={3} />
        ) : (
          <ErrorConReintento error={consulta.error} onReintentar={() => void consulta.refetch()} />
        )
      ) : consulta.data.length === 0 ? (
        <EstadoMensaje titulo={VACIO[estado].titulo} mensaje={VACIO[estado].mensaje} />
      ) : (
        <Superficie relleno="ninguno">
          {consulta.data.map((p, indice) => (
            <FilaPagoArrendador
              key={p.id}
              pago={p}
              separador={indice > 0}
              conEsperado={estado === 'PENDIENTE'}
            />
          ))}
        </Superficie>
      )}
    </View>
  );
}

const LADO_AVATAR = 42;

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
  avatar: {
    width: LADO_AVATAR,
    height: LADO_AVATAR,
    borderRadius: 14,
    backgroundColor: colores.tintaCapa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: { fontFamily: fuentes.extranegrita },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  derecha: { alignItems: 'flex-end', gap: 4, maxWidth: '45%' },
  separador: { height: 1, marginLeft: 70, backgroundColor: tintaAlfa(0.07) },
});
