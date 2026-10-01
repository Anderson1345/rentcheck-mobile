// Fechas de negocio: siempre el día calendario de America/Bogota.
//
// El cálculo usa el desfase fijo de -5 h, no Intl con timeZone: Colombia no tiene
// horario de verano y así el resultado no depende de que Hermes/Android traiga los
// datos de zonas horarias, ni de la zona del teléfono.

const DESFASE_BOGOTA_MS = -5 * 60 * 60 * 1000;

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Una fecha de negocio puede llegar como:
 * - texto "AAAA-MM-DD" (o ISO completo de un campo @db.Date, p. ej. "2026-10-01T00:00:00.000Z"):
 *   es un día calendario y se toma tal cual, sin correrlo por zonas horarias;
 * - Date: un instante (p. ej. "ahora"), que se convierte al día de Bogotá.
 */
export type FechaNegocio = string | Date;

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/;

/** Normaliza a "AAAA-MM-DD" o lanza RangeError si la fecha no existe. */
function aDiaNegocio(fecha: FechaNegocio): string {
  if (fecha instanceof Date) {
    const instante = fecha.getTime();
    if (Number.isNaN(instante)) throw new RangeError('Fecha inválida.');
    return new Date(instante + DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
  }

  const partes = FORMATO_FECHA.exec(fecha);
  if (!partes) throw new RangeError(`Fecha inválida: "${fecha}".`);
  const [, anio, mes, dia] = partes;
  const comprobada = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  if (comprobada.toISOString().slice(0, 10) !== `${anio}-${mes}-${dia}`) {
    throw new RangeError(`Fecha inválida: "${fecha}".`);
  }
  return `${anio}-${mes}-${dia}`;
}

/** La fecha de hoy en Bogotá como "AAAA-MM-DD". */
export function hoyBogota(ahora: Date = new Date()): string {
  return aDiaNegocio(ahora);
}

/** "2026-10-01" → "1 de octubre de 2026". */
export function formatearFechaLarga(fecha: FechaNegocio): string {
  const [anio, mes, dia] = aDiaNegocio(fecha).split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`;
}

/** "2026-10-01" → "01/10/2026". */
export function formatearFechaCorta(fecha: FechaNegocio): string {
  const [anio, mes, dia] = aDiaNegocio(fecha).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Negativo si a es anterior a b, 0 si es el mismo día, positivo si es posterior. */
export function compararFechas(a: FechaNegocio, b: FechaNegocio): number {
  const diaA = aDiaNegocio(a);
  const diaB = aDiaNegocio(b);
  return diaA < diaB ? -1 : diaA > diaB ? 1 : 0;
}
