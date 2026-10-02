// Clave de idempotencia (cabecera Idempotency-Key). El servidor acepta de 8 a 128 caracteres
// [A-Za-z0-9_-]; aquí se generan de 32 a 64. Sin paquetes: se usa lo que ofrezca el runtime y, si no
// hay nada, Date.now más aleatorio (basta: la clave no es un secreto, solo debe ser única por envío).

export const FORMATO_CLAVE_IDEMPOTENCIA = /^[A-Za-z0-9_-]{32,64}$/;

/** Lo que usamos de `crypto` (el objeto global puede no existir en el runtime). */
export interface FuenteAleatoria {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(arreglo: T) => T;
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const LARGO = 32;

/**
 * `fuente`: por defecto el `crypto` global. Con `null` (o sin crypto) usa el respaldo con
 * Date.now + Math.random.
 */
export function generarClaveIdempotencia(
  fuente: FuenteAleatoria | null | undefined = (globalThis as { crypto?: FuenteAleatoria }).crypto,
): string {
  if (fuente?.randomUUID) return fuente.randomUUID();

  if (fuente?.getRandomValues) {
    const bytes = fuente.getRandomValues(new Uint8Array(LARGO));
    let clave = '';
    // 64 símbolos: el resto de dividir entre 64 no introduce sesgo.
    for (let i = 0; i < LARGO; i += 1) clave += ALFABETO[bytes[i] % ALFABETO.length];
    return clave;
  }

  let clave = Date.now().toString(36);
  while (clave.length < LARGO) {
    clave += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return clave;
}
