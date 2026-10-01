// Lectura del payload de un JWT SIN verificar la firma: la firma la verifica el servidor en cada
// petición. Aquí solo se lee qué rol dice ser el token y cuándo vence, para decidir qué pantallas
// mostrar. Un token manipulado no da acceso a datos: el servidor lo rechazaría con 401.

import type { RolSesion } from './tipos';

export interface PayloadToken {
  rol: RolSesion;
  /** Vencimiento en segundos desde 1970 (como el claim `exp`). */
  exp: number;
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64url → bytes. Se hace a mano para no depender de `atob` en todos los motores. */
function base64UrlABytes(texto: string): number[] | null {
  const limpio = texto.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (limpio.length === 0 || limpio.length % 4 === 1) return null;
  const bytes: number[] = [];
  let acumulado = 0;
  let bits = 0;
  for (const caracter of limpio) {
    const valor = ALFABETO.indexOf(caracter);
    if (valor === -1) return null;
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 0xff);
    }
  }
  return bytes;
}

/** Bytes UTF-8 → texto. Devuelve null si no es UTF-8 válido. */
function utf8ATexto(bytes: number[]): string | null {
  try {
    const porcentajes = bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join('');
    return decodeURIComponent(porcentajes);
  } catch {
    return null;
  }
}

export function decodificarToken(token: string): PayloadToken | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const bytes = base64UrlABytes(partes[1]);
  const texto = bytes && utf8ATexto(bytes);
  if (!texto) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;

  const { id, inquilinoId, exp } = payload as Record<string, unknown>;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;

  const esArrendador = typeof id === 'string' && id !== '';
  const esInquilino = typeof inquilinoId === 'string' && inquilinoId !== '';
  // Un token con ambas claves, o con ninguna, es ambiguo: no se le da ningún rol.
  if (esArrendador === esInquilino) return null;
  if (id !== undefined && !esArrendador) return null;
  if (inquilinoId !== undefined && !esInquilino) return null;

  return { rol: esArrendador ? 'arrendador' : 'inquilino', exp };
}

export function estaVencido(exp: number, ahoraMs: number): boolean {
  return exp * 1000 <= ahoraMs;
}
