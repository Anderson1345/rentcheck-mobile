// Ocupación de cada unidad a partir de GET /contratos: solo ACTIVO y PROGRAMADO. La fecha de inicio
// sugerida es el día siguiente al último fin; es una ayuda (no considera terminaciones anticipadas):
// el servidor valida el traslape.

import type { ContratoResumen } from '../api/contratos';
import { compararFechas, formatearFechaCorta } from '../utilidades/fechas';
import { sumarDias } from './fechasContrato';

export interface OcupacionUnidad {
  contratos: { estado: 'ACTIVO' | 'PROGRAMADO'; inicio: string; fin: string }[];
  fechaInicioSugerida: string | null;
}

const dia = (fecha: string) => fecha.slice(0, 10);

export function ocupacionPorUnidad(contratos: ContratoResumen[]): Record<string, OcupacionUnidad> {
  const resultado: Record<string, OcupacionUnidad> = {};
  for (const c of contratos) {
    if (c.estado !== 'ACTIVO' && c.estado !== 'PROGRAMADO') continue;
    const entrada = (resultado[c.unidad.id] ??= { contratos: [], fechaInicioSugerida: null });
    entrada.contratos.push({
      estado: c.estado,
      inicio: dia(c.fecha_inicio),
      fin: dia(c.fecha_fin),
    });
  }
  for (const entrada of Object.values(resultado)) {
    const ultimoFin = entrada.contratos
      .map((c) => c.fin)
      .reduce((a, b) => (compararFechas(a, b) >= 0 ? a : b));
    entrada.fechaInicioSugerida = sumarDias(ultimoFin, 1);
  }
  return resultado;
}

/** "Arrendada hasta 30/09/2027" (hay uno activo) o "Programada desde 01/11/2026". */
export function textoOcupacion(ocupacion: OcupacionUnidad): string {
  const activos = ocupacion.contratos.filter((c) => c.estado === 'ACTIVO');
  if (activos.length > 0) {
    const fin = activos.map((c) => c.fin).reduce((a, b) => (compararFechas(a, b) >= 0 ? a : b));
    return `Arrendada hasta ${formatearFechaCorta(fin)}`;
  }
  const inicio = ocupacion.contratos
    .map((c) => c.inicio)
    .reduce((a, b) => (compararFechas(a, b) <= 0 ? a : b));
  return `Programada desde ${formatearFechaCorta(inicio)}`;
}
