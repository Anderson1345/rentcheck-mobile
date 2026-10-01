import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Vuelve a pedir los datos cada vez que la pantalla recupera el foco (volver de otra pestaña o de
 * una pantalla de la pila). El primer enfoque no cuenta: la consulta ya carga al montar. Así las
 * URLs firmadas de las fotos (1 hora) no se quedan viejas en pantallas que siguen montadas.
 */
export function useRefrescarAlEnfocar(refrescar: () => unknown): void {
  const primerEnfoque = useRef(true);
  const ultimoRefresco = useRef(refrescar);
  useEffect(() => {
    ultimoRefresco.current = refrescar;
  });

  useFocusEffect(
    useCallback(() => {
      if (primerEnfoque.current) {
        primerEnfoque.current = false;
        return;
      }
      void ultimoRefresco.current();
    }, []),
  );
}
