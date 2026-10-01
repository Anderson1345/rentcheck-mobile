import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from 'react';

import type { RespuestaAutenticacion } from '../api/auth';
import type { ControladorSesion } from './controlador';
import type { InstantaneaSesion } from './tipos';

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
}

export function useSesion(): SesionActual {
  const controlador = useContext(Contexto);
  if (!controlador) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  const instantanea = useSyncExternalStore(
    controlador.suscribir,
    controlador.obtener,
    controlador.obtener,
  );
  return {
    ...instantanea,
    iniciarSesion: controlador.iniciarSesion,
    cerrarSesion: () => controlador.cerrarSesion(),
  };
}
