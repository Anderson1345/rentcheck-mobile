// Tipos de las respuestas de pagos: los GENERADOS desde el OpenAPI de producción (B0.6-A3 los describió:
// PagoRespuestaDto, PagoCreadoDto, PeriodoCuentaDto, enum MotivoRechazoPago). Aquí solo se les da un
// nombre corto; ya no se escriben a mano (B-57, parte de pagos).

import { api, type ArchivoSubida } from './cliente';
import type { components } from './tipos.gen';

export type MotivoRechazoPago = components['schemas']['MotivoRechazoPago'];
/** Un pago con su contrato, unidad, inmueble e inquilino: GET /pagos, /pagos/mios, /pagos/:id y aprobar/rechazar. */
export type PagoRespuesta = components['schemas']['PagoRespuestaDto'];
/** El pago sin el bloque `contrato`: respuesta 201 de POST /pagos. */
export type PagoCreado = components['schemas']['PagoCreadoDto'];
/** El período que cubre el pago, tal como lo calcula el servidor (null si el cálculo no lo genera). */
export type PeriodoCuentaPago = components['schemas']['PeriodoCuentaDto'];
export type CuerpoRechazo = components['schemas']['RechazarPagoDto'];
export type EstadoPagoApi = PagoRespuesta['estado'];
/** Estados que se piden a GET /pagos?estado= (los mismos del pago). */
export type FiltroPagos = EstadoPagoApi;

// ---- Inquilino (E7-A) ----

export const listarMisPagos = (contratoId: string) =>
  api.get<PagoRespuesta[]>(`/pagos/mios?contratoId=${encodeURIComponent(contratoId)}`);

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
  api.subirArchivo<PagoCreado>(
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

// ---- Arrendador (E7-B) ----

/** Sus pagos, del más reciente al más antiguo (orden del servidor). Sin filtro, todos los estados. */
export const listarPagos = (estado?: FiltroPagos) =>
  api.get<PagoRespuesta[]>(estado ? `/pagos?estado=${estado}` : '/pagos');

/** 404 si el pago es de otro arrendador. */
export const obtenerPago = (id: string) =>
  api.get<PagoRespuesta>(`/pagos/${encodeURIComponent(id)}`);

/** Sin cuerpo. 409 PAGO_YA_PROCESADO si el pago ya no está PENDIENTE. */
export const aprobarPago = (id: string) =>
  api.patch<PagoRespuesta>(`/pagos/${encodeURIComponent(id)}/aprobar`);

/**
 * El servidor admite rechazar sin cuerpo; la APP siempre manda el motivo (y el mensaje solo si lo
 * hay). `OTRO` exige mensaje (400 MENSAJE_REQUERIDO).
 */
export const rechazarPago = (id: string, cuerpo: CuerpoRechazo) =>
  api.patch<PagoRespuesta>(`/pagos/${encodeURIComponent(id)}/rechazar`, cuerpo);
