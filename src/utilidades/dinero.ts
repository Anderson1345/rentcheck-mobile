// Dinero: siempre entero en centavos. Se formatea a mano (sin Intl) para que el
// resultado sea idéntico en Hermes/Android, iOS y las pruebas.

/** 125000000 → "$ 1.250.000". Los centavos solo se muestran si no son múltiplo de 100: "$ 1.250.000,50". */
export function centavosAPesosTexto(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError('El dinero debe ser un entero de centavos.');
  }
  const magnitud = Math.abs(centavos);
  const pesos = Math.floor(magnitud / 100);
  const resto = magnitud % 100;

  const pesosConPuntos = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraccion = resto === 0 ? '' : `,${String(resto).padStart(2, '0')}`;
  return `${centavos < 0 ? '-' : ''}$ ${pesosConPuntos}${fraccion}`;
}

const SOLO_DIGITOS = /^\d+$/;
const MILES_CON_PUNTOS = /^\d{1,3}(\.\d{3})+$/;
const MILES_CON_COMAS = /^\d{1,3}(,\d{3})+$/;

/**
 * Pesos escritos por el usuario → centavos. Devuelve null si el texto no es válido.
 * Acepta "1250000", "1.250.000", "1,250,000" y "$ 1.250.000". Un punto o una coma
 * son siempre separadores de miles: no se aceptan decimales ("1.5", "1,50",
 * "1.250,50") porque serían ambiguos, ni negativos.
 */
export function pesosTextoACentavos(texto: string): number | null {
  const limpio = texto.replace(/\s+/g, '').replace(/^\$/, '');

  let pesos: string;
  if (SOLO_DIGITOS.test(limpio)) {
    pesos = limpio;
  } else if (MILES_CON_PUNTOS.test(limpio) || MILES_CON_COMAS.test(limpio)) {
    pesos = limpio.replace(/[.,]/g, '');
  } else {
    return null;
  }

  const centavos = Number(pesos) * 100;
  return Number.isSafeInteger(centavos) ? centavos : null;
}
