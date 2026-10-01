import { useEffect, useRef, useState } from 'react';

import { type ContratoVinculado, vincularContrato } from '../api/auth';
import { mensajeDeErrorVinculacion } from '../api/errores';
import { consumirCodigoPendiente, hayCodigoPendiente } from './codigoPendiente';

export type ResultadoVinculacion =
  | { estado: 'ninguno' }
  | { estado: 'vinculando' }
  | { estado: 'vinculado'; contrato: ContratoVinculado }
  | { estado: 'error'; mensaje: string };

/**
 * Tras iniciar sesión como inquilino, vincula el contrato del código que quedó pendiente (el caso
 * "ya tengo cuenta"). El código se consume al empezar: sea cual sea el resultado, no se reintenta
 * solo ni se vuelve a usar. La pantalla real "Agregar contrato con código" (E6) reutilizará
 * `vincularContrato`.
 */
export function useVincularPendiente(): ResultadoVinculacion {
  const [resultado, setResultado] = useState<ResultadoVinculacion>(() =>
    hayCodigoPendiente() ? { estado: 'vinculando' } : { estado: 'ninguno' },
  );

  // Hay una petición en curso (sobrevive al doble efecto de StrictMode, que repite el efecto).
  const enCurso = useRef(false);

  useEffect(() => {
    const codigo = consumirCodigoPendiente();
    if (codigo === null) {
      // El código ya no existe: sin petición en curso no hay nada que esperar.
      if (!enCurso.current) setResultado({ estado: 'ninguno' });
      return;
    }
    enCurso.current = true;
    vincularContrato(codigo).then(
      (contrato) => setResultado({ estado: 'vinculado', contrato }),
      (error: unknown) =>
        setResultado({ estado: 'error', mensaje: mensajeDeErrorVinculacion(error) }),
    );
  }, []);

  return resultado;
}
