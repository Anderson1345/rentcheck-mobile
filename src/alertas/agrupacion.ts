// Alertas por día de Bogotá (R3-B): solo presentación de lo que da el feed. Qué alertas hay, cuáles
// están leídas y cuándo se ocultan lo decide el servidor (D-13: las leídas se ocultan a los 7 días).

import {
  diaDeLaSemana,
  diasEntre,
  formatearFechaCorta,
  horaBogota,
  hoyBogota,
} from '../utilidades/fechas';

export type ClaveGrupo = 'hoy' | 'ayer' | 'semana' | 'antes';

export interface GrupoAlertas<T> {
  clave: ClaveGrupo;
  titulo: string;
  alertas: T[];
}

const ORDEN: readonly ClaveGrupo[] = ['hoy', 'ayer', 'semana', 'antes'];
const TITULOS: Record<ClaveGrupo, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  semana: 'Esta semana',
  antes: 'Antes',
};

/** Días atrás → grupo: 0 hoy, 1 ayer, de 2 a 6 "Esta semana" y desde 7, "Antes". */
function claveDe(dias: number): ClaveGrupo {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias <= 6) return 'semana';
  return 'antes';
}

/**
 * Agrupa las alertas por el día de Bogotá en que se crearon, frente a `ahora` (inyectable): Hoy, Ayer,
 * Esta semana y Antes, siempre en ese orden y solo los grupos que tengan alertas. Dentro de cada grupo
 * se conserva el orden del servidor. Un instante futuro (reloj del teléfono atrasado) cuenta como hoy.
 */
export function agruparPorDia<T extends { creado_en: string }>(
  alertas: readonly T[],
  ahora: Date = new Date(),
): GrupoAlertas<T>[] {
  const hoy = hoyBogota(ahora);
  const porClave = new Map<ClaveGrupo, T[]>();
  for (const alerta of alertas) {
    const clave = claveDe(diasEntre(alerta.creado_en, hoy));
    porClave.set(clave, [...(porClave.get(clave) ?? []), alerta]);
  }
  return ORDEN.filter((clave) => porClave.has(clave)).map((clave) => ({
    clave,
    titulo: TITULOS[clave],
    alertas: porClave.get(clave) ?? [],
  }));
}

/** Hora (Hoy y Ayer), día abreviado ("lun.", Esta semana) o fecha dd/mm/aaaa (Antes), en Bogotá. */
export function tiempoDeAlerta(creadoEn: string, clave: ClaveGrupo): string {
  if (clave === 'hoy' || clave === 'ayer') return horaBogota(creadoEn);
  if (clave === 'semana') return `${diaDeLaSemana(creadoEn).slice(0, 3)}.`;
  return formatearFechaCorta(creadoEn);
}

/** Lo que lee el lector de pantalla en el título de un grupo: "Hoy: 2 alertas, 1 sin leer". */
export function resumenGrupo(grupo: GrupoAlertas<{ leida: boolean }>): string {
  const total = grupo.alertas.length;
  const sinLeer = grupo.alertas.filter((a) => !a.leida).length;
  const base = `${grupo.titulo}: ${total} ${total === 1 ? 'alerta' : 'alertas'}`;
  return sinLeer > 0 ? `${base}, ${sinLeer} sin leer` : base;
}
