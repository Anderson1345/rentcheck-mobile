import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { crearSolicitud, listarMisSolicitudes, obtenerMiSolicitud } from '../api/mantenimiento';
import { STALE_TIME_DOCUMENTOS_MS } from './contratos';
import { clavesInquilino } from './inquilino';

/**
 * Cuelgan de "inquilino" (como todo el portal): una invalidación general, el cambio de sesión y el
 * cierre de sesión las alcanzan. La lista lleva el contrato (un contrato jamás muestra la caché de
 * otro) y el detalle, el id de la solicitud.
 */
export const clavesMantenimiento = {
  todos: [...clavesInquilino.todos, 'solicitudes'] as const,
  lista: (contratoId: string) =>
    [...clavesInquilino.todos, 'solicitudes', 'lista', contratoId] as const,
  detalle: (id: string) => [...clavesInquilino.todos, 'solicitudes', 'detalle', id] as const,
};

/** Las solicitudes del contrato. El estado cambia desde el arrendador y no hay alertas (B-18): se refresca al abrir. */
export function useMisSolicitudes(contratoId: string | null) {
  return useQuery({
    queryKey: clavesMantenimiento.lista(contratoId ?? ''),
    queryFn: () => listarMisSolicitudes(contratoId ?? ''),
    enabled: contratoId !== null,
    staleTime: 30_000,
  });
}

/**
 * Una solicitud con su adjunto. La URL firmada caduca en 1 hora: se vuelve a pedir al abrir la
 * pantalla y no se guarda en otro lado.
 */
export function useMiSolicitud(id: string) {
  return useQuery({
    queryKey: clavesMantenimiento.detalle(id),
    queryFn: () => obtenerMiSolicitud(id),
    staleTime: STALE_TIME_DOCUMENTOS_MS,
    refetchOnMount: 'always',
  });
}

/** Crear una solicitud. Al terminar bien se vuelve a pedir la lista del contrato. */
export function useCrearSolicitudMutacion(contratoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: crearSolicitud,
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavesMantenimiento.lista(contratoId) }),
  });
}
