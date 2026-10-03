// Estado de cobro y ocupación de inmuebles y unidades (R2-A). Los estados los calcula el servidor en el
// Panel (`ocupacion.unidades_detalle` y `por_inmueble`, B0.7-B): la app solo los agrupa por inmueble y
// les da texto y tono. Sin Panel (cargando o con error) no hay resumen y las pantallas se muestran sin él.

import type { EstadoOcupacionUnidad, PanelArrendador } from '../api/panel';
import type { TonoEstado } from '../tema';

/** Texto y tono de cada estado de ocupación de una unidad. */
export const ESTADO_OCUPACION: Record<
  EstadoOcupacionUnidad,
  { etiqueta: string; tono: TonoEstado }
> = {
  EN_MORA: { etiqueta: 'En mora', tono: 'peligro' },
  AL_DIA: { etiqueta: 'Al día', tono: 'exito' },
  PROGRAMADA: { etiqueta: 'Programada', tono: 'programado' },
  LIBRE: { etiqueta: 'Libre', tono: 'neutro' },
};

export interface ResumenInmueble {
  /** Chip sobre la foto: "N en mora" si alguna unidad está en mora; si no, "Al día" con ocupadas; si no, "Libre". */
  chip: { texto: string; tono: TonoEstado };
  /** Unidades con contrato ACTIVO (en mora o al día). */
  ocupadas: number;
  /** Ingresos del año en curso del inmueble (`por_inmueble`); null si el Panel no lo trae. */
  ingresosAnioCentavos: number | null;
  /** Año de esos ingresos (Bogotá). */
  anio: number;
}

export function resumenDeInmueble(
  panel: PanelArrendador | undefined,
  inmuebleId: string,
): ResumenInmueble | null {
  if (!panel) return null;
  const suyas = panel.ocupacion.unidades_detalle.filter((u) => u.inmueble_id === inmuebleId);
  const enMora = suyas.filter((u) => u.estado === 'EN_MORA').length;
  const ocupadas = suyas.filter((u) => u.estado === 'EN_MORA' || u.estado === 'AL_DIA').length;
  const fila = panel.por_inmueble.find((i) => i.inmueble_id === inmuebleId);
  const chip =
    enMora > 0
      ? { texto: `${enMora} en mora`, tono: 'peligro' as const }
      : ocupadas > 0
        ? { texto: 'Al día', tono: 'exito' as const }
        : { texto: 'Libre', tono: 'neutro' as const };
  return {
    chip,
    ocupadas: fila?.ocupadas ?? ocupadas,
    ingresosAnioCentavos: fila ? fila.ingresos_anio_centavos : null,
    anio: panel.anio.anio,
  };
}

/** Estado de ocupación de una unidad según el Panel; null sin Panel o si no aparece. */
export function estadoDeUnidad(
  panel: PanelArrendador | undefined,
  unidadId: string,
): EstadoOcupacionUnidad | null {
  return panel?.ocupacion.unidades_detalle.find((u) => u.unidad_id === unidadId)?.estado ?? null;
}

/** Miniaturas de la tarjeta: hasta `maximo` visibles y cuántas quedan para "+N". */
export function miniaturasVisibles<T>(
  elementos: readonly T[],
  maximo = 3,
): { visibles: T[]; resto: number } {
  return {
    visibles: elementos.slice(0, maximo),
    resto: Math.max(0, elementos.length - maximo),
  };
}
