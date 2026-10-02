import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { ErrorApi } from '../api/cliente';
import type { ArchivoFoto } from '../api/inmuebles';
import {
  actualizarPerfilInquilino,
  type ContratoInquilinoDetalle,
  listarContratosInquilino,
  obtenerContratoInquilino,
  obtenerEstadoCuentaInquilino,
  obtenerPanelInquilino,
  obtenerPerfilInquilino,
  subirFotoCedulaInquilino,
} from '../api/inquilino';
import type { FuenteDetalle } from '../contratos/useAccionContrato';
import { STALE_TIME_CONTRATOS_MS } from './contratos';

/**
 * Todas empiezan por "inquilino" (nunca chocan con las del arrendador) y las de un contrato llevan
 * su id: un contrato jamás muestra los datos en caché de otro.
 */
export const clavesInquilino = {
  todos: ['inquilino'] as const,
  contratos: ['inquilino', 'contratos'] as const,
  panel: (id: string) => ['inquilino', 'contrato', id, 'panel'] as const,
  detalle: (id: string) => ['inquilino', 'contrato', id, 'detalle'] as const,
  estadoCuenta: (id: string) => ['inquilino', 'contrato', id, 'estado-cuenta'] as const,
  pagos: (id: string) => ['inquilino', 'contrato', id, 'pagos'] as const,
};

export function useContratosInquilino() {
  return useQuery({
    queryKey: clavesInquilino.contratos,
    queryFn: listarContratosInquilino,
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}

export function usePanelInquilino(id: string, habilitada = true) {
  return useQuery({
    queryKey: clavesInquilino.panel(id),
    queryFn: () => obtenerPanelInquilino(id),
    staleTime: STALE_TIME_CONTRATOS_MS,
    enabled: habilitada,
  });
}

/** `habilitada` en false evita pedir el detalle (p. ej. el de un contrato PROGRAMADO sin recaudo). */
export function useContratoInquilino(id: string, habilitada = true) {
  return useQuery({
    queryKey: clavesInquilino.detalle(id),
    queryFn: () => obtenerContratoInquilino(id),
    staleTime: STALE_TIME_CONTRATOS_MS,
    enabled: habilitada,
  });
}

export function useEstadoCuentaInquilino(id: string, habilitada = true) {
  return useQuery({
    queryKey: clavesInquilino.estadoCuenta(id),
    queryFn: () => obtenerEstadoCuentaInquilino(id),
    staleTime: STALE_TIME_CONTRATOS_MS,
    enabled: habilitada,
  });
}

/** El servidor responde 404 igual para un contrato ajeno, desvinculado o cancelado. */
export function esNoEncontrado(error: unknown): boolean {
  return error instanceof ErrorApi && error.status === 404;
}

/**
 * Un 404 en un contrato significa que ya no es del inquilino: se vuelve a pedir la lista de
 * contratos (el seleccionado cae al primero que quede) y la pantalla muestra "No encontramos este
 * contrato". Devuelve si el error es un 404.
 */
export function useRefrescarSiNoEncontrado(error: unknown): boolean {
  const cliente = useQueryClient();
  const noEncontrado = esNoEncontrado(error);
  useEffect(() => {
    if (noEncontrado) {
      void cliente.invalidateQueries({ queryKey: clavesInquilino.contratos, exact: true });
    }
  }, [noEncontrado, cliente]);
  return noEncontrado;
}

/** Tras vincular un contrato: la lista se vuelve a pedir. La función es estable (va en efectos). */
export function useRefrescarContratosInquilino() {
  const cliente = useQueryClient();
  return useCallback(
    () => cliente.invalidateQueries({ queryKey: clavesInquilino.contratos, exact: true }),
    [cliente],
  );
}

/**
 * Detalle de Mi contrato para las acciones: lo lee y lo invalida con las claves del portal (detalle,
 * panel, lista, estado de cuenta), nunca con las del arrendador.
 */
export const FUENTE_INQUILINO: FuenteDetalle<ContratoInquilinoDetalle> = {
  obtener: (id) => obtenerContratoInquilino(id),
  claves: { todos: clavesInquilino.todos, detalle: clavesInquilino.detalle },
};

/** El detalle del portal con el aislamiento por 404 (refresca la lista de contratos). */
export function useDetalleInquilino(id: string) {
  const consulta = useContratoInquilino(id);
  useRefrescarSiNoEncontrado(consulta.error);
  return consulta;
}

// ---- Perfil. Clave fuera de "inquilino": las acciones de contrato no vuelven a pedir la foto. ----

/** La URL firmada de la cédula dura 1 hora y solo vive en la caché en memoria de la consulta. */
export const clavePerfilInquilino = ['perfil-inquilino'] as const;

export function usePerfilInquilino() {
  return useQuery({
    queryKey: clavePerfilInquilino,
    queryFn: obtenerPerfilInquilino,
    staleTime: STALE_TIME_CONTRATOS_MS,
  });
}

export function useActualizarPerfilInquilino() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (cambios: { nombre?: string; telefono?: string }) =>
      actualizarPerfilInquilino(cambios),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavePerfilInquilino }),
  });
}

export function useSubirFotoCedulaInquilino() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (foto: ArchivoFoto) => subirFotoCedulaInquilino(foto),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavePerfilInquilino }),
  });
}
