import type { ContratoResumen } from '../../api/contratos';
import {
  codigoExpirado,
  ETIQUETA_DOCUMENTO,
  filtrarContratos,
  nombreArchivoDocumento,
} from '../lectura';

const c = (id: string, estado: ContratoResumen['estado']): ContratoResumen => ({
  id,
  estado,
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  canon_centavos: 1,
  vinculado: false,
  unidad: { id: 'u', nombre: 'Apto', tipo: 'APARTAMENTO' },
  inquilino: { id: 'q', nombre: 'Camilo' },
  codigo_acceso: null,
});
const LISTA = [
  c('a', 'ACTIVO'),
  c('p', 'PROGRAMADO'),
  c('v', 'VENCIDO'),
  c('t', 'TERMINADO_ANTICIPADAMENTE'),
  c('x', 'CANCELADO'),
];
const ids = (l: ContratoResumen[]) => l.map((i) => i.id);

describe('filtrarContratos', () => {
  it('Todos conserva el orden del servidor', () => {
    expect(ids(filtrarContratos(LISTA, 'TODOS'))).toEqual(['a', 'p', 'v', 't', 'x']);
  });
  it('Activos y Programados', () => {
    expect(ids(filtrarContratos(LISTA, 'ACTIVOS'))).toEqual(['a']);
    expect(ids(filtrarContratos(LISTA, 'PROGRAMADOS'))).toEqual(['p']);
  });
  it('Finalizados: vencido, terminado anticipadamente y cancelado', () => {
    expect(ids(filtrarContratos(LISTA, 'FINALIZADOS'))).toEqual(['v', 't', 'x']);
  });
});

describe('documentos', () => {
  it('tipos legibles', () => {
    expect(ETIQUETA_DOCUMENTO).toEqual({
      CONTRATO_ORIGINAL: 'Contrato original',
      OTROSI_INCREMENTO: 'Otrosí por incremento',
      OTROSI_PRORROGA: 'Otrosí por prórroga',
    });
  });
  it('nombre de archivo sin datos sensibles', () => {
    expect(nombreArchivoDocumento('c1', 2)).toBe('contrato-c1-v2.pdf');
  });
});

describe('codigoExpirado', () => {
  const ahora = new Date('2026-10-01T12:00:00.000Z').getTime();
  it('compara el instante de expiración', () => {
    expect(codigoExpirado('2026-10-01T11:59:59.000Z', ahora)).toBe(true);
    expect(codigoExpirado('2026-10-08T12:00:00.000Z', ahora)).toBe(false);
  });
});
