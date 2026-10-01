// Plantilla legal que corresponde a una unidad. Espejo de plantilla-unidad.ts del backend: es una
// ayuda de interfaz; el servidor decide (PLANTILLA_NO_CORRESPONDE_A_UNIDAD).

import type { TipoUnidad, UsoPermitido } from '../api/inmuebles';

export type TipoPlantilla = 'VIVIENDA_URBANA_LEY_820' | 'LOCAL_COMERCIAL' | 'PARQUEADERO';

export const ETIQUETA_PLANTILLA: Record<TipoPlantilla, string> = {
  VIVIENDA_URBANA_LEY_820: 'Vivienda urbana (Ley 820 de 2003)',
  LOCAL_COMERCIAL: 'Local comercial',
  PARQUEADERO: 'Parqueadero',
};

/** Parqueadero → PARQUEADERO; si no, residencial → vivienda urbana y comercial → local comercial. */
export function plantillaParaUnidad(tipo: TipoUnidad, uso: UsoPermitido): TipoPlantilla {
  if (tipo === 'PARQUEADERO') return 'PARQUEADERO';
  return uso === 'RESIDENCIAL' ? 'VIVIENDA_URBANA_LEY_820' : 'LOCAL_COMERCIAL';
}

/** En vivienda urbana la ley no permite depósito en dinero (Ley 820, art. 16). */
export function esPlantillaVivienda(plantilla: TipoPlantilla): boolean {
  return plantilla === 'VIVIENDA_URBANA_LEY_820';
}
