// Excepción documentada: faltan esquemas en OpenAPI (B-57). El CUERPO de POST /contratos sale del DTO
// generado (tipos.gen.ts); las RESPUESTAS no tienen esquema y se escriben a mano según
// rentcheck-backend (contrato.service.ts), SOLO con los campos que usa la app.

import { api } from './cliente';
import type { TipoUnidad } from './inmuebles';
import type { TipoPlantilla } from '../contratos/plantilla';
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

/** GET /contratos/:id y respuesta 201 de POST /contratos. El código de acceso es un dato sensible. */
export interface ContratoDetalle {
  id: string;
  estado: EstadoContratoApi;
  fecha_inicio: string;
  fecha_fin: string;
  canon_centavos: number;
  tipo_plantilla: TipoPlantilla;
  vinculado: boolean;
  inquilino: { id: string; nombre: string; cedula?: string; telefono?: string };
  unidad: { id: string; nombre: string; tipo: TipoUnidad };
  codigo_acceso: { codigo: string; expira_en: string } | null;
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
