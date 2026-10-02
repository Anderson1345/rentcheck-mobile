// Lógica pura del portal del inquilino: qué contrato está seleccionado y cómo se lee cada variante
// del panel. La app no calcula estado de pago, plazos ni permisos: solo muestra lo que responde el
// servidor.

import type { ContratoInquilinoResumen, PanelContratoInquilino } from '../api/inquilino';
import type { EstadoContratoApi } from '../api/contratos';
import { centavosAPesosTexto } from '../utilidades/dinero';

/** El servidor ya ordena: ACTIVO primero, luego PROGRAMADOS y al final el resto. */
export function elegirContratoPorDefecto(contratos: readonly { id: string }[]): string | null {
  return contratos[0]?.id ?? null;
}

/** El elegido si sigue en la lista (puede haberse desvinculado o cancelado); si no, el primero. */
export function resolverSeleccion(
  contratos: readonly { id: string }[],
  elegidoId: string | null,
): string | null {
  if (elegidoId !== null && contratos.some((c) => c.id === elegidoId)) return elegidoId;
  return elegirContratoPorDefecto(contratos);
}

export type VariantePanel = 'activo' | 'programado' | 'finalizado';

/** Las tres formas de GET /:id/panel se distinguen por `contratoFinalizado` y `programado`. */
export function variantePanel(panel: PanelContratoInquilino): VariantePanel {
  if ('contratoFinalizado' in panel) return panel.contratoFinalizado ? 'finalizado' : 'programado';
  return 'activo';
}

/** Sin acta ni liquidación: no existen todavía (B-53). */
export function mensajeFinalizado(estado: EstadoContratoApi): string {
  if (estado === 'VENCIDO') return 'Tu contrato finalizó.';
  if (estado === 'TERMINADO_ANTICIPADAMENTE') return 'Tu contrato terminó de forma anticipada.';
  return 'Este contrato ya no está vigente.';
}

/** "Apto 302 · Calle 45 # 12-30". */
export function descripcionContrato(contrato: ContratoInquilinoResumen): string {
  return `${contrato.unidad.nombre} · ${contrato.inmueble.direccion}`;
}

export function textoDiasRestantes(dias: number): string {
  if (dias <= 0) return 'Tu contrato termina hoy';
  if (dias === 1) return 'Falta 1 día para que termine tu contrato';
  return `Faltan ${dias} días para que termine tu contrato`;
}

export function textoVencidos(cantidad: number, totalPendienteCentavos: number): string {
  const periodos = cantidad === 1 ? 'período' : 'períodos';
  return `${cantidad} ${periodos} · Total pendiente ${centavosAPesosTexto(totalPendienteCentavos)}`;
}
