// Reloj de pruebas: fija solo `Date`; los temporizadores (setTimeout, microtareas…) siguen reales
// para que `await` y las esperas de las pantallas funcionen igual. Las pruebas no dependen de la
// fecha de hoy: lo que se compara contra "hoy" se calcula con este instante.

/** 12:00 en Bogotá del 2 de octubre de 2026. */
export const INSTANTE_PRUEBAS = '2026-10-02T17:00:00Z';
/** El día de Bogotá de INSTANTE_PRUEBAS. */
export const HOY_PRUEBAS = '2026-10-02';

const TEMPORIZADORES_REALES = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'nextTick',
  'queueMicrotask',
  'performance',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'hrtime',
] as const;

export function fijarReloj(instante: string = INSTANTE_PRUEBAS): void {
  jest.useFakeTimers({ now: new Date(instante), doNotFake: [...TEMPORIZADORES_REALES] });
}

export function restaurarReloj(): void {
  jest.useRealTimers();
}
