import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mensajeDeErrorEstadoSolicitud } from '../api/errores';
import {
  crearSolicitud,
  type FiltrosSolicitudes,
  listarMisSolicitudes,
  listarSolicitudes,
  obtenerMiSolicitud,
  obtenerSolicitud,
  type SolicitudArrendador,
} from '../api/mantenimiento';
import type { AccionContrato } from '../contratos/acciones';
import { type FuenteDetalle, useAccionContrato } from '../contratos/useAccionContrato';
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

/**
 * Las solicitudes del contrato. El estado cambia desde el arrendador: la alerta de B0.6-B2 avisa (campana),
 * pero la lista no se actualiza sola; se refresca al abrir.
 */
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

// ---- Arrendador (E8-B) ----

/**
 * Cuelgan de su propia raíz, "arrendador": una invalidación del portal del inquilino no las toca y el
 * cierre de sesión (que vacía toda la caché) sí las alcanza. La lista lleva los filtros del servidor
 * (urgencia y unidad); el estado se filtra en la app.
 */
export const clavesSolicitudes = {
  todos: ['arrendador', 'solicitudes'] as const,
  lista: (filtros: FiltrosSolicitudes) =>
    [
      'arrendador',
      'solicitudes',
      'lista',
      { urgencia: filtros.urgencia ?? null, unidadId: filtros.unidadId ?? null },
    ] as const,
  detalle: (id: string) => ['arrendador', 'solicitudes', 'detalle', id] as const,
};

/**
 * UNA lista sin filtro de estado: los segmentos y sus contadores se calculan en la app. Sin
 * paginación (B-72). El estado cambia desde otros dispositivos (y las alertas nuevas llegan por la
 * campana): la lista se refresca al abrir.
 */
export function useSolicitudes(filtros: FiltrosSolicitudes) {
  return useQuery({
    queryKey: clavesSolicitudes.lista(filtros),
    queryFn: () => listarSolicitudes(filtros),
    staleTime: 30_000,
  });
}

/** La URL firmada del adjunto caduca en 1 hora: se vuelve a pedir siempre al abrir la pantalla. */
export function useSolicitud(id: string) {
  return useQuery({
    queryKey: clavesSolicitudes.detalle(id),
    queryFn: () => obtenerSolicitud(id),
    staleTime: STALE_TIME_DOCUMENTOS_MS,
    refetchOnMount: 'always',
  });
}

/**
 * De dónde lee `useAccionContrato` la solicitud para verificar tras "sin respuesta" y qué invalida
 * (todas las listas y el detalle). La acción se aplicó si la solicitud estaba en el estado de origen
 * y ahora está en el esperado; si ya estaba en otro estado, no.
 */
export const FUENTE_SOLICITUD: FuenteDetalle<SolicitudArrendador> = {
  obtener: (id) => obtenerSolicitud(id),
  claves: { todos: clavesSolicitudes.todos, detalle: clavesSolicitudes.detalle },
  huboCambio: (accion, antes, despues) => {
    if (accion === 'iniciarSolicitud') {
      return antes.estado === 'PENDIENTE' && despues.estado === 'EN_PROCESO';
    }
    if (accion === 'resolverSolicitud') {
      return (
        (antes.estado === 'PENDIENTE' || antes.estado === 'EN_PROCESO') &&
        despues.estado === 'RESUELTO'
      );
    }
    return false;
  },
  mensajeError: mensajeDeErrorEstadoSolicitud,
};

/** Marcar en proceso o resuelta: doble toque bloqueado, éxito que refresca todo, "sin respuesta" verificado. */
export function useAccionSolicitud(
  solicitudId: string,
  accion: Extract<AccionContrato, 'iniciarSolicitud' | 'resolverSolicitud'>,
) {
  return useAccionContrato<unknown, unknown, SolicitudArrendador>(
    solicitudId,
    accion,
    FUENTE_SOLICITUD,
  );
}
