import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { marcarPortadaCambiada } from '../inmuebles/claveImagen';
import {
  actualizarInmueble,
  type ArchivoFoto,
  crearInmuebleConFoto,
  type DatosActualizarInmueble,
  type DatosCrearInmueble,
  listarInmuebles,
  obtenerInmueble,
  subirFotoPortada,
} from '../api/inmuebles';

/**
 * Las URLs firmadas de las portadas expiran en 1 hora: los datos se consideran viejos a los 2
 * minutos (máximo permitido: 5) y se vuelven a pedir al montar o al volver a la pantalla. La caché
 * vive solo en memoria: no se persiste (la URL firmada no debe quedar guardada).
 */
export const STALE_TIME_INMUEBLES_MS = 2 * 60_000;

export const clavesInmuebles = {
  todos: ['inmuebles'] as const,
  lista: ['inmuebles', 'lista'] as const,
  detalle: (id: string) => ['inmuebles', 'detalle', id] as const,
};

export function useInmuebles() {
  return useQuery({
    queryKey: clavesInmuebles.lista,
    queryFn: listarInmuebles,
    staleTime: STALE_TIME_INMUEBLES_MS,
  });
}

export function useInmueble(id: string) {
  return useQuery({
    queryKey: clavesInmuebles.detalle(id),
    queryFn: () => obtenerInmueble(id),
    staleTime: STALE_TIME_INMUEBLES_MS,
  });
}

/** Tras cualquier cambio, la lista y todos los detalles abiertos se vuelven a pedir. */
function useInvalidarInmuebles() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: clavesInmuebles.todos });
}

/**
 * Crea el inmueble y, si hay foto, la sube después. Si la foto falla el inmueble queda creado
 * (resultado con fotoSubida en false) y la lista se actualiza igual.
 */
export function useCrearInmueble() {
  const invalidar = useInvalidarInmuebles();
  return useMutation({
    mutationFn: ({ datos, foto }: { datos: DatosCrearInmueble; foto?: ArchivoFoto }) =>
      crearInmuebleConFoto(datos, foto),
    onSuccess: invalidar,
  });
}

export function useActualizarInmueble(id: string) {
  const invalidar = useInvalidarInmuebles();
  return useMutation({
    mutationFn: (cambios: DatosActualizarInmueble) => actualizarInmueble(id, cambios),
    onSuccess: invalidar,
  });
}

export function useSubirPortada(id: string) {
  const cliente = useQueryClient();
  const invalidar = useInvalidarInmuebles();
  return useMutation({
    mutationFn: (foto: ArchivoFoto) => subirFotoPortada(id, foto),
    onSuccess: (inmueble) => {
      // La respuesta ya trae el inmueble con la portada nueva: se ve al instante, sin esperar al refresco.
      // La ruta de la foto no cambia al reemplazarla: se renueva la clave de caché de la imagen.
      marcarPortadaCambiada(id);
      if (inmueble?.id) cliente.setQueryData(clavesInmuebles.detalle(id), inmueble);
      return invalidar();
    },
  });
}
