// Acciones sobre un contrato (E5-B): qué botones se ofrecen, validación de lo que se escribe y cómo
// comprobar, tras una respuesta perdida, si la acción llegó a aplicarse. La app NO calcula plazos:
// los booleanos puede_dar / puede_cancelar del servidor mandan.

import type {
  ContratoDetalle,
  EstadoContratoApi,
  ResumenAviso,
  ResumenTerminacionContrato,
} from '../api/contratos';
import { formatearFechaLarga } from '../utilidades/fechas';

/**
 * Lo mínimo que se necesita del detalle de un contrato para decidir acciones y verificar si se
 * aplicaron. Lo cumplen el detalle del arrendador (ContratoDetalle) y el del portal del inquilino.
 */
export interface DetalleAccionable {
  estado: EstadoContratoApi;
  canon_centavos: number;
  fecha_fin: string;
  incrementos_ipc?: readonly unknown[];
  aviso_no_renovacion?: ResumenAviso;
  terminacion_anticipada?: ResumenTerminacionContrato;
}

// Advertencia obligatoria de la interfaz (Contexto §13, Ley 820 art. 21): texto exacto.
export const ADVERTENCIA_TERMINACION =
  'Esto es una terminación por mutuo acuerdo. No reemplaza el aviso escrito ni las causales de una terminación unilateral (Ley 820, arts. 22 a 24).';

/** Confirmación FUERTE de "Confirmar terminación": es irreversible. */
export function textoConfirmarTerminacion(fechaEfectiva: string | null | undefined): string {
  return `Esta acción es irreversible: si la fecha efectiva es hoy, el contrato termina de inmediato; si es futura, sigue activo hasta esa fecha.${fechaEfectiva ? ` Fecha efectiva: ${formatearFechaLarga(fechaEfectiva)}.` : ''}`;
}

/** Resumen que se muestra antes de enviar la solicitud de terminación. */
export function textoResumenSolicitud(fechaEfectiva: string, motivo: string): string {
  return `Fecha efectiva: ${formatearFechaLarga(fechaEfectiva)}. Motivo: ${motivo}. La otra parte debe confirmarla.`;
}

export type AccionContrato =
  | 'incremento'
  | 'prorroga'
  | 'darAviso'
  | 'cancelarAviso'
  | 'cancelarProgramado'
  | 'solicitarTerminacion'
  | 'confirmarTerminacion'
  | 'cancelarTerminacion'
  | 'regenerarDocumentos'
  // Pagos del arrendador (E7-B): la verificación la aporta la fuente (FuenteDetalle.huboCambio).
  | 'aprobarPago'
  | 'rechazarPago'
  // Solicitudes de mantenimiento del arrendador (E8-B): su fuente aporta la comparación.
  | 'iniciarSolicitud'
  | 'resolverSolicitud';

export interface AccionesDisponibles {
  incremento: boolean;
  prorroga: boolean;
  darAviso: boolean;
  cancelarAviso: boolean;
  cancelarProgramado: boolean;
}

export function accionesDisponibles(c: DetalleAccionable): AccionesDisponibles {
  const activo = c.estado === 'ACTIVO';
  return {
    incremento: activo,
    prorroga: activo,
    darAviso: activo && c.aviso_no_renovacion?.puede_dar === true,
    cancelarAviso: activo && c.aviso_no_renovacion?.puede_cancelar === true,
    cancelarProgramado: c.estado === 'PROGRAMADO',
  };
}

/** No existe puede_solicitar: se ofrece solo con el contrato ACTIVO y sin solicitud (el servidor decide el resto). */
export function puedeSolicitarTerminacion(c: DetalleAccionable): boolean {
  const estado = c.terminacion_anticipada?.estado;
  return c.estado === 'ACTIVO' && (estado === undefined || estado === 'NINGUNA');
}

/** Acciones que se ofrecen al inquilino en Mi contrato. Solo con el contrato ACTIVO. */
export interface AccionesPortal {
  solicitarTerminacion: boolean;
  confirmarTerminacion: boolean;
  cancelarTerminacion: boolean;
  darAviso: boolean;
  cancelarAviso: boolean;
}

/**
 * Los booleanos del servidor mandan (puede_confirmar, puede_cancelar, puede_dar): la app no calcula
 * plazos ni permisos. Solo "solicitar" se deduce (no existe puede_solicitar), como en E5-C.
 */
export function accionesInquilino(c: DetalleAccionable): AccionesPortal {
  const activo = c.estado === 'ACTIVO';
  const t = c.terminacion_anticipada;
  const solicitada = activo && t?.estado === 'SOLICITADA';
  return {
    solicitarTerminacion: puedeSolicitarTerminacion(c),
    confirmarTerminacion: solicitada && t?.puede_confirmar === true,
    cancelarTerminacion: solicitada && t?.puede_cancelar === true,
    darAviso: activo && c.aviso_no_renovacion?.puede_dar === true,
    cancelarAviso: activo && c.aviso_no_renovacion?.puede_cancelar === true,
  };
}

/** Corregir datos: solo sin vincular y PROGRAMADO o ACTIVO. Si hay pagos o incrementos, responde el servidor. */
export function puedeCorregir(c: ContratoDetalle): boolean {
  return !c.vinculado && (c.estado === 'PROGRAMADO' || c.estado === 'ACTIVO');
}

export const MENSAJE_PORCENTAJE =
  'El porcentaje debe ser mayor que 0 y no pasar de 100, con hasta 2 decimales.';

/** Admite coma o punto; mayor que 0, hasta 100 y máximo 2 decimales (como el servidor). */
export function parsearPorcentaje(texto: string): { valor: number } | { error: string } {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return { error: 'Escribe el porcentaje.' };
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return { error: MENSAJE_PORCENTAJE };
  const valor = Number(limpio);
  if (!(valor > 0 && valor <= 100)) return { error: MENSAJE_PORCENTAJE };
  return { valor };
}

export const MENSAJE_MESES = 'Escribe un número de meses entre 1 y 60.';

export function parsearMeses(texto: string): { valor: number } | { error: string } {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return { error: MENSAJE_MESES };
  const valor = Number(limpio);
  return valor >= 1 && valor <= 60 ? { valor } : { error: MENSAJE_MESES };
}

/** "4.00" → "4", 5.5 → "5,5". El porcentaje puede llegar como texto (Decimal de Prisma). */
export function formatearPorcentaje(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return String(Math.round(numero * 100) / 100).replace('.', ',');
}

/** "2026-10-01T00:00:00.000Z" → "Octubre de 2026". */
export function mesDePeriodo(periodo: string): string {
  const texto = formatearFechaLarga(periodo).split(' de ').slice(1).join(' de ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** ¿El detalle de ahora refleja que la acción se aplicó? (verificación tras "sin respuesta"). */
export function huboCambio(
  accion: AccionContrato,
  antes: DetalleAccionable,
  despues: DetalleAccionable,
): boolean {
  switch (accion) {
    case 'incremento':
      return (
        despues.canon_centavos !== antes.canon_centavos ||
        (despues.incrementos_ipc?.length ?? 0) > (antes.incrementos_ipc?.length ?? 0)
      );
    case 'prorroga':
      return despues.fecha_fin !== antes.fecha_fin;
    case 'darAviso':
      return (
        antes.aviso_no_renovacion?.estado !== 'DADO' &&
        despues.aviso_no_renovacion?.estado === 'DADO'
      );
    case 'cancelarAviso':
      return (
        antes.aviso_no_renovacion?.estado === 'DADO' &&
        despues.aviso_no_renovacion?.estado !== 'DADO'
      );
    case 'cancelarProgramado':
      return antes.estado === 'PROGRAMADO' && despues.estado === 'CANCELADO';
    case 'solicitarTerminacion':
      return (
        (antes.terminacion_anticipada?.estado ?? 'NINGUNA') === 'NINGUNA' &&
        (despues.terminacion_anticipada?.estado ?? 'NINGUNA') !== 'NINGUNA'
      );
    case 'confirmarTerminacion':
      return (
        antes.terminacion_anticipada?.estado !== 'CONFIRMADA' &&
        despues.terminacion_anticipada?.estado === 'CONFIRMADA'
      );
    case 'cancelarTerminacion':
      return (
        antes.terminacion_anticipada?.estado === 'SOLICITADA' &&
        (despues.terminacion_anticipada?.estado ?? 'NINGUNA') === 'NINGUNA'
      );
    case 'regenerarDocumentos':
      // Los documentos no cuelgan del detalle: se compara con la lista de documentos.
      return false;
    case 'aprobarPago':
    case 'rechazarPago':
      // Un pago no es un contrato: su fuente trae su propia comparación (consultas/pagos.ts).
      return false;
    case 'iniciarSolicitud':
    case 'resolverSolicitud':
      // Tampoco una solicitud: su comparación está en FUENTE_SOLICITUD (consultas/mantenimiento.ts).
      return false;
  }
}
