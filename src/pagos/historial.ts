// Historial de pagos del inquilino (R4-A, U9): solo presentación. Ordena para mostrar y pliega los
// comprobantes REEMPLAZADO de cada período bajo una fila propia. El estado de cada pago lo da el
// servidor; nunca se ocultan pagos aprobados, en revisión ni rechazados.

interface PagoHistorial {
  id: string;
  /** Primer día del mes que cubre. */
  periodo: string;
  estado: string;
  creado_en: string;
}

export type ElementoHistorial<T> =
  { tipo: 'pago'; pago: T } | { tipo: 'reemplazados'; periodo: string; pagos: T[] };

/** Del período más reciente al más antiguo; dentro del período, del reporte más nuevo al más viejo. */
function compararPagos(a: PagoHistorial, b: PagoHistorial): number {
  const porPeriodo = b.periodo.slice(0, 10).localeCompare(a.periodo.slice(0, 10));
  return porPeriodo !== 0 ? porPeriodo : b.creado_en.localeCompare(a.creado_en);
}

/**
 * Filas del historial: cada pago que no sea REEMPLAZADO es una fila; los REEMPLAZADO de un mismo
 * período van juntos en un grupo plegado al final de ese período.
 */
export function plegarReemplazados<T extends PagoHistorial>(
  pagos: readonly T[],
): ElementoHistorial<T>[] {
  const porPeriodo = new Map<string, { visibles: T[]; reemplazados: T[] }>();
  for (const pago of [...pagos].sort(compararPagos)) {
    const clave = pago.periodo.slice(0, 10);
    const grupo = porPeriodo.get(clave) ?? { visibles: [], reemplazados: [] };
    if (pago.estado === 'REEMPLAZADO') grupo.reemplazados.push(pago);
    else grupo.visibles.push(pago);
    porPeriodo.set(clave, grupo);
  }

  const elementos: ElementoHistorial<T>[] = [];
  for (const { visibles, reemplazados } of porPeriodo.values()) {
    for (const pago of visibles) elementos.push({ tipo: 'pago', pago });
    if (reemplazados.length > 0) {
      elementos.push({
        tipo: 'reemplazados',
        periodo: reemplazados[0].periodo,
        pagos: reemplazados,
      });
    }
  }
  return elementos;
}

/** "1 comprobante reemplazado" / "3 comprobantes reemplazados". */
export function textoReemplazados(cantidad: number): string {
  return cantidad === 1 ? '1 comprobante reemplazado' : `${cantidad} comprobantes reemplazados`;
}
