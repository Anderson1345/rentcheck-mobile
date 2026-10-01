import type { TipoUnidad, UnidadInmueble, UsoPermitido } from '../api/inmuebles';

export const ETIQUETA_TIPO_UNIDAD: Record<TipoUnidad, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL: 'Local',
  PARQUEADERO: 'Parqueadero',
  HABITACION: 'Habitación',
};

export const ETIQUETA_USO: Record<UsoPermitido, string> = {
  RESIDENCIAL: 'Residencial',
  COMERCIAL: 'Comercial',
};

/** "1 unidad" / "3 unidades". */
export function textoUnidades(cantidad: number): string {
  return cantidad === 1 ? '1 unidad' : `${cantidad} unidades`;
}

/** Área, habitaciones, baños u ocupantes sin dato: la unidad principal nace así. */
export function unidadPorCompletar(unidad: UnidadInmueble): boolean {
  return [
    unidad.metros_cuadrados,
    unidad.numero_habitaciones,
    unidad.numero_banos,
    unidad.ocupantes_maximos,
  ].some((dato) => dato === null || dato === undefined);
}
