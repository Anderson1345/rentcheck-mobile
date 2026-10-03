import { QueryClient } from '@tanstack/react-query';

import { ErrorApi, ErrorTimeout } from '../api/cliente';
import { clavesPanel } from './panel';

const MAX_REINTENTOS = 2;

/**
 * Reintentos de las consultas: nunca ante un error 4xx (la API ya respondió y repetir
 * no lo cambia), ni ante un tiempo agotado (ya esperó hasta 60 s; el usuario decide
 * reintentar). Sí ante fallos de red y 5xx, hasta MAX_REINTENTOS veces.
 */
export function debeReintentar(intentosFallidos: number, error: unknown): boolean {
  if (error instanceof ErrorApi && error.status >= 400 && error.status < 500) return false;
  if (error instanceof ErrorTimeout) return false;
  return intentosFallidos < MAX_REINTENTOS;
}

/**
 * ¿Esta consulta es de lo que alimenta el Panel del arrendador? Contratos y pagos (raíz "contratos"),
 * inmuebles y unidades (raíz "inmuebles") y solicitudes de mantenimiento ("arrendador", "solicitudes").
 */
function alimentaAlPanel(clave: readonly unknown[]): boolean {
  return (
    clave[0] === 'contratos' ||
    clave[0] === 'inmuebles' ||
    (clave[0] === 'arrendador' && clave[1] === 'solicitudes')
  );
}

export function crearClienteDeConsultas(): QueryClient {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: {
        retry: debeReintentar,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

  // Aprobar un pago, aplicar un incremento, crear un contrato, cambiar una solicitud… ya invalidan sus
  // propias consultas. Con eso el Panel (y la insignia de Pagos, que lee la misma consulta) también se
  // refresca, sin que cada mutación tenga que acordarse de él. `cancelRefetch: false`: si varias
  // consultas se invalidan juntas, se pide un solo refresco y no uno por consulta.
  cliente.getQueryCache().subscribe((evento) => {
    if (
      evento.type === 'updated' &&
      evento.action.type === 'invalidate' &&
      alimentaAlPanel(evento.query.queryKey)
    ) {
      void cliente.invalidateQueries({ queryKey: clavesPanel.todos }, { cancelRefetch: false });
    }
  });

  return cliente;
}
