// Cola de validación del arrendador: sus pagos por estado, del más reciente al más antiguo (el orden
// lo da el servidor). "En revisión" (PENDIENTE) es la pestaña por defecto y muestra el contador de
// pendientes; REEMPLAZADO no se ofrece (es un comprobante que el inquilino ya sustituyó).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FiltroPagos, PagoRespuesta } from '../../api/pagos';
import { usePagos } from '../../consultas/pagos';
import { mesDePeriodo } from '../../contratos/acciones';
import { comparacionDePago } from '../../pagos/reglas';
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { ChipEstado } from '../ChipEstado';
import { ControlSegmentado } from '../ControlSegmentado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { FilaLista } from '../FilaLista';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

const SEGMENTOS: {
  valor: Extract<FiltroPagos, 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>;
  etiqueta: string;
}[] = [
  { valor: 'PENDIENTE', etiqueta: 'En revisión' },
  { valor: 'APROBADO', etiqueta: 'Aprobados' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados' },
];

const VACIO: Record<string, string> = {
  PENDIENTE: 'No hay pagos en revisión',
  APROBADO: 'No hay pagos aprobados',
  RECHAZADO: 'No hay pagos rechazados',
};

function FilaPagoArrendador({
  pago,
  separador,
  conSaldo,
}: {
  pago: PagoRespuesta;
  separador: boolean;
  conSaldo: boolean;
}) {
  const router = useRouter();
  const comparacion = conSaldo ? comparacionDePago(pago) : null;
  return (
    <FilaLista
      titulo={pago.contrato.inquilino.nombre}
      separador={separador}
      valor={centavosAPesosTexto(pago.monto_centavos)}
      conChevron
      onPress={() => router.push({ pathname: '/pago/[id]', params: { id: pago.id } })}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${pago.contrato.unidad.nombre} · ${pago.contrato.unidad.inmueble.direccion}`}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {mesDePeriodo(pago.periodo)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Reportado el ${formatearFechaCorta(pago.fecha_reportada)}`}
          </Texto>
          {comparacion ? (
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Saldo esperado: ${centavosAPesosTexto(comparacion.saldo)}`}
            </Texto>
          ) : null}
          <ChipEstado tipo="pago" estado={pago.estado} />
        </View>
      }
    />
  );
}

export function ColaPagos() {
  const [estado, setEstado] = useState<(typeof SEGMENTOS)[number]['valor']>('PENDIENTE');
  // El contador de pendientes se ve siempre: se pide aunque haya otro segmento elegido.
  const pendientes = usePagos('PENDIENTE');
  const elegidos = usePagos(estado);
  const consulta = estado === 'PENDIENTE' ? pendientes : elegidos;

  return (
    <View style={estilos.grupo}>
      <ControlSegmentado
        opciones={SEGMENTOS.map((s) => ({
          valor: s.valor,
          etiqueta: s.etiqueta,
          ...(s.valor === 'PENDIENTE' && pendientes.data !== undefined
            ? { contador: pendientes.data.length }
            : {}),
        }))}
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
        <EstadoMensaje titulo={VACIO[estado]} />
      ) : (
        <Superficie relleno="ninguno">
          {consulta.data.map((p, indice) => (
            <FilaPagoArrendador
              key={p.id}
              pago={p}
              separador={indice > 0}
              conSaldo={estado === 'PENDIENTE'}
            />
          ))}
        </Superficie>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  detalle: { gap: 4, flexShrink: 1 },
});
