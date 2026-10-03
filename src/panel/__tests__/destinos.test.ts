import { destinosPanel } from '../destinos';

describe('destinos de los pendientes del Panel (todas son pantallas que ya existen)', () => {
  it('comprobantes por validar → la pestaña Pagos del arrendador (su segmento por defecto es En revisión)', () => {
    expect(destinosPanel.comprobantes()).toEqual({ pathname: '/pagos-arrendador' });
  });

  it('mantenimientos pendientes → /mantenimiento', () => {
    expect(destinosPanel.mantenimientos()).toEqual({ pathname: '/mantenimiento' });
  });

  it('contrato por vencer → /contrato/[id]', () => {
    expect(destinosPanel.porVencer('c1')).toEqual({
      pathname: '/contrato/[id]',
      params: { id: 'c1' },
    });
  });

  it('incremento disponible → /contrato/[id]/incremento', () => {
    expect(destinosPanel.incremento('c2')).toEqual({
      pathname: '/contrato/[id]/incremento',
      params: { id: 'c2' },
    });
  });

  it('terminación por confirmar → /contrato/[id]/terminacion', () => {
    expect(destinosPanel.terminacion('c3')).toEqual({
      pathname: '/contrato/[id]/terminacion',
      params: { id: 'c3' },
    });
  });

  it.each(['porVencer', 'incremento', 'terminacion'] as const)(
    '%s con un id vacío no navega (null)',
    (clave) => {
      expect(destinosPanel[clave]('')).toBeNull();
    },
  );
});
