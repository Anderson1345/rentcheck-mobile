// Solicitudes de mantenimiento del inquilino (E8-A). Los tipos son los GENERADOS desde el OpenAPI
// (B0.6-A4 describió SolicitudCreadaDto, SolicitudInquilinoDto, SolicitudArrendadorDto y los enums);
// aquí solo se les da un nombre corto. Rutas del inquilino bajo /inquilino/solicitudes; el alias
// obsoleto /solicitudes-mantenimiento/mias NO se usa.

import { api, TIMEOUT_SUBIDA_VIDEO_MS } from './cliente';
import type { components } from './tipos.gen';
import { TAMANO_MAXIMO_ADJUNTO_BYTES, type AdjuntoElegido } from '../utilidades/adjuntoSolicitud';

export type UrgenciaSolicitud = components['schemas']['UrgenciaMantenimiento'];
export type EstadoSolicitud = components['schemas']['EstadoSolicitudMantenimiento'];
export type TipoAdjunto = components['schemas']['TipoAdjunto'];
/** Una solicitud como la ve el inquilino (lista y detalle): sin unidad ni inmueble. */
export type SolicitudInquilino = components['schemas']['SolicitudInquilinoDto'];
/** Respuesta 201 de POST /solicitudes-mantenimiento. */
export type SolicitudCreada = components['schemas']['SolicitudCreadaDto'];

/** Las solicitudes del contrato indicado, de la más reciente a la más antigua (orden del servidor). */
export const listarMisSolicitudes = (contratoId: string) =>
  api.get<SolicitudInquilino[]>(
    `/inquilino/solicitudes?contratoId=${encodeURIComponent(contratoId)}`,
  );

/** 404 si es de otro inquilino o su unidad no tiene un contrato suyo vinculado. */
export const obtenerMiSolicitud = (id: string) =>
  api.get<SolicitudInquilino>(`/inquilino/solicitudes/${encodeURIComponent(id)}`);

export const MENSAJE_ADJUNTO_GRANDE = 'El archivo es demasiado grande (máximo 20 MB).';
export const MENSAJE_ADJUNTO_ILEGIBLE = 'No pudimos leer el archivo. Elígelo de nuevo.';

export interface DatosSolicitud {
  unidadId: string;
  descripcion: string;
  urgencia: UrgenciaSolicitud;
  /** Un solo adjunto, ya preparado (la foto reducida o el video tal cual); null si no hay. */
  adjunto: AdjuntoElegido | null;
  /** Cabecera Idempotency-Key: mismo contenido y misma clave devuelven la misma solicitud. */
  claveIdempotencia: string;
  /** Bytes enviados y totales (solo con adjunto). */
  alProgreso?: (enviados: number, totales: number) => void;
  /** Para que la persona cancele el envío. */
  senal?: AbortSignal;
}

/**
 * POST /solicitudes-mantenimiento (multipart). El plazo de un video es de 180 s; el de una foto o el
 * de una solicitud sin adjunto, el de siempre.
 */
export const crearSolicitud = (datos: DatosSolicitud) =>
  api.subirArchivo<SolicitudCreada>(
    '/solicitudes-mantenimiento',
    'adjunto',
    datos.adjunto,
    { unidadId: datos.unidadId, descripcion: datos.descripcion, urgencia: datos.urgencia },
    {
      encabezados: { 'Idempotency-Key': datos.claveIdempotencia },
      tamanoMaximo: TAMANO_MAXIMO_ADJUNTO_BYTES,
      mensajes: { grande: MENSAJE_ADJUNTO_GRANDE, ilegible: MENSAJE_ADJUNTO_ILEGIBLE },
      tiempo: datos.adjunto?.tipo === 'VIDEO' ? TIMEOUT_SUBIDA_VIDEO_MS : undefined,
      alProgreso: datos.alProgreso,
      senal: datos.senal,
    },
  );
