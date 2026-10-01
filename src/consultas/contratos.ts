import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ContratoDetalle,
  crearContrato,
  listarContratos,
  listarInquilinos,
  obtenerContrato,
} from '../api/contratos';
import type { CuerpoCrearContrato } from '../contratos/cuerpo';

/** Máximo permitido: 5 min. */
export const STALE_TIME_CONTRATOS_MS = 2 * 60_000;

export const clavesContratos = {
  todos: ['contratos'] as const,
  detalle: (id: string) => ['contratos', 'detalle', id] as const,
  inquilinos: ['inquilinos'] as const,
};

export function useContratos() {
  return useQuery({
    queryKey: clavesContratos.todos,
    queryFn: listarContratos,
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: clavesContratos.detalle(id),
    queryFn: () => obtenerContrato(id),
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}

export function useInquilinos() {
  return useQuery({
    queryKey: clavesContratos.inquilinos,
    queryFn: listarInquilinos,
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}

/** Al crear, la lista de contratos y los inquilinos (puede haber uno nuevo) se vuelven a pedir. */
export function useRefrescarTrasCrear() {
  const cliente = useQueryClient();
  return async (creado?: ContratoDetalle) => {
    if (creado?.id) cliente.setQueryData(clavesContratos.detalle(creado.id), creado);
    await Promise.all([
      cliente.invalidateQueries({ queryKey: clavesContratos.todos }),
      cliente.invalidateQueries({ queryKey: clavesContratos.inquilinos }),
    ]);
  };
}

export function useCrearContrato() {
  const refrescar = useRefrescarTrasCrear();
  return useMutation({
    mutationFn: (cuerpo: CuerpoCrearContrato) => crearContrato(cuerpo),
    // Sin esperar el refresco: la pantalla pasa de inmediato al éxito.
    onSuccess: (creado) => {
      void refrescar(creado);
    },
  });
}
