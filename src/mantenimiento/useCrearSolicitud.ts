import { useRef, useState } from 'react';

import { ErrorApi, ErrorCancelado } from '../api/cliente';
import { mensajeDeErrorSolicitud } from '../api/errores';
import type { SolicitudCreada, UrgenciaSolicitud } from '../api/mantenimiento';
import { useCrearSolicitudMutacion } from '../consultas/mantenimiento';
import type { AdjuntoElegido } from '../utilidades/adjuntoSolicitud';
import { BorradorIdempotente } from '../utilidades/borradorIdempotente';

export interface DatosEnvio {
  unidadId: string;
  /** Ya recortada y validada. */
  descripcion: string;
  urgencia: UrgenciaSolicitud;
  /** Un solo adjunto, ya preparado (la foto reducida o el video tal cual); null si no hay. */
  adjunto: AdjuntoElegido | null;
}

type Fase = 'inactivo' | 'enviando' | 'exito';

/**
 * Crea una solicitud sin riesgo de duplicarla: el doble toque no repite la llamada y cada borrador
 * usa UNA clave de idempotencia (ver BorradorIdempotente). Tras "sin respuesta" no se da el éxito por
 * hecho ni se reenvía solo: la persona reintenta con los mismos datos y el mismo adjunto, y el
 * servidor devuelve la misma solicitud. 422 (clave reutilizada con otro contenido) regenera la clave;
 * 409 SOLICITUD_EN_PROCESO solo informa. Cancelar aborta la subida y no es un error de red.
 */
export function useCrearSolicitud(contratoId: string) {
  const mutacion = useCrearSolicitudMutacion(contratoId);
  const [borrador] = useState(() => new BorradorIdempotente());
  const enCurso = useRef(false);
  const controlador = useRef<AbortController | null>(null);
  const [fase, setFase] = useState<Fase>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState(false);
  /** 0 a 1 mientras sube un adjunto; null sin adjunto o sin envío en curso. */
  const [progreso, setProgreso] = useState<number | null>(null);
  const [creada, setCreada] = useState<SolicitudCreada | null>(null);

  async function enviar(datos: DatosEnvio) {
    if (enCurso.current) return;
    enCurso.current = true;
    const abortar = new AbortController();
    controlador.current = abortar;
    setFase('enviando');
    setError(null);
    setCancelado(false);
    setProgreso(datos.adjunto ? 0 : null);
    try {
      const claveIdempotencia = borrador.claveParaEnvio(
        [datos.unidadId, datos.descripcion, datos.urgencia],
        datos.adjunto?.uri,
      );
      const solicitud = await mutacion.mutateAsync({
        unidadId: datos.unidadId,
        descripcion: datos.descripcion,
        urgencia: datos.urgencia,
        adjunto: datos.adjunto,
        claveIdempotencia,
        alProgreso: (enviados, totales) => setProgreso(totales > 0 ? enviados / totales : 0),
        senal: abortar.signal,
      });
      // Solicitud nueva, clave nueva (aunque el contenido se repita).
      borrador.reiniciar();
      setCreada(solicitud);
      setFase('exito');
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.codigo === 'IDEMPOTENCY_KEY_REUTILIZADA') {
        borrador.reiniciar();
      }
      setFase('inactivo');
      if (falla instanceof ErrorCancelado) setCancelado(true);
      else setError(mensajeDeErrorSolicitud(falla));
    } finally {
      enCurso.current = false;
      controlador.current = null;
      setProgreso(null);
    }
  }

  /** Aborta la subida en curso; el envío termina con "Envío cancelado." */
  function cancelar() {
    controlador.current?.abort();
  }

  return { fase, error, cancelado, progreso, creada, enviar, cancelar };
}
