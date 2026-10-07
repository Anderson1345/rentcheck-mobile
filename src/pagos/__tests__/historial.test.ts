// Historial de pagos del inquilino (R4-A): orden para mostrar y comprobantes reemplazados plegados por
// período. Solo presentación: el estado de cada pago es el del servidor.
import { plegarReemplazados, textoReemplazados } from '../historial';

type Estado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMPLAZADO';
const pago = (id: string, mes: string, estado: Estado, creado: string) => ({
  id,
  periodo: `2026-${mes}-01T00:00:00.000Z`,
  estado,
  creado_en: `2026-${creado}T15:00:00.000Z`,
});

const forma = (elementos: ReturnType<typeof plegarReemplazados<ReturnType<typeof pago>>>) =>
  elementos.map((e) => (e.tipo === 'pago' ? e.pago.id : `[${e.pagos.map((p) => p.id).join(',')}]`));

describe('plegarReemplazados', () => {
  it('del período más reciente al más antiguo; dentro del período, del más nuevo; los reemplazados plegados al final de su período', () => {
    const elementos = plegarReemplazados([
      pago('sep-aprobado', '09', 'APROBADO', '09-06'),
      pago('oct-reemplazado-1', '10', 'REEMPLAZADO', '10-02'),
      pago('ago-rechazado', '08', 'RECHAZADO', '08-07'),
      pago('oct-revision', '10', 'PENDIENTE', '10-06'),
      pago('sep-reemplazado', '09', 'REEMPLAZADO', '09-03'),
      pago('oct-reemplazado-2', '10', 'REEMPLAZADO', '10-04'),
    ]);
    expect(forma(elementos)).toEqual([
      'oct-revision',
      '[oct-reemplazado-2,oct-reemplazado-1]',
      'sep-aprobado',
      '[sep-reemplazado]',
      'ago-rechazado',
    ]);
    const grupo = elementos[1];
    expect(grupo.tipo === 'reemplazados' && grupo.periodo).toBe('2026-10-01T00:00:00.000Z');
  });

  it('nunca oculta un pago aprobado, en revisión ni rechazado: todos quedan como fila propia', () => {
    const pagos = [
      pago('a', '10', 'APROBADO', '10-01'),
      pago('b', '10', 'PENDIENTE', '10-02'),
      pago('c', '10', 'RECHAZADO', '10-03'),
      pago('d', '10', 'REEMPLAZADO', '10-04'),
    ];
    const visibles = plegarReemplazados(pagos)
      .filter((e) => e.tipo === 'pago')
      .map((e) => (e.tipo === 'pago' ? e.pago.id : ''));
    expect(visibles.sort()).toEqual(['a', 'b', 'c']);
    const grupos = plegarReemplazados(pagos).filter((e) => e.tipo === 'reemplazados');
    expect(grupos).toHaveLength(1);
  });

  it('un período con solo reemplazados también se pliega; sin pagos no hay nada', () => {
    expect(forma(plegarReemplazados([pago('x', '07', 'REEMPLAZADO', '07-03')]))).toEqual(['[x]']);
    expect(plegarReemplazados([])).toEqual([]);
  });
});

describe('textoReemplazados', () => {
  it('singular y plural', () => {
    expect(textoReemplazados(1)).toBe('1 comprobante reemplazado');
    expect(textoReemplazados(3)).toBe('3 comprobantes reemplazados');
  });
});
