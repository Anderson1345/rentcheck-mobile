// Código de activación del contrato: RC-XXXX-XXXX con 8 caracteres de un alfabeto sin I, O, 0 ni 1
// (Contexto §3.2/§3.3). La validación local evita enviar códigos mal formados: cada fallo en el
// servidor cuenta para el bloqueo de 15 minutos.

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CUERPO = new RegExp(`^[${ALFABETO}]{8}$`);

export type ResultadoCodigo = { valido: true; codigo: string } | { valido: false };

/** Sin espacios ni guiones y en mayúsculas ("rc-ab3d 9kpx" → "RCAB3D9KPX"). */
export function normalizarCodigo(entrada: string): string {
  return entrada.replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * El prefijo RC es opcional: vale "RC" + 8 caracteres del alfabeto, o solo los 8. Devuelve el
 * formato canónico RC-XXXX-XXXX, que es el único que se envía (el backend solo inserta los guiones
 * si llega como RC + 8). Ocho caracteres que empiezan por "RC" son ambiguos (puede faltar el
 * resto), así que se rechazan: quien tenga un código así lo escribe con el prefijo.
 */
export function validarCodigo(entrada: string): ResultadoCodigo {
  const limpio = normalizarCodigo(entrada);
  let cuerpo: string;
  if (limpio.length === 10 && limpio.startsWith('RC')) cuerpo = limpio.slice(2);
  else if (limpio.length === 8 && !limpio.startsWith('RC')) cuerpo = limpio;
  else return { valido: false };

  if (!CUERPO.test(cuerpo)) return { valido: false };
  return { valido: true, codigo: `RC-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}` };
}

/** Tope de caracteres visibles: un código de más de 10 sigue a la vista, pero validarCodigo lo rechaza. */
const MAXIMO_VISIBLE = 12;

/**
 * Lo que se ve en el campo mientras se escribe: RC-XXXX-XXXX por tramos, sin símbolos de más. Lo
 * que sobra NO se recorta en silencio (un código pegado con un carácter de más pasaría a ser otro
 * código válido y gastaría un intento): queda a la vista y la validación lo rechaza.
 */
export function formatearCodigoEscrito(entrada: string): string {
  const letras = entrada.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (letras.startsWith('RC')) {
    const cuerpo = letras.slice(2, 2 + MAXIMO_VISIBLE);
    if (cuerpo === '') return letras.length > 0 ? 'RC' : '';
    return cuerpo.length > 4 ? `RC-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}` : `RC-${cuerpo}`;
  }
  const cuerpo = letras.slice(0, MAXIMO_VISIBLE);
  return cuerpo.length > 4 ? `${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}` : cuerpo;
}
