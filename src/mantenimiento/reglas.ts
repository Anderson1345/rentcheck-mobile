// Reglas de las solicitudes de mantenimiento del inquilino. La app NO decide: el servidor valida la
// unidad, el contrato activo y el adjunto. Aquí solo se calcula lo que ayuda a la persona (qué
// segmento ve cada solicitud, cuándo ofrecer "Nueva solicitud" y con qué textos).

import type { EstadoContratoApi } from '../api/contratos';
import type { EstadoSolicitud, FiltrosSolicitudes, UrgenciaSolicitud } from '../api/mantenimiento';

/** El OpenAPI no publica un máximo para la descripción: tope razonable de la app (un texto largo es un abuso). */
export const MAXIMO_DESCRIPCION = 1000;

/** Descripción obligatoria y recortada; `error` si falta o se pasa del tope (se cuenta tras recortar). */
export function validarDescripcion(texto: string): { valor: string } | { error: string } {
  const valor = texto.trim();
  if (valor === '') return { error: 'Describe el problema.' };
  if (valor.length > MAXIMO_DESCRIPCION) {
    return { error: `La descripción puede tener hasta ${MAXIMO_DESCRIPCION} caracteres.` };
  }
  return { valor };
}

export const URGENCIA_POR_DEFECTO: UrgenciaSolicitud = 'MEDIO';

export const OPCIONES_URGENCIA: readonly {
  valor: UrgenciaSolicitud;
  etiqueta: string;
  ayuda: string;
}[] = [
  { valor: 'BAJO', etiqueta: 'Baja', ayuda: 'Puede esperar unos días.' },
  { valor: 'MEDIO', etiqueta: 'Media', ayuda: 'Conviene arreglarlo pronto.' },
  {
    valor: 'ALTO',
    etiqueta: 'Alta',
    ayuda: 'Es urgente: afecta tu seguridad o el uso de la vivienda.',
  },
];

/** Una frase por estado, desde el punto de vista del inquilino (solo el arrendador cambia el estado). */
export const FRASE_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'El arrendador aún no la ha atendido',
  EN_PROCESO: 'El arrendador la está atendiendo',
  RESUELTO: 'El arrendador la marcó como resuelta',
};

export type SegmentoSolicitudes = 'abiertas' | 'resueltas';

export function segmentoDeEstado(estado: EstadoSolicitud): SegmentoSolicitudes {
  return estado === 'RESUELTO' ? 'resueltas' : 'abiertas';
}

export function contarSegmentos(
  solicitudes: readonly { estado: EstadoSolicitud }[],
): Record<SegmentoSolicitudes, number> {
  const cuenta = { abiertas: 0, resueltas: 0 };
  for (const s of solicitudes) cuenta[segmentoDeEstado(s.estado)] += 1;
  return cuenta;
}

export function filtrarSegmento<T extends { estado: EstadoSolicitud }>(
  solicitudes: readonly T[],
  segmento: SegmentoSolicitudes,
): T[] {
  return solicitudes.filter((s) => segmentoDeEstado(s.estado) === segmento);
}

/** Crear exige contrato ACTIVO (el servidor responde 409 CONTRATO_NO_ACTIVO); consultar sirve con cualquiera. */
export function puedeCrearSolicitud(estado: EstadoContratoApi): boolean {
  return estado === 'ACTIVO';
}

/** Por qué no se puede crear con este contrato; null si sí se puede. */
export function textoSinCrear(estado: EstadoContratoApi): string | null {
  switch (estado) {
    case 'ACTIVO':
      return null;
    case 'PROGRAMADO':
      return 'Podrás crear solicitudes cuando tu contrato esté activo.';
    case 'VENCIDO':
      return 'Tu contrato finalizó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.';
    case 'TERMINADO_ANTICIPADAMENTE':
      return 'Tu contrato terminó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.';
    default:
      return 'Solo puedes crear solicitudes con un contrato activo.';
  }
}

// ---------------------------------------------------------------------------------------------
// Arrendador (E8-B)
// ---------------------------------------------------------------------------------------------

/** Un segmento por estado, en el orden de trabajo. "Pendiente" es el que se abre por defecto. */
export const SEGMENTOS_ARRENDADOR: readonly { valor: EstadoSolicitud; etiqueta: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
  { valor: 'RESUELTO', etiqueta: 'Resuelta' },
];

/**
 * Contadores por estado. Salen de UNA lista pedida sin filtro de estado (con los filtros de
 * urgencia y unidad, si los hay): así no cambian al cambiar de segmento, pero sí al filtrar.
 */
export function contarPorEstado(
  solicitudes: readonly { estado: EstadoSolicitud }[],
): Record<EstadoSolicitud, number> {
  const cuenta: Record<EstadoSolicitud, number> = { PENDIENTE: 0, EN_PROCESO: 0, RESUELTO: 0 };
  for (const s of solicitudes) cuenta[s.estado] += 1;
  return cuenta;
}

export function filtrarPorEstado<T extends { estado: EstadoSolicitud }>(
  solicitudes: readonly T[],
  estado: EstadoSolicitud,
): T[] {
  return solicitudes.filter((s) => s.estado === estado);
}

export type FiltroUrgencia = 'TODAS' | UrgenciaSolicitud;

/** Filtros del servidor: la urgencia y la unidad. El estado se filtra en la app (ver arriba). */
export interface FiltrosLista {
  urgencia: FiltroUrgencia;
  unidadId: string | null;
}

export const SIN_FILTROS: FiltrosLista = { urgencia: 'TODAS', unidadId: null };

export const OPCIONES_FILTRO_URGENCIA: readonly { valor: FiltroUrgencia; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Todas' },
  { valor: 'ALTO', etiqueta: 'Alta' },
  { valor: 'MEDIO', etiqueta: 'Media' },
  { valor: 'BAJO', etiqueta: 'Baja' },
];

export function hayFiltros(filtros: FiltrosLista): boolean {
  return filtros.urgencia !== 'TODAS' || filtros.unidadId !== null;
}

/** Parámetros de GET /solicitudes-mantenimiento: solo los filtros activos y nunca el estado. */
export function filtrosAParametros(filtros: FiltrosLista): FiltrosSolicitudes {
  return {
    ...(filtros.urgencia !== 'TODAS' ? { urgencia: filtros.urgencia } : {}),
    ...(filtros.unidadId !== null ? { unidadId: filtros.unidadId } : {}),
  };
}

export interface OpcionUnidad {
  valor: string;
  etiqueta: string;
}

/** Las unidades de los inmuebles del arrendador, con el inmueble para distinguir "Apto 101" de "Apto 101". */
export function opcionesDeUnidad(
  inmuebles: readonly { direccion: string; unidades: readonly { id: string; nombre: string }[] }[],
): OpcionUnidad[] {
  return inmuebles.flatMap((inmueble) =>
    inmueble.unidades.map((unidad) => ({
      valor: unidad.id,
      etiqueta: `${unidad.nombre} · ${inmueble.direccion}`,
    })),
  );
}

export type AccionEstado = 'iniciar' | 'resolver';

/** Qué ofrece cada estado: PENDIENTE dos botones, EN_PROCESO uno y RESUELTO ninguno. */
export function accionesDeEstado(
  estado: EstadoSolicitud,
): { accion: AccionEstado; titulo: string }[] {
  switch (estado) {
    case 'PENDIENTE':
      return [
        { accion: 'iniciar', titulo: 'Marcar en proceso' },
        { accion: 'resolver', titulo: 'Marcar resuelta' },
      ];
    case 'EN_PROCESO':
      return [{ accion: 'resolver', titulo: 'Marcar resuelta' }];
    default:
      return [];
  }
}

export const TEXTO_YA_RESUELTA = 'Esta solicitud ya está resuelta';

/** Desde el punto de vista del arrendador (la del inquilino es FRASE_ESTADO). */
export const FRASE_ESTADO_ARRENDADOR: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Está esperando que la atiendas',
  EN_PROCESO: 'La estás atendiendo',
  RESUELTO: 'La marcaste como resuelta',
};

/**
 * Lo que dice la confirmación. No se promete ninguna notificación: el inquilino ve el cambio al abrir
 * o refrescar sus solicitudes (la alerta de la campana, B-18, no es una promesa de entrega; el push es E10).
 */
export function textoConfirmacion(accion: AccionEstado): {
  titulo: string;
  mensaje: string;
  confirmar: string;
} {
  if (accion === 'iniciar') {
    return {
      titulo: 'Marcar en proceso',
      mensaje:
        'La solicitud pasará a "En proceso". El inquilino la verá así cuando abra o actualice sus solicitudes.',
      confirmar: 'Marcar en proceso',
    };
  }
  return {
    titulo: 'Marcar resuelta',
    mensaje:
      'La solicitud quedará cerrada y el inquilino la verá resuelta cuando abra o actualice sus solicitudes. No se puede volver atrás desde la app.',
    confirmar: 'Marcar resuelta',
  };
}
