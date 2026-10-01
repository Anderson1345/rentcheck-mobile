import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { ErrorApi } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import type { Inmueble } from '../../api/inmuebles';
import { useInmueble } from '../../consultas/inmuebles';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { PantallaPila } from '../PantallaPila';

interface Props {
  id: string;
  /** Contenido cuando el inmueble ya cargó. */
  children: (inmueble: Inmueble) => ReactNode;
  /** Mensaje del "No encontrado" (por ejemplo, si falta la unidad dentro del inmueble). */
  faltaAlgo?: (inmueble: Inmueble) => boolean;
}

/** Carga el inmueble y resuelve cargando, "No encontrado" (404) y errores con Reintentar. */
export function ConInmueble({ id, children, faltaAlgo }: Props) {
  const router = useRouter();
  const { data: inmueble, isPending, isError, error, refetch } = useInmueble(id);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/inmuebles');
  }

  if (inmueble === undefined && isPending) {
    return (
      <PantallaPila>
        <EsqueletoCarga filas={3} />
      </PantallaPila>
    );
  }
  const noEncontrado =
    (inmueble === undefined && isError && error instanceof ErrorApi && error.status === 404) ||
    (inmueble !== undefined && faltaAlgo?.(inmueble) === true);
  if (noEncontrado) {
    return (
      <PantallaPila>
        <EstadoMensaje titulo="No encontrado" mensaje="Esto no existe o no tienes acceso a ello.">
          <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
        </EstadoMensaje>
      </PantallaPila>
    );
  }
  if (inmueble === undefined) {
    return (
      <PantallaPila>
        <Aviso mensaje={mensajeDeError(error)} />
        <Boton
          titulo="Reintentar"
          variante="secundario"
          ancho="completo"
          onPress={() => void refetch()}
        />
      </PantallaPila>
    );
  }
  return <>{children(inmueble)}</>;
}
