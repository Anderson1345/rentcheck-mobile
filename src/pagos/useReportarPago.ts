import { useRef, useState } from 'react';

import { ErrorApi } from '../api/cliente';
import { mensajeDeErrorPago } from '../api/errores';
import { useReportarPagoMutacion } from '../consultas/pagos';
import type { Comprobante } from '../utilidades/comprobante';
import { BorradorIdempotente } from './reglas';

export interface DatosEnvio {
  /** "AAAA-MM-DD", primer día del mes. */
  periodo: string;
  montoCentavos: number;
  fechaReportada: string;
  comprobante: Comprobante;
}

type Fase = 'inactivo' | 'enviando' | 'exito';

/**
 * Reporta un pago sin riesgo de duplicarlo: el doble toque no repite la llamada y cada borrador usa
 * UNA clave de idempotencia (ver BorradorIdempotente). Tras "sin respuesta" no se da el éxito por
 * hecho ni se reenvía solo: la persona reintenta con los mismos datos y la misma clave, y el servidor
 * devuelve el mismo pago. 422 (clave reutilizada con otro contenido) regenera la clave; 409
 * SOLICITUD_EN_PROCESO solo informa.
 */
export function useReportarPago(contratoId: string) {
  const mutacion = useReportarPagoMutacion(contratoId);
  const [borrador] = useState(() => new BorradorIdempotente());
  const enCurso = useRef(false);
  const [fase, setFase] = useState<Fase>('inactivo');
  const [error, setError] = useState<string | null>(null);

  async function enviar(datos: DatosEnvio) {
    if (enCurso.current) return;
    enCurso.current = true;
    setFase('enviando');
    setError(null);
    try {
      const claveIdempotencia = borrador.claveParaEnvio({
        periodo: datos.periodo,
        montoCentavos: datos.montoCentavos,
        fechaReportada: datos.fechaReportada,
        archivoUri: datos.comprobante.uri,
      });
      await mutacion.mutateAsync({
        contratoId,
        periodo: datos.periodo,
        montoCentavos: datos.montoCentavos,
        fechaReportada: datos.fechaReportada,
        comprobante: datos.comprobante,
        claveIdempotencia,
      });
      // Pago nuevo, clave nueva (aunque el contenido se repita).
      borrador.reiniciar();
      setFase('exito');
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.codigo === 'IDEMPOTENCY_KEY_REUTILIZADA') {
        borrador.reiniciar();
      }
      setFase('inactivo');
      setError(mensajeDeErrorPago(falla));
    } finally {
      enCurso.current = false;
    }
  }

  return { fase, error, enviar };
}
