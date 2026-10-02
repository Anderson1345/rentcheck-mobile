// Textos y límites de las fotos que comparten el cliente de API, los errores y el selector.

/** Máximo que acepta el servidor (413 por encima). */
export const TAMANO_MAXIMO_FOTO_BYTES = 10 * 1024 * 1024;

export const MENSAJE_FOTO_ILEGIBLE = 'No pudimos leer la foto. Elígela de nuevo.';
export const MENSAJE_FOTO_GRANDE =
  'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.';

// Comprobantes de pago (foto JPG o PNG, o PDF): textos propios; los de foto de arriba no cambian.
export const MENSAJE_COMPROBANTE_NO_VALIDO =
  'Ese archivo no es válido. Usa una foto JPG o PNG, o un PDF.';
export const MENSAJE_ARCHIVO_GRANDE = 'El archivo es demasiado grande (máximo 10 MB).';
export const MENSAJE_ARCHIVO_ILEGIBLE = 'No pudimos leer el archivo. Elígelo de nuevo.';
