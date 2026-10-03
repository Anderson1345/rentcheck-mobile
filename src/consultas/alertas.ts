import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  marcarAlertaLeida,
  marcarTodasLeidas,
  obtenerConteoAlertas,
  obtenerFeedAlertas,
  type RolAlertas,
} from '../api/alertas';

/**
 * Cuelgan de la raíz del ROL ("arrendador" o "inquilino"): el cierre de sesión (que vacía toda la
 * caché), las invalidaciones generales del portal del inquilino y el cambio de cuenta las alcanzan, y
 * nunca se mezclan las alertas de un rol con las del otro.
 */
export const clavesAlertas = {
  todos: (rol: RolAlertas) => [rol, 'alertas'] as const,
  feed: (rol: RolAlertas) => [rol, 'alertas', 'feed'] as const,
  conteo: (rol: RolAlertas) => [rol, 'alertas', 'conteo'] as const,
};

const STALE_TIME_ALERTAS_MS = 30_000;

/**
 * El feed por cursor: cada página trae `siguiente_cursor` (null en la última) y `no_leidas` (total del
 * usuario, no de la página). Es el primer `useInfiniteQuery` de la app.
 */
export function useFeedAlertas(rol: RolAlertas) {
  return useInfiniteQuery({
    queryKey: clavesAlertas.feed(rol),
    queryFn: ({ pageParam }) => obtenerFeedAlertas(rol, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguiente_cursor ?? undefined,
    staleTime: STALE_TIME_ALERTAS_MS,
  });
}

/** El conteo de la campana. Se refresca al enfocar y al volver la app a primer plano, sin intervalo. */
export function useConteoAlertas(rol: RolAlertas) {
  return useQuery({
    queryKey: clavesAlertas.conteo(rol),
    queryFn: () => obtenerConteoAlertas(rol),
    staleTime: STALE_TIME_ALERTAS_MS,
  });
}

/** Tras marcar, el feed y el conteo del rol vuelven a pedirse (la lista y la campana se actualizan). */
function useInvalidarAlertas(rol: RolAlertas) {
  const cliente = useQueryClient();
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: clavesAlertas.feed(rol) }),
      cliente.invalidateQueries({ queryKey: clavesAlertas.conteo(rol) }),
    ]);
}

export function useMarcarAlertaLeida(rol: RolAlertas) {
  const invalidar = useInvalidarAlertas(rol);
  return useMutation({
    mutationFn: (id: string) => marcarAlertaLeida(rol, id),
    onSuccess: invalidar,
  });
}

export function useMarcarTodasLeidas(rol: RolAlertas) {
  const invalidar = useInvalidarAlertas(rol);
  return useMutation({
    mutationFn: () => marcarTodasLeidas(rol),
    onSuccess: invalidar,
  });
}
