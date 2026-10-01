import type { NombreIcono } from '../iconos/Icono';

export interface PestanaNav {
  /** Nombre de la ruta (archivo) de Expo Router que abre la pestaña. */
  clave: string;
  etiqueta: string;
  icono: NombreIcono;
}

/**
 * Pestañas del arrendador (diseño: Panel, Inmuebles, Contratos, Pagos, Más). Las claves son los
 * nombres de ruta de app/(arrendador)/(pestanas): contratos, pagos y más llevan el sufijo
 * "-arrendador" porque dos grupos de rutas no pueden compartir la misma URL (el inquilino tendrá
 * /pagos y /mas).
 */
export const PESTANAS_ARRENDADOR = [
  { clave: 'panel', etiqueta: 'Panel', icono: 'panel' },
  { clave: 'inmuebles', etiqueta: 'Inmuebles', icono: 'inmuebles' },
  { clave: 'contratos-arrendador', etiqueta: 'Contratos', icono: 'contratos' },
  { clave: 'pagos-arrendador', etiqueta: 'Pagos', icono: 'pagos' },
  { clave: 'mas-arrendador', etiqueta: 'Más', icono: 'mas' },
] as const satisfies readonly PestanaNav[];

/** Pestañas del inquilino (diseño: Mi panel, Pagos, Solicitudes, Más). */
export const PESTANAS_INQUILINO = [
  { clave: 'mi-panel', etiqueta: 'Mi panel', icono: 'panel' },
  { clave: 'pagos', etiqueta: 'Pagos', icono: 'pagos' },
  { clave: 'solicitudes', etiqueta: 'Solicitudes', icono: 'mantenimiento' },
  { clave: 'mas', etiqueta: 'Más', icono: 'mas' },
] as const satisfies readonly PestanaNav[];

export type ClaveArrendador = (typeof PESTANAS_ARRENDADOR)[number]['clave'];
export type ClaveInquilino = (typeof PESTANAS_INQUILINO)[number]['clave'];

/** Texto de la insignia: nada si es 0, "9+" desde 10. */
export function textoInsignia(cantidad: number | undefined): string | null {
  if (!cantidad || cantidad <= 0) return null;
  return cantidad > 9 ? '9+' : String(cantidad);
}
