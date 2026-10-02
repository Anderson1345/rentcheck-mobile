import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ContratoDetalle,
  crearContrato,
  listarContratos,
  listarDocumentos,
  obtenerEstadoCuenta,
  listarInquilinos,
  obtenerContrato,
  regenerarCodigo,
} from '../api/contratos';
import type { CuerpoCrearContrato } from '../contratos/cuerpo';

/** Máximo permitido: 5 min. */
export const STALE_TIME_CONTRATOS_MS = 2 * 60_000;

/** Las URLs firmadas de los documentos caducan: máximo 1 minuto. */
export const STALE_TIME_DOCUMENTOS_MS = 60_000;

export const clavesContratos = {
  estadoCuenta: (id: string) => ['contratos', 'estado-cuenta', id] as const,
  documentos: (id: string) => ['contratos', 'documentos', id] as const,
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

export function useDocumentos(id: string) {
  return useQuery({
    queryKey: clavesContratos.documentos(id),
    queryFn: () => listarDocumentos(id),
    staleTime: STALE_TIME_DOCUMENTOS_MS,
  });
}

/** Tras regenerar, el detalle muestra de inmediato el código nuevo y la lista se vuelve a pedir. */
export function useRegenerarCodigo(id: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () => regenerarCodigo(id),
    onSuccess: (codigo) => {
      cliente.setQueryData<ContratoDetalle>(clavesContratos.detalle(id), (actual) =>
        actual ? { ...actual, codigo_acceso: codigo } : actual,
      );
      // Solo la lista: el detalle ya tiene el código nuevo (no hace falta volver a pedirlo).
      void cliente.invalidateQueries({ queryKey: clavesContratos.todos, exact: true });
    },
  });
}

export function useEstadoCuenta(id: string) {
  return useQuery({
    queryKey: clavesContratos.estadoCuenta(id),
    queryFn: () => obtenerEstadoCuenta(id),
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}
