// Presentación del Panel: solo da formato a lo que entrega el servidor (nombres de mes, plurales,
// listas para la gráfica). No calcula reglas de negocio: ni mora, ni recaudo, ni promedios.

import type { MoraPanel, OcupacionPanel, PanelArrendador, TendenciaMes } from '../api/panel';

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

/** Índice (0 a 11) de un mes "AAAA-MM" del servidor, o null si no tiene esa forma. */
function indiceDeMes(mes: string): number | null {
  const coincidencia = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[2]);
  return numero >= 1 && numero <= 12 ? numero - 1 : null;
}

/** "2026-10" → "octubre" (vacío si el mes no es válido: la pantalla nunca se rompe por eso). */
export function nombreDelMes(mes: string): string {
  const indice = indiceDeMes(mes);
  return indice === null ? '' : MESES[indice];
}

/** "2026-10" → "oct". */
export function etiquetaMesCorto(mes: string): string {
  const indice = indiceDeMes(mes);
  return indice === null ? '' : MESES[indice].slice(0, 3);
}

/** "2026-10" → "Octubre de 2026". */
export function mesYAnio(mes: string): string {
  const indice = indiceDeMes(mes);
  if (indice === null) return '';
  const nombre = MESES[indice];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} de ${mes.slice(0, 4)}`;
}

/** Los meses del servidor tal cual, en el mismo orden, con la etiqueta corta que dibuja la gráfica. */
export function mesesDeGrafica(
  tendencia: readonly TendenciaMes[],
): { etiqueta: string; centavos: number }[] {
  return tendencia.map((m) => ({
    etiqueta: etiquetaMesCorto(m.mes),
    centavos: m.ingresos_centavos,
  }));
}

/** Sin meses o con todos en cero no hay curva que dibujar (se dice con un texto). */
export function tendenciaSinIngresos(tendencia: readonly TendenciaMes[]): boolean {
  return tendencia.every((m) => m.ingresos_centavos === 0);
}

const plural = (n: number, singular: string, plurales: string) => (n === 1 ? singular : plurales);

/** "7 de 8 unidades" ("1 de 1 unidad"). */
export function textoUnidades(ocupacion: OcupacionPanel): string {
  return `${ocupacion.ocupadas} de ${ocupacion.unidades} ${plural(ocupacion.unidades, 'unidad', 'unidades')}`;
}

/** "2 contratos · 4 períodos". */
export function textoMora(mora: MoraPanel): string {
  return `${mora.contratos} ${plural(mora.contratos, 'contrato', 'contratos')} · ${mora.periodos} ${plural(mora.periodos, 'período', 'períodos')}`;
}

/** Las listas del servidor traen hasta 5 elementos y `cantidad` es el total: "y 2 más" si faltan. */
export function cantidadDeMas(cantidad: number, mostrados: number): string | null {
  const faltan = cantidad - mostrados;
  return faltan > 0 ? `y ${faltan} más` : null;
}

/** La insignia de la pestaña Pagos es el conteo de comprobantes por validar; sin Panel, no hay insignia. */
export function conteoDePagos(panel: PanelArrendador | undefined): number | undefined {
  return panel?.pendientes.comprobantes_por_validar;
}

export { plural };
