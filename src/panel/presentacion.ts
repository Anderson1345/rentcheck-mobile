// Presentación del Panel: solo da formato a lo que entrega el servidor (nombres de mes, plurales,
// listas para la gráfica). No calcula reglas de negocio: ni mora, ni recaudo, ni promedios.

import type { Href } from 'expo-router';

import type {
  MoraPanel,
  OcupacionPanel,
  PanelArrendador,
  PendientesPanel,
  UnidadOcupacionPanel,
} from '../api/panel';
import type { NombreIcono } from '../componentes/iconos/Icono';
import type { TonoEstado } from '../tema';
import { destinoDeLista, destinosPanel } from './destinos';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Índice (0 a 11) de un mes "AAAA-MM" del servidor, o null si no tiene esa forma. */
function indiceDeMes(mes: string): number | null {
  const coincidencia = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[2]);
  return numero >= 1 && numero <= 12 ? numero - 1 : null;
}

/** "2026-10" → "octubre" (vacío si el mes no es válido: la pantalla nunca se rompe por eso). */
export function nombreDelMes(mes: string): string {
  const indice = indiceDeMes(mes);
  return indice === null ? '' : MESES[indice];
}

/** "2026-10" → "oct". */
export function etiquetaMesCorto(mes: string): string {
  const indice = indiceDeMes(mes);
  return indice === null ? '' : MESES[indice].slice(0, 3);
}

/** "2026-10" → "Octubre de 2026". */
export function mesYAnio(mes: string): string {
  const indice = indiceDeMes(mes);
  if (indice === null) return '';
  const nombre = MESES[indice];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} de ${mes.slice(0, 4)}`;
}

/** "2026-10" → "O" (etiqueta de la gráfica del año). */
export function inicialDeMes(mes: string): string {
  const indice = indiceDeMes(mes);
  return indice === null ? '' : MESES[indice].charAt(0).toUpperCase();
}

const plural = (n: number, singular: string, plurales: string) => (n === 1 ? singular : plurales);

/** "7 de 8 unidades" ("1 de 1 unidad"). */
export function textoUnidades(ocupacion: OcupacionPanel): string {
  return `${ocupacion.ocupadas} de ${ocupacion.unidades} ${plural(ocupacion.unidades, 'unidad', 'unidades')}`;
}

/** "2 contratos · 4 períodos". */
export function textoMora(mora: MoraPanel): string {
  return `${mora.contratos} ${plural(mora.contratos, 'contrato', 'contratos')} · ${mora.periodos} ${plural(mora.periodos, 'período', 'períodos')}`;
}

export interface MosaicoParaHoy {
  clave: 'comprobantes' | 'solicitudes' | 'porVencer' | 'incrementos' | 'terminaciones';
  cantidad: number;
  texto: string;
  /** Solo en solicitudes, con urgentes: "· 2 urgentes" (tono peligro). */
  urgentes: string | null;
  icono: NombreIcono;
  tono: TonoEstado;
  destino: Href;
}

/**
 * "Para hoy" (R3-A): un mosaico por cada pendiente con conteo mayor que 0, en orden fijo. Las cifras son
 * las del servidor; aquí solo se elige el texto, el icono, el tono y a dónde lleva cada uno.
 */
export function mosaicosParaHoy(p: PendientesPanel): MosaicoParaHoy[] {
  const { total, urgentes } = p.solicitudes_abiertas;
  const todos: MosaicoParaHoy[] = [
    {
      clave: 'comprobantes',
      cantidad: p.comprobantes_por_validar,
      texto: plural(
        p.comprobantes_por_validar,
        'comprobante por validar',
        'comprobantes por validar',
      ),
      urgentes: null,
      icono: 'comprobante',
      tono: 'informacion',
      destino: destinosPanel.comprobantes(),
    },
    {
      clave: 'solicitudes',
      cantidad: total,
      texto: plural(total, 'solicitud abierta', 'solicitudes abiertas'),
      urgentes: urgentes > 0 ? `· ${urgentes} ${plural(urgentes, 'urgente', 'urgentes')}` : null,
      icono: 'mantenimiento',
      tono: 'advertencia',
      destino: destinosPanel.mantenimientos(),
    },
    {
      clave: 'porVencer',
      cantidad: p.contratos_por_vencer.cantidad,
      texto: plural(
        p.contratos_por_vencer.cantidad,
        'contrato vence en 30 días',
        'contratos vencen en 30 días',
      ),
      urgentes: null,
      icono: 'calendario',
      tono: 'advertencia',
      destino: destinoDeLista(p.contratos_por_vencer, destinosPanel.porVencer),
    },
    {
      clave: 'incrementos',
      cantidad: p.incrementos_disponibles.cantidad,
      texto: plural(
        p.incrementos_disponibles.cantidad,
        'incremento disponible',
        'incrementos disponibles',
      ),
      urgentes: null,
      icono: 'pagos',
      tono: 'programado',
      destino: destinoDeLista(p.incrementos_disponibles, destinosPanel.incremento),
    },
    {
      clave: 'terminaciones',
      cantidad: p.terminaciones_por_confirmar.cantidad,
      texto: plural(
        p.terminaciones_por_confirmar.cantidad,
        'terminación por confirmar',
        'terminaciones por confirmar',
      ),
      urgentes: null,
      icono: 'alerta',
      tono: 'peligro',
      destino: destinoDeLista(p.terminaciones_por_confirmar, destinosPanel.terminacion),
    },
  ];
  return todos.filter((m) => m.cantidad > 0);
}

/** Días de mora: peligro desde 30 días, advertencia con menos. */
export const tonoDiasMora = (dias: number): TonoEstado => (dias >= 30 ? 'peligro' : 'advertencia');

/** "1 día" / "38 días". */
export const textoDias = (dias: number) => `${dias} ${plural(dias, 'día', 'días')}`;

/** Cada valor como fracción del más alto (para el alto de las barras). Todo en cero → ceros. */
export function escalarBarras(valores: readonly number[]): number[] {
  const maximo = Math.max(0, ...valores);
  return valores.map((v) => (maximo > 0 ? v / maximo : 0));
}

/** Chip de variación del año: "+12%" (éxito, sube) o "−8%" (peligro, baja); null sin dato del servidor. */
export function textoVariacion(
  variacion: number | null,
): { texto: string; tono: TonoEstado; sube: boolean } | null {
  if (variacion === null) return null;
  return variacion >= 0
    ? { texto: `+${variacion}%`, tono: 'exito', sube: true }
    : { texto: `−${Math.abs(variacion)}%`, tono: 'peligro', sube: false };
}

export interface GrupoOcupacion {
  inmuebleId: string;
  direccion: string;
  unidades: UnidadOcupacionPanel[];
}

/** Las unidades por inmueble, en el orden en que las da el servidor (dirección y nombre). */
export function agruparPorInmueble(unidades: readonly UnidadOcupacionPanel[]): GrupoOcupacion[] {
  const grupos: GrupoOcupacion[] = [];
  for (const u of unidades) {
    let grupo = grupos.find((g) => g.inmuebleId === u.inmueble_id);
    if (!grupo) {
      grupo = { inmuebleId: u.inmueble_id, direccion: u.inmueble_direccion, unidades: [] };
      grupos.push(grupo);
    }
    grupo.unidades.push(u);
  }
  return grupos;
}

/** "unidades ocupadas · 88%" (sin porcentaje si el servidor da null). */
export const textoOcupadas = (porcentaje: number | null) =>
  porcentaje === null ? 'unidades ocupadas' : `unidades ocupadas · ${porcentaje}%`;

/** La insignia de la pestaña Pagos es el conteo de comprobantes por validar; sin Panel, no hay insignia. */
export function conteoDePagos(panel: PanelArrendador | undefined): number | undefined {
  return panel?.pendientes.comprobantes_por_validar;
}

export { plural };
