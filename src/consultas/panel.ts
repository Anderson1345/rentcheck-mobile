import { useQuery } from '@tanstack/react-query';

import { obtenerPanelArrendador } from '../api/panel';

/**
 * Cuelga de la raíz "arrendador": el cierre de sesión (que vacía toda la caché) la alcanza y nunca se
 * mezcla con las claves del portal del inquilino.
 */
export const clavesPanel = {
  todos: ['arrendador', 'panel'] as const,
};

/**
 * El Panel. Se refresca al enfocar la pestaña (si ya está viejo), al arrastrar y cuando cambian los datos
 * que lo alimentan (ver `crearClienteDeConsultas`); no hay intervalo. La insignia de la pestaña Pagos
 * lee esta misma consulta, así que Panel e insignia nunca se contradicen.
 */
export function usePanelArrendador() {
  return useQuery({
    queryKey: clavesPanel.todos,
    queryFn: obtenerPanelArrendador,
    staleTime: 30_000,
  });
}
