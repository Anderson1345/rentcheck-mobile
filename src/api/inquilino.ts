// Excepción documentada: faltan esquemas en OpenAPI (B-57). Las respuestas del portal del inquilino
// se escriben a mano según rentcheck-backend (inquilino-panel.service.ts, terminacion.util.ts),
// SOLO con los campos que usa la app. Rutas por id de contrato bajo /inquilino/contratos/:id; los
// alias obsoletos /inquilino/mi-* no se usan. Vincular con código vive en auth.ts.

import { api } from './cliente';
import type { ArchivoFoto } from './inmuebles';
import type {
  DocumentoContrato,
  EstadoContratoApi,
  EstadoCuenta,
  EstadoPeriodoApi,
  IncrementoIpc,
  ResumenAviso,
  ResumenTerminacionContrato,
} from './contratos';
import type { FotoInventario } from './inventario';

export type EstadoPagoPortal = 'al_dia' | 'en_mora' | 'pendiente';

/** Elemento de GET /inquilino/contratos. Sin canon ni arrendador. Excluye CANCELADO y no vinculados. */
export interface ContratoInquilinoResumen {
  id: string;
  estado: EstadoContratoApi;
  fecha_inicio: string;
  fecha_fin: string;
  unidad: { nombre: string; tipo: string };
  inmueble: { direccion: string; ciudad: string };
  /** Solo se calcula con el contrato ACTIVO; null en los demás. */
  estado_pago: EstadoPagoPortal | null;
}

export interface ProximoPeriodoPanel {
  periodo: string;
  fecha_limite: string;
  monto_centavos: number;
  estado: EstadoPeriodoApi;
}

/** GET /:id/panel con el contrato ACTIVO. */
export interface PanelContratoActivo {
  contrato_id: string;
  estado: EstadoContratoApi;
  fecha_fin: string;
  dias_restantes: number;
  canon_vigente_centavos: number;
  estado_pago: EstadoPagoPortal;
  proximo_periodo: ProximoPeriodoPanel | null;
  periodos_vencidos: { cantidad: number; total_pendiente_centavos: number };
}

/** GET /:id/panel con el contrato PROGRAMADO: aún no empieza ni muestra datos de recaudo. */
export interface PanelContratoProgramado {
  contratoFinalizado: false;
  programado: true;
  estado: EstadoContratoApi;
  fecha_inicio: string;
  fecha_fin: string;
}

/** GET /:id/panel con cualquier otro estado (VENCIDO, TERMINADO_ANTICIPADAMENTE). */
export interface PanelContratoFinalizado {
  contratoFinalizado: true;
  estado: EstadoContratoApi;
}

export type PanelContratoInquilino =
  PanelContratoActivo | PanelContratoProgramado | PanelContratoFinalizado;

/**
 * GET /:id. OJO: `contratoId` va en camelCase. `datos_recaudo` solo llega con el contrato ACTIVO
 * (regla 11). `pdf_contrato_url` es OBSOLETO (se usa `documentos`) y `fotos_devolucion` no se usa
 * en esta entrega. Toda URL firmada (documentos, fotos) puede ser null y caduca: nunca se guarda.
 */
export interface ContratoInquilinoDetalle {
  contratoId: string;
  estado: EstadoContratoApi;
  programado: boolean;
  canon_centavos: number;
  dia_pago: number;
  forma_pago: string;
  deposito_centavos: number | null;
  datos_recaudo: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  /** OBSOLETO: no se usa. */
  pdf_contrato_url: string | null;
  documentos: DocumentoContrato[];
  incrementos_ipc: IncrementoIpc[];
  terminacion_anticipada: ResumenTerminacionContrato;
  aviso_no_renovacion: ResumenAviso;
  fotos_entrega: FotoInventario[];
  fotos_devolucion: FotoInventario[];
}

const ruta = (id: string, parte = '') => `/inquilino/contratos/${encodeURIComponent(id)}${parte}`;

export const listarContratosInquilino = () =>
  api.get<ContratoInquilinoResumen[]>('/inquilino/contratos');

export const obtenerContratoInquilino = (id: string) => api.get<ContratoInquilinoDetalle>(ruta(id));

export const obtenerPanelInquilino = (id: string) =>
  api.get<PanelContratoInquilino>(ruta(id, '/panel'));

/** Misma forma (camelCase) que la del arrendador. */
export const obtenerEstadoCuentaInquilino = (id: string) =>
  api.get<EstadoCuenta>(ruta(id, '/estado-cuenta'));

export const listarDocumentosInquilino = (id: string) =>
  api.get<DocumentoContrato[]>(ruta(id, '/documentos'));

// ---- Acciones de contrato (E6-B). Las respuestas NO sirven para pintar: se vuelve a pedir el detalle. ----

/** El motivo es obligatorio (≤1000); la fecha efectiva va "AAAA-MM-DD". Sin Idempotency-Key (B-60). */
export const solicitarTerminacionInquilino = (id: string, motivo: string, fechaEfectiva: string) =>
  api.post<unknown>(ruta(id, '/solicitar-terminacion-anticipada'), {
    motivo: motivo.trim(),
    fecha_efectiva: fechaEfectiva,
  });

/** IRREVERSIBLE; solo la contraparte de quien solicitó. */
export const confirmarTerminacionInquilino = (id: string) =>
  api.post<unknown>(ruta(id, '/confirmar-terminacion-anticipada'));

export const cancelarTerminacionInquilino = (id: string) =>
  api.post<unknown>(ruta(id, '/cancelar-terminacion-anticipada'));

/** Motivo opcional (≤1000): en blanco no se envía. */
export const darAvisoInquilino = (id: string, motivo?: string) => {
  const texto = motivo?.trim();
  return api.post<unknown>(ruta(id, '/aviso-no-renovacion'), texto ? { motivo: texto } : undefined);
};

export const cancelarAvisoInquilino = (id: string) =>
  api.post<unknown>(ruta(id, '/cancelar-aviso-no-renovacion'));

// ---- Perfil del inquilino ----

/**
 * GET/PATCH /inquilino/perfil. La cédula y el correo son solo lectura. `foto_cedula_url` es una URL
 * firmada de un DOCUMENTO SENSIBLE: nunca se guarda ni se registra.
 */
export interface PerfilInquilino {
  id: string;
  nombre: string;
  cedula: string | null;
  telefono: string;
  correo: string | null;
  foto_cedula_url: string | null;
}

export const obtenerPerfilInquilino = () => api.get<PerfilInquilino>('/inquilino/perfil');

/** Solo nombre y/o teléfono. No modifica contratos ni las copias que escribió el arrendador. */
export const actualizarPerfilInquilino = (cambios: { nombre?: string; telefono?: string }) =>
  api.patch<PerfilInquilino>('/inquilino/perfil', cambios);

/** Campo multipart "foto" (JPEG o PNG); responde el perfil con la foto firmada. */
export const subirFotoCedulaInquilino = (foto: ArchivoFoto) =>
  api.subirArchivo<PerfilInquilino>('/inquilino/perfil/foto-cedula', 'foto', foto);
