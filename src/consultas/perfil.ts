import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ArchivoFoto } from '../api/inmuebles';
import {
  actualizarPerfil,
  type DatosActualizarPerfil,
  obtenerPerfil,
  subirFotoCedula,
} from '../api/perfil';

/** Máximo permitido: 5 min. La URL firmada de la cédula dura 1 hora y solo vive en memoria. */
export const STALE_TIME_PERFIL_MS = 2 * 60_000;

export const clavePerfil = ['perfil'] as const;

export function usePerfil() {
  return useQuery({
    queryKey: clavePerfil,
    queryFn: obtenerPerfil,
    staleTime: STALE_TIME_PERFIL_MS,
  });
}

export function useActualizarPerfil() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (cambios: DatosActualizarPerfil) => actualizarPerfil(cambios),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavePerfil }),
  });
}

export function useSubirFotoCedula() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (foto: ArchivoFoto) => subirFotoCedula(foto),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavePerfil }),
  });
}
