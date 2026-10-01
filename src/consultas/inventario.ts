import { useQuery } from '@tanstack/react-query';

import { listarFotosInventario, type Momento } from '../api/inventario';

/** Las URLs firmadas caducan: se consideran viejas a los 2 minutos (máximo permitido: 5). */
export const STALE_TIME_INVENTARIO_MS = 2 * 60_000;

export function useFotosInventario(contratoId: string, momento: Momento) {
  return useQuery({
    queryKey: ['inventario', contratoId, momento] as const,
    queryFn: () => listarFotosInventario(contratoId, momento),
    staleTime: STALE_TIME_INVENTARIO_MS,
  });
}
