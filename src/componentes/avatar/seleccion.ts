// Elige la variante y el tono del avatar de relieve a partir del nombre, de forma determinista:
// la misma persona tiene el mismo avatar en todas las pantallas y en todos los teléfonos.

import { FORMAS_RELIEVE, TONOS_RELIEVE } from './relieves';

/** 6 formas del diseño + las mismas giradas 180°. */
export const NUMERO_VARIANTES = FORMAS_RELIEVE.length * 2;
export const NUMERO_TONOS = TONOS_RELIEVE.length;

/** Espacios repetidos y mayúsculas no cambian a la persona ("  Laura  MEJÍA" = "Laura Mejía"). */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** FNV-1a de 32 bits sobre las unidades UTF-16 del nombre normalizado. */
export function hashNombre(nombre: string): number {
  const texto = normalizarNombre(nombre);
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export interface SeleccionRelieve {
  /** 0 a 11. */
  variante: number;
  /** 0 a 5. */
  tono: number;
}

export function seleccionarRelieve(nombre: string): SeleccionRelieve {
  const hash = hashNombre(nombre);
  return {
    variante: hash % NUMERO_VARIANTES,
    // Bits altos para que el tono no dependa de la variante.
    tono: (hash >>> 16) % NUMERO_TONOS,
  };
}
