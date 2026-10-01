// Ayudas de prueba para construir JWT sin firma real (la firma la verifica el servidor).
// Se codifica a mano para no depender de Buffer (no hay tipos de Node en el proyecto).

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Texto UTF-8 → base64url sin relleno. */
export function aBase64Url(texto: string): string {
  const bytes = encodeURIComponent(texto)
    .replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .split('')
    .map((c) => c.charCodeAt(0));
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    salida += ALFABETO[a >> 2];
    salida += ALFABETO[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) salida += ALFABETO[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) salida += ALFABETO[c & 63];
  }
  return salida;
}

export function crearToken(payload: Record<string, unknown>, firma = 'firma'): string {
  return `${aBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${aBase64Url(JSON.stringify(payload))}.${firma}`;
}
