import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type FiltroPagos,
  listarMisPagos,
  listarPagos,
  obtenerPago,
  type PagoRespuesta,
  reportarPago,
} from '../api/pagos';
import type { AccionContrato } from '../contratos/acciones';
import { type FuenteDetalle, useAccionContrato } from '../contratos/useAccionContrato';
import { clavesContratos, STALE_TIME_CONTRATOS_MS, STALE_TIME_DOCUMENTOS_MS } from './contratos';
import { clavesInquilino } from './inquilino';

/** Pagos reportados por el inquilino en un contrato. Traen URLs firmadas: no se guardan en otro lado. */
export function useMisPagos(contratoId: string, habilitada = true) {
  return useQuery({
    queryKey: clavesInquilino.pagos(contratoId),
    queryFn: () => listarMisPagos(contratoId),
    staleTime: STALE_TIME_CONTRATOS_MS,
    enabled: habilitada,
  });
}

/**
 * Reportar un pago. Al terminar bien se vuelven a pedir los pagos, el estado de cuenta (el período
 * pasa a EN_REVISION) y el panel del contrato, más la lista de contratos (su estado de pago).
 */
export function useReportarPagoMutacion(contratoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: reportarPago,
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: clavesInquilino.pagos(contratoId) }),
        cliente.invalidateQueries({ queryKey: clavesInquilino.estadoCuenta(contratoId) }),
        cliente.invalidateQueries({ queryKey: clavesInquilino.panel(contratoId) }),
        cliente.invalidateQueries({ queryKey: clavesInquilino.contratos, exact: true }),
      ]);
    },
  });
}

// ---- Arrendador (E7-B) ----

/**
 * Los pagos del arrendador cuelgan de la clave "contratos" (como el detalle, los documentos y el
 * estado de cuenta): una sola invalidación tras aprobar o rechazar refresca la lista, el pago, el
 * estado de cuenta y el detalle del contrato.
 */
export const clavesPagos = {
  todos: clavesContratos.todos,
  lista: (estado: FiltroPagos) => ['contratos', 'pagos', 'lista', estado] as const,
  detalle: (id: string) => ['contratos', 'pagos', 'detalle', id] as const,
};

export function usePagos(estado: FiltroPagos) {
  return useQuery({
    queryKey: clavesPagos.lista(estado),
    queryFn: () => listarPagos(estado),
    staleTime: 30_000,
  });
}

/** La URL firmada del comprobante caduca: el pago no se considera fresco por mucho tiempo. */
export function usePago(id: string) {
  return useQuery({
    queryKey: clavesPagos.detalle(id),
    queryFn: () => obtenerPago(id),
    staleTime: STALE_TIME_DOCUMENTOS_MS,
  });
}

/**
 * De dónde lee `useAccionContrato` el pago para verificar tras "sin respuesta" y qué invalida. La
 * acción se aplicó si el pago, que estaba PENDIENTE, ya está en el estado esperado.
 */
export const FUENTE_PAGO: FuenteDetalle<PagoRespuesta> = {
  obtener: (id) => obtenerPago(id),
  claves: { todos: clavesPagos.todos, detalle: clavesPagos.detalle },
  huboCambio: (accion, antes, despues) => {
    if (antes.estado !== 'PENDIENTE') return false;
    if (accion === 'aprobarPago') return despues.estado === 'APROBADO';
    if (accion === 'rechazarPago') return despues.estado === 'RECHAZADO';
    return false;
  },
};

/** Aprobar o rechazar: doble toque bloqueado, éxito que refresca todo, "sin respuesta" verificado. */
export function useAccionPago(
  pagoId: string,
  accion: Extract<AccionContrato, 'aprobarPago' | 'rechazarPago'>,
) {
  return useAccionContrato<unknown, unknown, PagoRespuesta>(pagoId, accion, FUENTE_PAGO);
}
