// Lectura de contratos: filtros, búsqueda y textos de la lista (R2-B), etiquetas de documentos y vigencia
// del código. Los estados (del contrato y de pago) los da el servidor; aquí solo se agrupan y se nombran.

import type {
  ContratoResumen,
  EstadoPagoContratoApi,
  TipoDocumentoContrato,
} from '../api/contratos';
import { ESTADOS_CONTRATO } from '../componentes/estados';
import type { TonoEstado } from '../tema';
import { formatearFechaCorta } from '../utilidades/fechas';

export type FiltroContratos = 'TODOS' | 'ACTIVOS' | 'EN_MORA' | 'CERRADOS';

export const FILTROS: readonly { valor: FiltroContratos; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'ACTIVOS', etiqueta: 'Activos' },
  { valor: 'EN_MORA', etiqueta: 'En mora' },
  { valor: 'CERRADOS', etiqueta: 'Cerrados' },
];

type EstadoLista = ContratoResumen['estado'];

/** Contratos que ya terminaron: no generan más períodos (los PROGRAMADO no están aquí). */
const CERRADOS: readonly EstadoLista[] = ['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'];

export const esCerrado = (c: Pick<ContratoResumen, 'estado'>) => CERRADOS.includes(c.estado);
/** PROXIMO_A_VENCER es un estado heredado del enum: se trata como ACTIVO. */
export const esActivo = (c: Pick<ContratoResumen, 'estado'>) =>
  c.estado === 'ACTIVO' || c.estado === 'PROXIMO_A_VENCER';

/** Se filtra en la app; el orden es el del servidor (más reciente primero). */
export function filtrarContratos(
  contratos: ContratoResumen[],
  filtro: FiltroContratos,
): ContratoResumen[] {
  switch (filtro) {
    case 'ACTIVOS':
      return contratos.filter(esActivo);
    case 'EN_MORA':
      return contratos.filter((c) => c.estado_pago === 'EN_MORA');
    case 'CERRADOS':
      return contratos.filter(esCerrado);
    default:
      return contratos;
  }
}

/** Cuántos contratos hay en cada filtro (de la misma lista; no se recalcula ningún estado). */
export function conteosFiltros(contratos: ContratoResumen[]): Record<FiltroContratos, number> {
  return {
    TODOS: contratos.length,
    ACTIVOS: filtrarContratos(contratos, 'ACTIVOS').length,
    EN_MORA: filtrarContratos(contratos, 'EN_MORA').length,
    CERRADOS: filtrarContratos(contratos, 'CERRADOS').length,
  };
}

/** Minúsculas y sin tildes, con los espacios colapsados: "José  Peña" → "jose pena". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca en el nombre de la unidad y en el del inquilino (filtro local sobre la lista ya cargada). */
export function buscarContratos(contratos: ContratoResumen[], texto: string): ContratoResumen[] {
  const buscado = normalizar(texto);
  if (!buscado) return contratos;
  return contratos.filter(
    (c) =>
      normalizar(c.unidad.nombre).includes(buscado) ||
      normalizar(c.inquilino.nombre).includes(buscado),
  );
}

export interface EstadoFila {
  texto: string;
  tono: TonoEstado;
}

/** Texto y tono de cada estado de pago guardado: el Record obliga a cubrir todos los valores del enum. */
export const ESTADO_PAGO_FILA: Record<EstadoPagoContratoApi, EstadoFila> = {
  AL_DIA: { texto: 'Al día', tono: 'exito' },
  EN_MORA: { texto: 'En mora', tono: 'peligro' },
  PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
};

/**
 * Estado que se ve a la derecha de la fila. Un programado dice "Programado"; un contrato que debe dice
 * "En mora" aunque esté cerrado; un cerrado sin deuda, "Cerrado"; un activo sin vincular, "Sin vincular";
 * si no, su estado de pago.
 */
export function estadoDeFila(c: ContratoResumen): EstadoFila {
  if (c.estado === 'PROGRAMADO') return { texto: 'Programado', tono: 'programado' };
  if (c.estado_pago === 'EN_MORA') return ESTADO_PAGO_FILA.EN_MORA;
  if (esCerrado(c)) return { texto: 'Cerrado', tono: 'neutro' };
  if (!c.vinculado) return { texto: 'Sin vincular', tono: 'neutro' };
  return ESTADO_PAGO_FILA[c.estado_pago];
}

/** "Unidad · hasta 30/09/2027", o cómo empezará o se cerró. */
export function subtituloDeFila(c: ContratoResumen): string {
  const unidad = c.unidad.nombre;
  switch (c.estado) {
    case 'PROGRAMADO':
      return `${unidad} · desde ${formatearFechaCorta(c.fecha_inicio)}`;
    case 'VENCIDO':
      return `${unidad} · finalizó el ${formatearFechaCorta(c.fecha_fin)}`;
    case 'TERMINADO_ANTICIPADAMENTE':
      return `${unidad} · terminado anticipadamente`;
    case 'CANCELADO':
      return `${unidad} · cancelado`;
    default:
      return `${unidad} · hasta ${formatearFechaCorta(c.fecha_fin)}`;
  }
}

/** Iniciales del nombre (primera y última palabra): "José Felipe de la Peña" → "JP". */
export function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  const primera = palabras[0].charAt(0);
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1].charAt(0) : '';
  return `${primera}${ultima}`.toUpperCase();
}

export const ETIQUETA_DOCUMENTO: Record<TipoDocumentoContrato, string> = {
  CONTRATO_ORIGINAL: 'Contrato original',
  OTROSI_INCREMENTO: 'Otrosí por incremento',
  OTROSI_PRORROGA: 'Otrosí por prórroga',
};

/** Nombre del PDF en el caché: sin datos personales ni la URL firmada. */
export function nombreArchivoDocumento(contratoId: string, version: number): string {
  return `contrato-${contratoId}-v${version}.pdf`;
}

/** expira_en es un instante: el código vence cuando ese momento ya pasó. */
export function codigoExpirado(expiraEn: string, ahora: number = Date.now()): boolean {
  return new Date(expiraEn).getTime() <= ahora;
}

// ---- Detalle (R2-B) ----

const DIA_MS = 24 * 60 * 60 * 1000;
/** "AAAA-MM-DD" (o una fecha de día del servidor, medianoche UTC) → número de día. */
const numeroDeDia = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia) / DIA_MS;
};

/**
 * Avance del contrato entre su inicio y su fin, con `hoy` (día de Bogotá, `hoyBogota()`) inyectado:
 * fracción transcurrida (0 a 1) y días que faltan para la fecha de fin (nunca negativos).
 */
export function avanceContrato(
  inicio: string,
  fin: string,
  hoy: string,
): { fraccion: number; diasRestantes: number } {
  const total = Math.max(1, numeroDeDia(fin) - numeroDeDia(inicio));
  const transcurridos = Math.min(total, Math.max(0, numeroDeDia(hoy) - numeroDeDia(inicio)));
  return {
    fraccion: transcurridos / total,
    diasRestantes: Math.max(0, numeroDeDia(fin) - numeroDeDia(hoy)),
  };
}

export const textoDiasRestantes = (dias: number) =>
  dias === 1 ? '1 día restante' : `${dias} días restantes`;

/**
 * Chip de la cabecera: el estado del contrato y, si está activo (o si debe aunque esté cerrado), su estado
 * de pago guardado: "Activo · Al día", "Finalizado · En mora", "Programado".
 */
export function textoChipContrato(
  estado: keyof typeof ESTADOS_CONTRATO,
  estadoPago: EstadoPagoContratoApi | undefined,
): string {
  const base = ESTADOS_CONTRATO[estado].etiqueta;
  if (!estadoPago || estado === 'PROGRAMADO') return base;
  if (estado === 'ACTIVO' || estadoPago === 'EN_MORA') {
    return `${base} · ${ESTADO_PAGO_FILA[estadoPago].texto}`;
  }
  return base;
}

/** Hasta `maximo` períodos sin pagar, en el orden en que los da el servidor (del más antiguo). */
export function proximosPagos<T extends { estado: string }>(
  periodos: readonly T[],
  maximo = 3,
): T[] {
  return periodos.filter((p) => p.estado !== 'PAGADO').slice(0, maximo);
}
