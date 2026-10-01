import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

interface ConsultaRefrescable {
  /** Los datos ya pasaron su staleTime (lo calcula TanStack Query). */
  isStale: boolean;
  isError: boolean;
  refetch: () => unknown;
}

/**
 * Al volver a enfocar la pantalla (otra pestaña, o volver desde la pila) refresca SOLO si hace
 * falta: cuando los datos ya están viejos según el staleTime de la consulta, o si la última
 * petición falló. Con datos frescos no hay petición ni cambio de URLs firmadas, así que las
 * imágenes no parpadean. Las mutaciones ya invalidan la caché, por eso no se pierde ninguna
 * actualización. El primer enfoque no cuenta: la consulta carga al montar.
 */
export function useRefrescarAlEnfocar(consulta: ConsultaRefrescable): void {
  const primerEnfoque = useRef(true);
  const ultima = useRef(consulta);
  useEffect(() => {
    ultima.current = consulta;
  });

  useFocusEffect(
    useCallback(() => {
      if (primerEnfoque.current) {
        primerEnfoque.current = false;
        return;
      }
      const { isStale, isError, refetch } = ultima.current;
      if (isStale || isError) void refetch();
    }, []),
  );
}
