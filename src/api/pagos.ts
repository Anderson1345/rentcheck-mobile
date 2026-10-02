// Excepción documentada: faltan esquemas de respuesta en OpenAPI (B-57). Las respuestas de los pagos se
// escriben a mano según rentcheck-backend (pago.service.ts, INCLUDE_PAGO), SOLO con los campos que usa
// la app del inquilino; el bloque `contrato` que también llega se ignora. Los CUERPOS sí están en
// tipos.gen.ts (PagoController_crear, RechazarPagoDto).

import { api, type ArchivoSubida } from './cliente';
import type { EstadoPago } from '../componentes/estados';
import type { components } from './tipos.gen';

export type MotivoRechazoPago = components['schemas']['MotivoRechazoPago'];

/** Un pago de GET /pagos/mios. `periodo` y `fecha_reportada` llegan como medianoche UTC (día calendario). */
export interface PagoInquilino {
  id: string;
  contrato_id: string;
  monto_centavos: number;
  fecha_reportada: string;
  /** Primer día del mes que cubre. */
  periodo: string;
  estado: EstadoPago;
  /** Solo los pagos RECHAZADO traen valor; los rechazos anteriores a B0.6-A1 quedan en null. */
  motivo_rechazo: MotivoRechazoPago | null;
  mensaje_rechazo: string | null;
  /** URL firmada del comprobante (caduca): en esta entrega no se usa ni se guarda. */
  comprobante_url: string | null;
  creado_en: string;
  actualizado_en: string;
}

export const listarMisPagos = (contratoId: string) =>
  api.get<PagoInquilino[]>(`/pagos/mios?contratoId=${encodeURIComponent(contratoId)}`);

export interface DatosReporte {
  contratoId: string;
  /** "AAAA-MM-DD", primer día del mes. La app SIEMPRE lo envía. */
  periodo: string;
  montoCentavos: number;
  /** "AAAA-MM-DD". */
  fechaReportada: string;
  comprobante: ArchivoSubida;
  /** Cabecera Idempotency-Key: mismo contenido y misma clave devuelven el mismo pago. */
  claveIdempotencia: string;
}

/** POST /pagos multipart. Responde 201 con el pago (sin el bloque `contrato`). */
export const reportarPago = (datos: DatosReporte) =>
  api.subirArchivo<PagoInquilino>(
    '/pagos',
    'comprobante',
    datos.comprobante,
    {
      contratoId: datos.contratoId,
      monto_centavos: String(datos.montoCentavos),
      fecha_reportada: datos.fechaReportada,
      periodo: datos.periodo,
    },
    { encabezados: { 'Idempotency-Key': datos.claveIdempotencia } },
  );
