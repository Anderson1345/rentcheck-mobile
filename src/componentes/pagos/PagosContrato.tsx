// Contenido de la pestaña Pagos del inquilino para el contrato seleccionado: datos para pagar, estado
// de los períodos (con "Reportar pago") e historial de pagos reportados. Todo lo que se muestra
// (estado del período, motivo del rechazo) lo manda el servidor.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ContratoInquilinoResumen } from '../../api/inquilino';
import type { PagoRespuesta } from '../../api/pagos';
import {
  useContratoInquilino,
  useEstadoCuentaInquilino,
  useRefrescarSiNoEncontrado,
} from '../../consultas/inquilino';
import { useMisPagos } from '../../consultas/pagos';
import { mesDePeriodo } from '../../contratos/acciones';
import { diaDePeriodo, periodosReportables, textoMotivoRechazo } from '../../pagos/reglas';
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { ComprobantePago, type ComprobanteFresco } from './ComprobantePago';
import { FilaPeriodo } from '../contratos/LecturaContrato';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { FilaLista } from '../FilaLista';
import {
  ContratoNoEncontrado,
  ErrorConReintento,
  TarjetaRecaudo,
} from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

function FilaPago({
  pago,
  separador,
  obtenerFresco,
}: {
  pago: PagoRespuesta;
  separador: boolean;
  /** Vuelve a pedir MIS pagos (la URL firmada del comprobante caduca) y entrega este pago. */
  obtenerFresco: () => Promise<ComprobanteFresco | null | undefined>;
}) {
  // Si el pago traía comprobante, el bloque se queda aunque al refrescar ya no haya URL (dirá
  // "Comprobante no disponible" en vez de desaparecer).
  const [conComprobante] = useState(() => pago.comprobante_url !== null);
  const rechazo =
    pago.estado === 'RECHAZADO'
      ? textoMotivoRechazo(pago.motivo_rechazo, pago.mensaje_rechazo)
      : null;
  return (
    <FilaLista
      titulo={mesDePeriodo(pago.periodo)}
      separador={separador}
      valor={centavosAPesosTexto(pago.monto_centavos)}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Reportado el ${formatearFechaCorta(pago.fecha_reportada)}`}
          </Texto>
          <ChipEstado tipo="pago" estado={pago.estado} />
          {rechazo?.motivo ? <Texto variante="cuerpoFuerte">{rechazo.motivo}</Texto> : null}
          {rechazo?.mensaje ? <Texto variante="cuerpo">{rechazo.mensaje}</Texto> : null}
          {conComprobante ? (
            <ComprobantePago
              pagoId={pago.id}
              tipo={pago.comprobante_tipo}
              url={pago.comprobante_url}
              obtenerFresco={obtenerFresco}
            />
          ) : null}
        </View>
      }
    />
  );
}

export function PagosContrato({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  const id = contrato.id;
  const activo = contrato.estado === 'ACTIVO';
  const programado = contrato.estado === 'PROGRAMADO';
  // Un contrato PROGRAMADO no tiene períodos ni pagos: no se pide nada.
  const detalle = useContratoInquilino(id, activo);
  const cuenta = useEstadoCuentaInquilino(id, !programado);
  const pagos = useMisPagos(id, !programado);
  const noEncontrado = useRefrescarSiNoEncontrado(cuenta.error ?? pagos.error);

  // Un 404 manda sobre cualquier dato en caché: el contrato ya no es del inquilino.
  if (noEncontrado) {
    return (
      <ContratoNoEncontrado
        textoBoton="Ver mis contratos"
        onPress={() => router.push('/mis-contratos')}
      />
    );
  }

  if (programado) {
    return (
      <Superficie>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Cuando tu contrato empiece podrás reportar tus pagos aquí.
        </Texto>
      </Superficie>
    );
  }

  const reportables = new Set(
    periodosReportables(cuenta.data?.periodos ?? [], contrato.estado).map((p) => p.periodo),
  );

  return (
    <>
      {activo ? <TarjetaRecaudo datos={detalle.data?.datos_recaudo} /> : null}

      <View style={estilos.grupo}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Períodos
        </Texto>
        {cuenta.data === undefined ? (
          cuenta.isPending ? (
            <EsqueletoCarga filas={3} />
          ) : (
            <ErrorConReintento error={cuenta.error} onReintentar={() => void cuenta.refetch()} />
          )
        ) : cuenta.data.periodos.length === 0 ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Este contrato aún no tiene períodos
          </Texto>
        ) : (
          <Superficie relleno="ninguno">
            {cuenta.data.periodos.map((p, indice) => (
              <FilaPeriodo
                key={p.periodo}
                p={p}
                separador={indice > 0}
                accion={
                  reportables.has(p.periodo) ? (
                    <Boton
                      titulo="Reportar pago"
                      variante="secundario"
                      onPress={() =>
                        router.push({
                          pathname: '/reportar-pago',
                          params: { contratoId: id, periodo: diaDePeriodo(p.periodo) },
                        })
                      }
                    />
                  ) : null
                }
              />
            ))}
          </Superficie>
        )}
      </View>

      <View style={estilos.grupo}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Mis pagos
        </Texto>
        {pagos.data === undefined ? (
          pagos.isPending ? (
            <EsqueletoCarga filas={2} />
          ) : (
            <ErrorConReintento error={pagos.error} onReintentar={() => void pagos.refetch()} />
          )
        ) : pagos.data.length === 0 ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Aún no has reportado pagos.
          </Texto>
        ) : (
          <Superficie relleno="ninguno">
            {pagos.data.map((p, indice) => (
              <FilaPago
                key={p.id}
                pago={p}
                separador={indice > 0}
                obtenerFresco={async () => (await pagos.refetch()).data?.find((x) => x.id === p.id)}
              />
            ))}
          </Superficie>
        )}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  detalle: { gap: 4, flexShrink: 1 },
});
