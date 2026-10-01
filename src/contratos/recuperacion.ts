// Recuperación tras una respuesta perdida (B-60): POST /contratos no usa Idempotency-Key; si no
// sabemos si el contrato se creó, se busca en GET /contratos.

import type { ContratoResumen } from '../api/contratos';
import { compararFechas } from '../utilidades/fechas';
import type { BorradorContrato } from './esquemas';

/** Id del contrato que coincide con el borrador enviado, o null. Nunca coincide con CANCELADO. */
export function buscarContratoCreado(
  borrador: BorradorContrato,
  lista: ContratoResumen[],
): string | null {
  const nombre = borrador.nombre.trim();
  const encontrado = lista.find((c) => {
    if (c.estado !== 'ACTIVO' && c.estado !== 'PROGRAMADO') return false;
    if (c.unidad.id !== borrador.unidadId) return false;
    if (compararFechas(c.fecha_inicio, borrador.fechaInicio) !== 0) return false;
    if (compararFechas(c.fecha_fin, borrador.fechaFin) !== 0) return false;
    if (c.canon_centavos !== borrador.canonCentavos) return false;
    return borrador.modoInquilino === 'existente'
      ? c.inquilino.id === borrador.inquilinoId
      : c.inquilino.nombre === nombre;
  });
  return encontrado?.id ?? null;
}
