// Lectura de contratos: filtros de la lista, etiquetas de documentos y vigencia del código.

import type { ContratoResumen, TipoDocumentoContrato } from '../api/contratos';

export type FiltroContratos = 'TODOS' | 'ACTIVOS' | 'PROGRAMADOS' | 'FINALIZADOS';

export const FILTROS: readonly { valor: FiltroContratos; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'ACTIVOS', etiqueta: 'Activos' },
  { valor: 'PROGRAMADOS', etiqueta: 'Programados' },
  { valor: 'FINALIZADOS', etiqueta: 'Finalizados' },
];

const FINALIZADOS = ['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'];

/** Se filtra en la app; el orden es el del servidor (más reciente primero). */
export function filtrarContratos(
  contratos: ContratoResumen[],
  filtro: FiltroContratos,
): ContratoResumen[] {
  switch (filtro) {
    case 'ACTIVOS':
      return contratos.filter((c) => c.estado === 'ACTIVO');
    case 'PROGRAMADOS':
      return contratos.filter((c) => c.estado === 'PROGRAMADO');
    case 'FINALIZADOS':
      return contratos.filter((c) => FINALIZADOS.includes(c.estado));
    default:
      return contratos;
  }
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
