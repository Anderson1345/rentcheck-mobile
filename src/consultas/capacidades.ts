import { useQuery } from '@tanstack/react-query';

import { type Capacidades, obtenerCapacidades } from '../api/auth';

const TODO_APAGADO: Capacidades = { verificacion_correo: false, recuperacion_contrasena: false };

/**
 * Qué funciones dependen del proveedor de correo (verificación y recuperación de contraseña).
 * Mientras carga, si falla o si responde algo inesperado, se asume que ambas están apagadas: se
 * ocultan esas funciones, pero NUNCA se bloquea el acceso por esto.
 */
export function useCapacidades(): Capacidades {
  const { data } = useQuery({
    queryKey: ['capacidades'],
    queryFn: obtenerCapacidades,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!data || typeof data !== 'object') return TODO_APAGADO;
  return {
    verificacion_correo: data.verificacion_correo === true,
    recuperacion_contrasena: data.recuperacion_contrasena === true,
  };
}
