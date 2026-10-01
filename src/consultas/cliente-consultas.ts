import { QueryClient } from '@tanstack/react-query';

import { ErrorApi, ErrorTimeout } from '../api/cliente';

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

export function crearClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: debeReintentar,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
