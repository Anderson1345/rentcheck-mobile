import { useState } from 'react';

import { detalleTecnico, mensajeDeErrorFoto } from '../../api/errores';
import type { ArchivoFoto } from '../../api/inmuebles';

export interface ErrorSubida {
  mensaje: string;
  /** Resumen saneado ("HTTP 415 · ERROR_415"): sin URLs, tokens ni rutas. */
  detalle: string | null;
}

/**
 * Subida de una foto elegida: la foto queda como vista previa local mientras sube; si falla se
 * guarda el error y se puede reintentar con la misma foto. Nada se persiste.
 */
export function useSubidaFoto(subir: (foto: ArchivoFoto) => Promise<unknown>) {
  const [pendiente, setPendiente] = useState<ArchivoFoto | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<ErrorSubida | null>(null);

  async function elegir(foto: ArchivoFoto): Promise<boolean> {
    if (subiendo) return false;
    setPendiente(foto);
    setError(null);
    setSubiendo(true);
    try {
      await subir(foto);
      setPendiente(null);
      return true;
    } catch (falla) {
      setError({ mensaje: mensajeDeErrorFoto(falla), detalle: detalleTecnico(falla) });
      return false;
    } finally {
      setSubiendo(false);
    }
  }

  return {
    pendiente,
    subiendo,
    error,
    elegir,
    reintentar: () => (pendiente ? elegir(pendiente) : Promise.resolve(false)),
  };
}
