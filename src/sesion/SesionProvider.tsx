import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

import type { RespuestaAutenticacion } from '../api/auth';
import type { ControladorSesion } from './controlador';
import type { EstadoSesion, InstantaneaSesion } from './tipos';

const Contexto = createContext<ControladorSesion | null>(null);

interface Props {
  controlador: ControladorSesion;
  children: ReactNode;
}

/** Expone la sesión a las pantallas y la lee del llavero al montar. */
export function SesionProvider({ controlador, children }: Props) {
  useEffect(() => {
    void controlador.arrancar();
  }, [controlador]);

  return <Contexto.Provider value={controlador}>{children}</Contexto.Provider>;
}

export interface SesionActual extends InstantaneaSesion {
  iniciarSesion: (respuesta: RespuestaAutenticacion) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  /**
   * Estado ACTUAL de la sesión, leído del controlador en el momento de llamar (no del último render).
   * Sirve para los cleanup de efectos: el controlador publica antes de que React vuelva a
   * renderizar, y un desmontaje puede ocurrir en el mismo commit en que cambia la sesión.
   * No expone el token.
   */
  leerEstado: () => EstadoSesion;
}

export function useSesion(): SesionActual {
  const controlador = useContext(Contexto);
  if (!controlador) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  const instantanea = useSyncExternalStore(
    controlador.suscribir,
    controlador.obtener,
    controlador.obtener,
  );
  // Estable entre renders: se puede poner en las dependencias de un efecto.
  const leerEstado = useCallback(() => controlador.obtener().estado, [controlador]);
  return {
    ...instantanea,
    iniciarSesion: controlador.iniciarSesion,
    cerrarSesion: () => controlador.cerrarSesion(),
    leerEstado,
  };
}
