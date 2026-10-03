import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface ConsultaRefrescable {
  /** Los datos ya pasaron su staleTime (lo calcula TanStack Query). */
  isStale: boolean;
  isError: boolean;
  refetch: () => unknown;
}

/**
 * Al volver la app a primer plano (venía de segundo plano o de "inactiva") refresca la consulta SOLO
 * si hace falta: con datos viejos según su staleTime o si la última petición falló. Así volver de la
 * cámara o de la galería, que también pasan por "inactiva", no dispara una petición cada vez. No hay
 * intervalo: el aviso de lo nuevo en segundo plano es de las notificaciones push (E10).
 */
export function useRefrescarAlVolverAPrimerPlano(consulta: ConsultaRefrescable): void {
  const ultima = useRef(consulta);
  useEffect(() => {
    ultima.current = consulta;
  });

  useEffect(() => {
    let anterior: AppStateStatus = AppState.currentState;
    const suscripcion = AppState.addEventListener('change', (estado) => {
      const volvio = anterior !== 'active' && estado === 'active';
      anterior = estado;
      if (!volvio) return;
      const { isStale, isError, refetch } = ultima.current;
      if (isStale || isError) void refetch();
    });
    return () => suscripcion.remove();
  }, []);
}
