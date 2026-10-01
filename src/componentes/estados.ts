// Estados reales del negocio (Contexto §5.14, §5.15, §7) → etiqueta y tono visual.
// Las claves son los valores que usa la API. Donde el OpenAPI publica el enum (pago, mantenimiento,
// urgencia) el tipo sale de tipos.gen.ts: si el backend agrega un estado, `npm run api:tipos` hace
// fallar la compilación hasta que se agregue aquí. Los demás se escriben a mano porque el OpenAPI
// no publica el esquema de esas respuestas (estado de contrato, de período y de pago del contrato).

import type { operations } from '../api/tipos.gen';
import type { TonoEstado } from '../tema';

type ConsultaPagos = NonNullable<operations['PagoController_listar']['parameters']['query']>;
type ConsultaMantenimiento = NonNullable<
  operations['SolicitudMantenimientoArrendadorController_listar']['parameters']['query']
>;

/** Pago reportado (§7.3). PENDIENTE se muestra como "En revisión". */
export type EstadoPago = NonNullable<ConsultaPagos['estado']>;
/** Solicitud de mantenimiento (§7.4). */
export type EstadoMantenimiento = NonNullable<ConsultaMantenimiento['estado']>;
/** Urgencia de mantenimiento (§5.14). Es otra dimensión: se escribe con palabras, no con señal. */
export type Urgencia = NonNullable<ConsultaMantenimiento['urgencia']>;
/** Período de cobro (§5.15). PENDIENTE = la fecha límite aún no llega ("Por vencer"). */
export type EstadoPeriodo = 'PAGADO' | 'EN_REVISION' | 'PARCIAL' | 'PENDIENTE' | 'VENCIDO';
/** Estado de pago del contrato, derivado (§7.2). */
export type EstadoPagoContrato = 'AL_DIA' | 'EN_MORA' | 'PENDIENTE';
/**
 * Ciclo de vida del contrato (§7.1). El backend llama VENCIDO a lo que el Contexto llama
 * "Finalizado". PROXIMO_A_VENCER existe en la base pero no es un estado (B-28): no se mapea.
 */
export type EstadoContrato =
  'PROGRAMADO' | 'ACTIVO' | 'VENCIDO' | 'TERMINADO_ANTICIPADAMENTE' | 'CANCELADO';
/** Contrato frente al inquilino (§7.5), derivado de `vinculado_en`. */
export type EstadoVinculo = 'VINCULADO' | 'SIN_VINCULAR';
/** Unidad, derivado de si tiene un contrato activo. */
export type EstadoUnidad = 'OCUPADA' | 'LIBRE';
/** Datos de una unidad: la principal nace con área, habitaciones, baños y ocupantes en null. */
export type EstadoDatos = 'POR_COMPLETAR';

/** Forma de la señal: llena, media luz (Parcial) o hueca (estados apagados). */
export type FormaSenal = 'llena' | 'media' | 'hueca';

export interface DefinicionEstado {
  etiqueta: string;
  tono: TonoEstado;
  senal: FormaSenal;
}

export const ESTADOS_PAGO = {
  PENDIENTE: { etiqueta: 'En revisión', tono: 'informacion', senal: 'llena' },
  APROBADO: { etiqueta: 'Aprobado', tono: 'exito', senal: 'llena' },
  RECHAZADO: { etiqueta: 'Rechazado', tono: 'peligro', senal: 'llena' },
  REEMPLAZADO: { etiqueta: 'Reemplazado', tono: 'neutro', senal: 'hueca' },
} as const satisfies Record<EstadoPago, DefinicionEstado>;

export const ESTADOS_PERIODO = {
  PAGADO: { etiqueta: 'Pagado', tono: 'exito', senal: 'llena' },
  EN_REVISION: { etiqueta: 'En revisión', tono: 'informacion', senal: 'llena' },
  PARCIAL: { etiqueta: 'Parcial', tono: 'advertencia', senal: 'media' },
  PENDIENTE: { etiqueta: 'Por vencer', tono: 'advertencia', senal: 'llena' },
  VENCIDO: { etiqueta: 'Vencido', tono: 'peligro', senal: 'llena' },
} as const satisfies Record<EstadoPeriodo, DefinicionEstado>;

export const ESTADOS_PAGO_CONTRATO = {
  AL_DIA: { etiqueta: 'Al día', tono: 'exito', senal: 'llena' },
  EN_MORA: { etiqueta: 'En mora', tono: 'peligro', senal: 'llena' },
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'advertencia', senal: 'llena' },
} as const satisfies Record<EstadoPagoContrato, DefinicionEstado>;

export const ESTADOS_CONTRATO = {
  PROGRAMADO: { etiqueta: 'Programado', tono: 'programado', senal: 'llena' },
  ACTIVO: { etiqueta: 'Activo', tono: 'exito', senal: 'llena' },
  VENCIDO: { etiqueta: 'Finalizado', tono: 'neutro', senal: 'llena' },
  TERMINADO_ANTICIPADAMENTE: {
    etiqueta: 'Terminado anticipadamente',
    tono: 'neutro',
    senal: 'llena',
  },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'neutro', senal: 'hueca' },
} as const satisfies Record<EstadoContrato, DefinicionEstado>;

export const ESTADOS_VINCULO = {
  VINCULADO: { etiqueta: 'Vinculado', tono: 'programado', senal: 'llena' },
  SIN_VINCULAR: { etiqueta: 'Sin vincular', tono: 'neutro', senal: 'hueca' },
} as const satisfies Record<EstadoVinculo, DefinicionEstado>;

export const ESTADOS_UNIDAD = {
  OCUPADA: { etiqueta: 'Ocupada', tono: 'tinta', senal: 'llena' },
  LIBRE: { etiqueta: 'Libre', tono: 'neutro', senal: 'hueca' },
} as const satisfies Record<EstadoUnidad, DefinicionEstado>;

export const ESTADOS_DATOS = {
  POR_COMPLETAR: { etiqueta: 'Por completar', tono: 'advertencia', senal: 'media' },
} as const satisfies Record<EstadoDatos, DefinicionEstado>;

export const ESTADOS_MANTENIMIENTO = {
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'advertencia', senal: 'llena' },
  EN_PROCESO: { etiqueta: 'En proceso', tono: 'informacion', senal: 'llena' },
  RESUELTO: { etiqueta: 'Resuelto', tono: 'exito', senal: 'llena' },
} as const satisfies Record<EstadoMantenimiento, DefinicionEstado>;

/** La urgencia no lleva señal: "Urgencia baja" en gris, "media" en ámbar, "alta" en rojo. */
export const URGENCIAS = {
  BAJO: { etiqueta: 'Baja', tono: 'neutro' },
  MEDIO: { etiqueta: 'Media', tono: 'advertencia' },
  ALTO: { etiqueta: 'Alta', tono: 'peligro' },
} as const satisfies Record<Urgencia, { etiqueta: string; tono: TonoEstado }>;

/** Mapas por tipo de estado; ChipEstado y la Galería los recorren. */
export const MAPAS_ESTADO = {
  pago: ESTADOS_PAGO,
  periodo: ESTADOS_PERIODO,
  pagoContrato: ESTADOS_PAGO_CONTRATO,
  contrato: ESTADOS_CONTRATO,
  vinculo: ESTADOS_VINCULO,
  unidad: ESTADOS_UNIDAD,
  datos: ESTADOS_DATOS,
  mantenimiento: ESTADOS_MANTENIMIENTO,
} as const;

export type TipoEstado = keyof typeof MAPAS_ESTADO;

/** "Vence en N días": etiqueta calculada (no es un estado del contrato, §7.1). */
export function etiquetaVenceEn(dias: number): string {
  if (!Number.isInteger(dias) || dias < 0)
    throw new RangeError('Los días deben ser un entero ≥ 0.');
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}
