// Fechas del contrato como textos "AAAA-MM-DD" con aritmética UTC: nunca un Date del teléfono como
// fecha de negocio. Misma regla que sumarMesesUTC del backend.

function aPartes(fecha: string): [number, number, number] {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return [anio, mes, dia];
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function ultimoDiaDelMes(anio: number, mesIndiceCero: number): number {
  return new Date(Date.UTC(anio, mesIndiceCero + 1, 0)).getUTCDate();
}

/**
 * Suma meses de calendario. Si el día no existe en el mes destino, usa el último del mes; si la
 * fecha de partida es el último día de su mes, el resultado es el último día del mes destino.
 */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes0, dia] = (([a, m, d]) => [a, m - 1, d])(aPartes(fecha));
  const destino = new Date(Date.UTC(anio, mes0 + meses, 1));
  const ultimoDestino = ultimoDiaDelMes(destino.getUTCFullYear(), destino.getUTCMonth());
  const esUltimoDelOrigen = dia === ultimoDiaDelMes(anio, mes0);
  const diaFinal = esUltimoDelOrigen ? ultimoDestino : Math.min(dia, ultimoDestino);
  return aTexto(new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth(), diaFinal)));
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = aPartes(fecha);
  return aTexto(new Date(Date.UTC(anio, mes - 1, dia + dias)));
}

/** Fin inclusivo (convención del backend): inicio + n meses − 1 día. 2026-01-10 + 12 → 2027-01-09. */
export function fechaFinPorMeses(inicio: string, meses: number): string {
  return sumarDias(sumarMeses(inicio, meses), -1);
}
