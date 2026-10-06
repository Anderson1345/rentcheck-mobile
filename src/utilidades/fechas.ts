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
 * - texto "AAAA-MM-DD", o medianoche UTC exacta ("2026-10-01T00:00:00.000Z", un campo @db.Date):
 *   es un día calendario y se toma tal cual, sin correrlo por zonas horarias;
 * - texto ISO con cualquier otra hora o desfase ("2026-10-02T03:00:00Z"): es un instante y se
 *   convierte al día de Bogotá;
 * - Date: un instante (p. ej. "ahora"), que también se convierte al día de Bogotá.
 */
export type FechaNegocio = string | Date;

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_ISO_CON_HORA =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})$/;

function diaDeInstante(instante: number): string {
  return new Date(instante + DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
}

/** Valida que el día exista en el calendario y lo devuelve como "AAAA-MM-DD". */
function diaCalendario(anio: string, mes: string, dia: string, original: string): string {
  const comprobada = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  if (comprobada.toISOString().slice(0, 10) !== `${anio}-${mes}-${dia}`) {
    throw new RangeError(`Fecha inválida: "${original}".`);
  }
  return `${anio}-${mes}-${dia}`;
}

/** Desfase de la zona en minutos ("Z" → 0, "-05:00" → -300). */
function minutosDeDesfase(zona: string): number {
  if (zona === 'Z') return 0;
  const signo = zona.startsWith('-') ? -1 : 1;
  const digitos = zona.slice(1).replace(':', '');
  return signo * (Number(digitos.slice(0, 2)) * 60 + Number(digitos.slice(2, 4)));
}

/** Normaliza a "AAAA-MM-DD" o lanza RangeError si la fecha no existe. */
function aDiaNegocio(fecha: FechaNegocio): string {
  if (fecha instanceof Date) {
    const instante = fecha.getTime();
    if (Number.isNaN(instante)) throw new RangeError('Fecha inválida.');
    return diaDeInstante(instante);
  }

  const soloFecha = FORMATO_FECHA.exec(fecha);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return diaCalendario(anio, mes, dia, fecha);
  }

  const conHora = FORMATO_ISO_CON_HORA.exec(fecha);
  if (!conHora) throw new RangeError(`Fecha inválida: "${fecha}".`);
  const [, anio, mes, dia, hora, minuto, segundo = '0', fraccion = '0', zona] = conHora;
  diaCalendario(anio, mes, dia, fecha);
  if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 59) {
    throw new RangeError(`Fecha inválida: "${fecha}".`);
  }
  const desfase = minutosDeDesfase(zona);
  const milisegundos = Number(fraccion.slice(0, 3).padEnd(3, '0'));

  const esMedianocheUtc =
    desfase === 0 &&
    Number(hora) === 0 &&
    Number(minuto) === 0 &&
    Number(segundo) === 0 &&
    milisegundos === 0;
  if (esMedianocheUtc) return `${anio}-${mes}-${dia}`;

  const instante =
    Date.UTC(
      Number(anio),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo),
      milisegundos,
    ) -
    desfase * 60_000;
  return diaDeInstante(instante);
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

// ---- R3-B: presentación (Mi panel del inquilino y Alertas) ----

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El día de negocio "AAAA-MM-DD" de una fecha (con las mismas reglas que el resto del módulo). */
export function diaDeNegocio(fecha: FechaNegocio): string {
  return aDiaNegocio(fecha);
}

const numeroDeDia = (fecha: FechaNegocio) => {
  const [anio, mes, dia] = aDiaNegocio(fecha).split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia) / DIA_MS;
};

/** Días calendario de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: FechaNegocio, hasta: FechaNegocio): number {
  return numeroDeDia(hasta) - numeroDeDia(desde);
}

/** "2026-10-05" → "lunes". */
export function diaDeLaSemana(fecha: FechaNegocio): string {
  return DIAS_SEMANA[new Date(numeroDeDia(fecha) * DIA_MS).getUTCDay()];
}

/** "2026-06-01" → "1 jun. 2026". */
export function formatearFechaAbreviada(fecha: FechaNegocio): string {
  const [anio, mes, dia] = aDiaNegocio(fecha).split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1].slice(0, 3)}. ${anio}`;
}

/** Hora de Bogotá de un instante ISO, "h:mm" de 24 horas ("2026-10-02T14:00:00Z" → "9:00"). */
export function horaBogota(instante: string): string {
  const hora = new Date(Date.parse(instante) + DESFASE_BOGOTA_MS).toISOString().slice(11, 16);
  return `${Number(hora.slice(0, 2))}:${hora.slice(3)}`;
}
