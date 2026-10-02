// Reglas de las solicitudes de mantenimiento del inquilino. La app NO decide: el servidor valida la
// unidad, el contrato activo y el adjunto. Aquí solo se calcula lo que ayuda a la persona (qué
// segmento ve cada solicitud, cuándo ofrecer "Nueva solicitud" y con qué textos).

import type { EstadoContratoApi } from '../api/contratos';
import type { EstadoSolicitud, UrgenciaSolicitud } from '../api/mantenimiento';

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
