// Acciones sobre un contrato (E5-B): qué botones se ofrecen, validación de lo que se escribe y cómo
// comprobar, tras una respuesta perdida, si la acción llegó a aplicarse. La app NO calcula plazos:
// los booleanos puede_dar / puede_cancelar del servidor mandan.

import type { ContratoDetalle } from '../api/contratos';
import { formatearFechaLarga } from '../utilidades/fechas';

export type AccionContrato =
  'incremento' | 'prorroga' | 'darAviso' | 'cancelarAviso' | 'cancelarProgramado';

export interface AccionesDisponibles {
  incremento: boolean;
  prorroga: boolean;
  darAviso: boolean;
  cancelarAviso: boolean;
  cancelarProgramado: boolean;
}

export function accionesDisponibles(c: ContratoDetalle): AccionesDisponibles {
  const activo = c.estado === 'ACTIVO';
  return {
    incremento: activo,
    prorroga: activo,
    darAviso: activo && c.aviso_no_renovacion?.puede_dar === true,
    cancelarAviso: activo && c.aviso_no_renovacion?.puede_cancelar === true,
    cancelarProgramado: c.estado === 'PROGRAMADO',
  };
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
  antes: ContratoDetalle,
  despues: ContratoDetalle,
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
  }
}
