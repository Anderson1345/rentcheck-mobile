import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listarMisPagos, reportarPago } from '../api/pagos';
import { STALE_TIME_CONTRATOS_MS } from './contratos';
import { clavesInquilino } from './inquilino';

/** Pagos reportados por el inquilino en un contrato (las URLs firmadas de la respuesta no se usan). */
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
