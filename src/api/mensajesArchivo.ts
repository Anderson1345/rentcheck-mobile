// Textos y límites de las fotos que comparten el cliente de API, los errores y el selector.

/** Máximo que acepta el servidor (413 por encima). */
export const TAMANO_MAXIMO_FOTO_BYTES = 10 * 1024 * 1024;

export const MENSAJE_FOTO_ILEGIBLE = 'No pudimos leer la foto. Elígela de nuevo.';
export const MENSAJE_FOTO_GRANDE =
  'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.';
