// Excepción documentada: faltan esquemas en OpenAPI (B-57). La respuesta de las fotos de inventario
// se escribe a mano según rentcheck-backend (foto-inventario.service.ts).

import { api } from './cliente';
import type { ArchivoFoto } from './inmuebles';

export type Momento = 'ENTREGA' | 'DEVOLUCION';

export interface FotoInventario {
  id: string;
  contrato_id: string;
  unidad_id: string;
  momento: Momento;
  zona: string;
  creado_en: string;
  /** URL firmada (caduca): nunca se guarda; se vuelve a pedir la lista. null si no se pudo firmar. */
  foto_url: string | null;
}

/** Sin Idempotency-Key ni restricción de estado del contrato: el cliente evita los duplicados. */
export const subirFotoInventario = (
  contratoId: string,
  foto: ArchivoFoto,
  momento: Momento,
  zona: string,
) =>
  api.subirArchivo<FotoInventario>(
    `/contratos/${encodeURIComponent(contratoId)}/fotos-inventario`,
    'foto',
    foto,
    { momento, zona },
  );

export const listarFotosInventario = (contratoId: string, momento: Momento) =>
  api.get<FotoInventario[]>(
    `/contratos/${encodeURIComponent(contratoId)}/fotos-inventario?momento=${momento}`,
  );
