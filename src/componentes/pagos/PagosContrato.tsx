// Contenido de la pestaña Pagos del inquilino para el contrato seleccionado (rediseño R4-A): el período
// protagonista con su acción (la misma tarjeta de Mi panel), el recaudo en una línea con "Copiar" y el
// historial de pagos reportados, con los comprobantes reemplazados plegados por período. Todo lo que se
// muestra (estado del período, motivo del rechazo) lo manda el servidor.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ContratoInquilinoResumen } from '../../api/inquilino';
import type { PagoRespuesta } from '../../api/pagos';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import {
  useContratoInquilino,
  useEstadoCuentaInquilino,
  usePanelInquilino,
  useRefrescarSiNoEncontrado,
} from '../../consultas/inquilino';
import { useMisPagos } from '../../consultas/pagos';
import { mesDePeriodo } from '../../contratos/acciones';
import { variantePanel } from '../../inquilino/seleccion';
import { plegarReemplazados, textoReemplazados } from '../../pagos/historial';
import { diaDePeriodo, periodoInicial, textoMotivoRechazo } from '../../pagos/reglas';
import { colores, espaciado, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { ChipEstado } from '../ChipEstado';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { FilaLista } from '../FilaLista';
import { Icono } from '../iconos/Icono';
import {
  LineaRecaudo,
  type PeriodoProtagonista,
  TarjetaPeriodo,
} from '../inquilino/BloquesMiPanel';
import { ContratoNoEncontrado, ErrorConReintento } from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { ComprobantePago, type ComprobanteFresco } from './ComprobantePago';

type ObtenerFresco = () => Promise<ComprobanteFresco | null | undefined>;

/**
 * Un pago del historial. El inquilino no tiene pantalla de detalle de un pago (B-65): la fila muestra en
 * línea el motivo del rechazo y "Ver comprobante".
 */
function FilaPago({
  pago,
  separador,
  obtenerFresco,
}: {
  pago: PagoRespuesta;
  separador: boolean;
  /** Vuelve a pedir MIS pagos (la URL firmada del comprobante caduca) y entrega este pago. */
  obtenerFresco: ObtenerFresco;
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

/** "N comprobantes reemplazados": plegados por defecto; al tocar se despliegan sus filas. */
function GrupoReemplazados({
  pagos,
  separador,
  obtenerFresco,
}: {
  pagos: PagoRespuesta[];
  separador: boolean;
  obtenerFresco: (id: string) => ObtenerFresco;
}) {
  const [abierto, setAbierto] = useState(false);
  const texto = textoReemplazados(pagos.length);
  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${texto}, ${abierto ? 'expandido' : 'contraído'}`}
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((actual) => !actual)}
        style={({ pressed }) => [estilos.filaGrupo, pressed && estilos.presionada]}
      >
        <Texto variante="secundario" color={colores.textoSecundario} style={estilos.flex}>
          {texto}
        </Texto>
        <View style={abierto ? estilos.arriba : estilos.abajo}>
          <Icono nombre="adelante" tamano={18} color={colores.iconoTenue} grosor={1.8} />
        </View>
      </Pressable>
      {abierto
        ? pagos.map((p) => (
            <FilaPago key={p.id} pago={p} separador obtenerFresco={obtenerFresco(p.id)} />
          ))
        : null}
    </View>
  );
}

export function PagosContrato({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  const id = contrato.id;
  const activo = contrato.estado === 'ACTIVO';
  const programado = contrato.estado === 'PROGRAMADO';
  // Un contrato PROGRAMADO no tiene períodos ni pagos: no se pide nada. Con el contrato ACTIVO el
  // protagonista es el próximo período del panel (la misma consulta de Mi panel); vencido o terminado,
  // el panel no trae período y sale del estado de cuenta.
  const panel = usePanelInquilino(id, activo);
  const detalle = useContratoInquilino(id, activo);
  const cuenta = useEstadoCuentaInquilino(id, !programado && !activo);
  const pagos = useMisPagos(id, !programado);
  useRefrescarAlEnfocar(panel);
  useRefrescarAlEnfocar(pagos);
  const noEncontrado = useRefrescarSiNoEncontrado(panel.error ?? cuenta.error ?? pagos.error);

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

  const fresco = (pagoId: string) => async () =>
    (await pagos.refetch()).data?.find((x) => x.id === pagoId);
  const elementos = pagos.data ? plegarReemplazados(pagos.data) : [];

  return (
    <>
      <Protagonista contrato={contrato} panel={panel} cuenta={cuenta} />

      {activo && detalle.data?.datos_recaudo ? (
        <LineaRecaudo datos={detalle.data.datos_recaudo} />
      ) : null}

      <View style={estilos.grupo}>
        <EncabezadoSeccion
          titulo="Mis pagos"
          enlace={{
            etiqueta: 'Estado de cuenta',
            onPress: () =>
              router.push({ pathname: '/mi-contrato/[id]/estado-cuenta', params: { id } }),
          }}
        />
        {pagos.data === undefined ? (
          pagos.isPending ? (
            <EsqueletoCarga filas={2} />
          ) : (
            <ErrorConReintento error={pagos.error} onReintentar={() => void pagos.refetch()} />
          )
        ) : elementos.length === 0 ? (
          <Superficie>
            <Texto variante="cuerpo" color={colores.textoSecundario}>
              Aún no has reportado pagos
            </Texto>
          </Superficie>
        ) : (
          <Superficie relleno="ninguno">
            {elementos.map((elemento, indice) =>
              elemento.tipo === 'pago' ? (
                <FilaPago
                  key={elemento.pago.id}
                  pago={elemento.pago}
                  separador={indice > 0}
                  obtenerFresco={fresco(elemento.pago.id)}
                />
              ) : (
                <GrupoReemplazados
                  key={`reemplazados-${elemento.periodo}`}
                  pagos={elemento.pagos}
                  separador={indice > 0}
                  obtenerFresco={fresco}
                />
              ),
            )}
          </Superficie>
        )}
      </View>
    </>
  );
}

/**
 * El período protagonista. ACTIVO: `proximo_periodo` y los vencidos del panel (el servidor elige el
 * vencido más antiguo o el del mes). Vencido o terminado: el período reportable más antiguo del estado
 * de cuenta (VENCIDO o PARCIAL), sin línea de vencidos (el panel de un contrato cerrado no la trae).
 */
function Protagonista({
  contrato,
  panel,
  cuenta,
}: {
  contrato: ContratoInquilinoResumen;
  panel: ReturnType<typeof usePanelInquilino>;
  cuenta: ReturnType<typeof useEstadoCuentaInquilino>;
}) {
  const router = useRouter();
  const consulta = contrato.estado === 'ACTIVO' ? panel : cuenta;
  if (consulta.data === undefined) {
    return consulta.isPending ? (
      <EsqueletoCarga filas={2} />
    ) : (
      <ErrorConReintento error={consulta.error} onReintentar={() => void consulta.refetch()} />
    );
  }

  let periodo: PeriodoProtagonista | null = null;
  let vencidos;
  if (contrato.estado === 'ACTIVO') {
    if (
      !panel.data ||
      variantePanel(panel.data) !== 'activo' ||
      !('proximo_periodo' in panel.data)
    ) {
      return null;
    }
    periodo = panel.data.proximo_periodo;
    vencidos = panel.data.periodos_vencidos;
  } else if (cuenta.data) {
    const p = periodoInicial(cuenta.data.periodos, contrato.estado, []);
    periodo = p
      ? {
          periodo: p.periodo,
          fecha_limite: p.fechaLimite,
          monto_centavos: p.canonVigenteCentavos,
          estado: p.estado,
        }
      : null;
  }

  return (
    <TarjetaPeriodo
      periodo={periodo}
      vencidos={vencidos}
      onReportar={() => {
        if (!periodo) return;
        router.push({
          pathname: '/reportar-pago',
          params: { contratoId: contrato.id, periodo: diaDePeriodo(periodo.periodo) },
        });
      }}
    />
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  detalle: { gap: 4, flexShrink: 1 },
  flex: { flex: 1 },
  separador: { height: 1, marginLeft: espaciado.md, backgroundColor: tintaAlfa(0.07) },
  filaGrupo: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.md,
  },
  presionada: { backgroundColor: tintaAlfa(0.03) },
  abajo: { transform: [{ rotate: '90deg' }] },
  arriba: { transform: [{ rotate: '-90deg' }] },
});
