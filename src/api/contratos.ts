// Excepción documentada: faltan esquemas en OpenAPI (B-57). El CUERPO de POST /contratos sale del DTO
// generado (tipos.gen.ts); las RESPUESTAS no tienen esquema y se escriben a mano según
// rentcheck-backend (contrato.service.ts), SOLO con los campos que usa la app.

import { api } from './cliente';
import type { TipoUnidad } from './inmuebles';
import type { TipoPlantilla } from '../contratos/plantilla';
import type { CuerpoCorregirContrato, CuerpoCorregirInquilino } from '../contratos/correccion';
import type { CuerpoCrearContrato } from '../contratos/cuerpo';

export type EstadoContratoApi =
  'PROGRAMADO' | 'ACTIVO' | 'VENCIDO' | 'TERMINADO_ANTICIPADAMENTE' | 'CANCELADO';

/** Elemento de GET /contratos. Las fechas llegan como medianoche UTC (día calendario). */
export interface ContratoResumen {
  id: string;
  estado: EstadoContratoApi;
  fecha_inicio: string;
  fecha_fin: string;
  canon_centavos: number;
  tipo_plantilla?: TipoPlantilla;
  vinculado: boolean;
  unidad: { id: string; nombre: string; tipo: TipoUnidad };
  inquilino: { id: string; nombre: string };
  codigo_acceso: { codigo: string; expira_en: string } | null;
}

export type TipoDocumentoContrato = 'CONTRATO_ORIGINAL' | 'OTROSI_INCREMENTO' | 'OTROSI_PRORROGA';
export type RolContrato = 'ARRENDADOR' | 'INQUILINO';

export interface IncrementoIpc {
  id: string;
  fecha_aplicacion: string;
  canon_anterior_centavos: number;
  canon_nuevo_centavos: number;
  /** Decimal de Prisma: llega como texto. */
  porcentaje_ipc_aplicado: string | number;
}

/** Resumen del aviso (resumenAvisoNoRenovacion del backend). Los dos booleanos mandan sobre cualquier cálculo. */
export interface ResumenAviso {
  estado: 'NINGUNO' | 'DADO';
  dado_por: RolContrato | null;
  dado_en: string | null;
  motivo: string | null;
  puede_dar?: boolean;
  puede_cancelar?: boolean;
}

/** resumenTerminacion del backend. Los booleanos mandan: no existe puede_solicitar. */
export interface ResumenTerminacionContrato {
  estado: 'NINGUNA' | 'SOLICITADA' | 'CONFIRMADA';
  solicitada_por: RolContrato | null;
  solicitada_en: string | null;
  motivo: string | null;
  fecha_efectiva: string | null;
  confirmada_por?: RolContrato | null;
  confirmada_en?: string | null;
  puede_confirmar?: boolean;
  puede_cancelar?: boolean;
}

/** GET /contratos/:id/documentos. `url_firmada` es temporal: nunca se guarda ni se registra. */
export interface DocumentoContrato {
  id: string;
  tipo: TipoDocumentoContrato;
  version: number;
  generado_en: string;
  hash_sha256: string | null;
  url_firmada: string | null;
}

/** GET /contratos/:id y respuesta 201 de POST /contratos. El código de acceso es un dato sensible. */
export interface ContratoDetalle {
  id: string;
  estado: EstadoContratoApi;
  fecha_inicio: string;
  fecha_fin: string;
  canon_centavos: number;
  tipo_plantilla: TipoPlantilla;
  vinculado: boolean;
  dia_pago?: number;
  forma_pago?: string;
  /** Para el arrendador llega con valor; se tolera null (regla 11 del Contexto aplica al inquilino). */
  datos_recaudo?: string | null;
  deposito_centavos?: number | null;
  datos_fiador_o_poliza?: string | null;
  condicionesParticularesTexto?: string | null;
  inquilino: {
    id: string;
    nombre: string;
    cedula?: string;
    telefono?: string;
    /** Solo si el servidor lo envía (la copia del contrato no lo trae hoy). */
    correo?: string | null;
  };
  unidad: { id: string; nombre: string; tipo: TipoUnidad };
  codigo_acceso: { codigo: string; expira_en: string } | null;
  incrementos_ipc?: IncrementoIpc[];
  aviso_no_renovacion?: ResumenAviso;
  terminacion_anticipada?: ResumenTerminacionContrato;
}

/** GET /inquilinos: datos que escribió el arrendador. */
export interface InquilinoFicha {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string | null;
  vinculado: boolean;
  creado_en: string;
}

/** El servidor genera el PDF antes de responder: puede tardar. */
export const TIMEOUT_CREAR_CONTRATO_MS = 60_000;

/** Sin Idempotency-Key (B-60): la protección es el botón bloqueado y la recuperación con GET /contratos. */
export const crearContrato = (cuerpo: CuerpoCrearContrato) =>
  api.post<ContratoDetalle>('/contratos', cuerpo, { tiempo: TIMEOUT_CREAR_CONTRATO_MS });

export const listarContratos = () => api.get<ContratoResumen[]>('/contratos');

export const obtenerContrato = (id: string) =>
  api.get<ContratoDetalle>(`/contratos/${encodeURIComponent(id)}`);

export const listarInquilinos = () => api.get<InquilinoFicha[]>('/inquilinos');

export const listarDocumentos = (id: string) =>
  api.get<DocumentoContrato[]>(`/contratos/${encodeURIComponent(id)}/documentos`);

/** El código anterior deja de servir. 404 si el contrato es ajeno o no tiene código. */
export const regenerarCodigo = (id: string) =>
  api.post<{ codigo: string; expira_en: string }>(
    `/contratos/${encodeURIComponent(id)}/regenerar-codigo`,
  );

// ---- Estado de cuenta (camelCase: así lo responde el backend) y acciones (E5-B) ----

export type EstadoPeriodoApi = 'PAGADO' | 'EN_REVISION' | 'PENDIENTE' | 'VENCIDO' | 'PARCIAL';

export interface PeriodoCuenta {
  /** Primer día del mes que cubre (medianoche UTC = día calendario). */
  periodo: string;
  fechaLimite: string;
  canonVigenteCentavos: number;
  estado: EstadoPeriodoApi;
  montoAprobadoCentavos: number;
}

export interface EstadoCuenta {
  estadoPago: 'al_dia' | 'en_mora' | 'pendiente';
  periodos: PeriodoCuenta[];
}

export const obtenerEstadoCuenta = (id: string) =>
  api.get<EstadoCuenta>(`/contratos/${encodeURIComponent(id)}/estado-cuenta`);

/** Fila IncrementoIPC que devuelve el servidor al aplicar el incremento. */
export interface IncrementoAplicado {
  id: string;
  fecha_aplicacion: string;
  canon_anterior_centavos: number;
  canon_nuevo_centavos: number;
  porcentaje_ipc_aplicado: string | number;
}

/** Fila Prorroga que devuelve el servidor al prorrogar. */
export interface ProrrogaAplicada {
  id: string;
  fecha_aplicacion: string;
  fecha_fin_anterior: string;
  fecha_fin_nueva: string;
  meses: number;
  tipo: 'MANUAL' | 'AUTOMATICA';
}

/**
 * Sin porcentaje, el servidor usa el IPC del año anterior. Genera el otrosí (PDF) antes de responder:
 * mismo tiempo de espera largo que crear un contrato. Sin Idempotency-Key. La respuesta NO tiene la
 * forma de ContratoDetalle: después hay que volver a pedir el detalle.
 */
export const aplicarIncremento = (id: string, porcentaje?: number) =>
  api.post<{ incremento_ipc: IncrementoAplicado }>(
    `/contratos/${encodeURIComponent(id)}/aplicar-incremento`,
    porcentaje === undefined ? undefined : { porcentaje },
    { tiempo: TIMEOUT_CREAR_CONTRATO_MS },
  );

/** Sin meses, el término inicial del contrato. También genera un otrosí. */
export const prorrogar = (id: string, meses?: number) =>
  api.post<{ prorroga: ProrrogaAplicada }>(
    `/contratos/${encodeURIComponent(id)}/prorrogar`,
    meses === undefined ? undefined : { meses },
    { tiempo: TIMEOUT_CREAR_CONTRATO_MS },
  );

export const darAvisoNoRenovacion = (id: string, motivo?: string) => {
  const texto = motivo?.trim();
  return api.post<unknown>(
    `/contratos/${encodeURIComponent(id)}/aviso-no-renovacion`,
    texto ? { motivo: texto } : undefined,
  );
};

export const cancelarAvisoNoRenovacion = (id: string) =>
  api.post<unknown>(`/contratos/${encodeURIComponent(id)}/cancelar-aviso-no-renovacion`);

/** No borra nada: el contrato queda CANCELADO. */
export const cancelarProgramado = (id: string) =>
  api.post<unknown>(`/contratos/${encodeURIComponent(id)}/cancelar-programado`);

// ---- Terminación anticipada, correcciones y documentos (E5-C) ----

/** El motivo es obligatorio (≤1000); la fecha efectiva va "AAAA-MM-DD". */
export const solicitarTerminacion = (id: string, motivo: string, fechaEfectiva: string) =>
  api.post<unknown>(`/contratos/${encodeURIComponent(id)}/solicitar-terminacion-anticipada`, {
    motivo: motivo.trim(),
    fecha_efectiva: fechaEfectiva,
  });

/** IRREVERSIBLE; solo la contraparte de quien solicitó. */
export const confirmarTerminacion = (id: string) =>
  api.post<unknown>(`/contratos/${encodeURIComponent(id)}/confirmar-terminacion-anticipada`);

export const cancelarTerminacion = (id: string) =>
  api.post<unknown>(`/contratos/${encodeURIComponent(id)}/cancelar-terminacion-anticipada`);

export interface DocumentoCorregido {
  id: string;
  tipo: TipoDocumentoContrato;
  version: number;
}

/** Respuesta de los PATCH: el contrato más `documento` (null si el PDF falló) y, si cambió la cédula, el código nuevo. */
export interface RespuestaCorreccion {
  documento: DocumentoCorregido | null;
  codigo_acceso?: { codigo: string; expira_en: string };
}

/** Sin cambios reales responde 200 sin versión nueva; es seguro reintentar. */
export const corregirContrato = (id: string, cuerpo: CuerpoCorregirContrato) =>
  api.patch<RespuestaCorreccion>(`/contratos/${encodeURIComponent(id)}`, cuerpo);

export const corregirInquilino = (id: string, cuerpo: CuerpoCorregirInquilino) =>
  api.patch<RespuestaCorreccion>(`/contratos/${encodeURIComponent(id)}/inquilino`, cuerpo);

/** Idempotente: genera solo lo que falta. 500 DOCUMENTO_NO_GENERADO si alguno falla. */
export const regenerarDocumentos = (id: string) =>
  api.post<{ generados: { tipo: TipoDocumentoContrato; version: number }[]; ya_existian: number }>(
    `/contratos/${encodeURIComponent(id)}/documentos/regenerar`,
  );
