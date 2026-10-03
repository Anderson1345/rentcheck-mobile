import type { RecursoAlerta } from '../../api/alertas';
import { destinoDeAlerta } from '../destino';

const recurso = (r: Partial<RecursoAlerta> & Pick<RecursoAlerta, 'tipo'>): RecursoAlerta => ({
  id: null,
  contrato_id: null,
  ...r,
});

describe('destinoDeAlerta: arrendador', () => {
  it('PAGO → /pago/[id] con el id del pago', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'PAGO', id: 'p1', contrato_id: 'c1' }), 'arrendador'),
    ).toEqual({ pathname: '/pago/[id]', params: { id: 'p1' } });
  });
  it('PAGO sin id → null (no hay a dónde ir)', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'PAGO', contrato_id: 'c1' }), 'arrendador')).toBeNull();
  });

  it('SOLICITUD_MANTENIMIENTO → /mantenimiento/[id]', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'SOLICITUD_MANTENIMIENTO', id: 's1' }), 'arrendador'),
    ).toEqual({ pathname: '/mantenimiento/[id]', params: { id: 's1' } });
  });
  it('SOLICITUD_MANTENIMIENTO sin id → null', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'SOLICITUD_MANTENIMIENTO' }), 'arrendador')).toBeNull();
  });

  it('PERIODO → /contrato/[id]/estado-cuenta con el contrato_id', () => {
    expect(
      destinoDeAlerta(
        recurso({ tipo: 'PERIODO', contrato_id: 'c1', periodo: '2026-10-01' }),
        'arrendador',
      ),
    ).toEqual({
      pathname: '/contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
  });
  it('PERIODO sin contrato_id → null', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'PERIODO', periodo: '2026-10-01' }), 'arrendador'),
    ).toBeNull();
  });

  it('CONTRATO → /contrato/[id] con el id', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'CONTRATO', id: 'c1', contrato_id: 'c1' }), 'arrendador'),
    ).toEqual({ pathname: '/contrato/[id]', params: { id: 'c1' } });
  });
  it('CONTRATO sin id → null', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'CONTRATO' }), 'arrendador')).toBeNull();
  });
});

describe('destinoDeAlerta: inquilino', () => {
  it('PAGO con contrato_id → /mi-contrato/[id]/estado-cuenta (no hay detalle de pago del inquilino)', () => {
    expect(
      destinoDeAlerta(
        recurso({
          tipo: 'PAGO',
          id: 'p1',
          contrato_id: 'c1',
          periodo: '2026-10-01',
        }),
        'inquilino',
      ),
    ).toEqual({
      pathname: '/mi-contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
  });
  it('PAGO sin contrato_id → la pestaña /pagos', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'PAGO', id: 'p1' }), 'inquilino')).toEqual({
      pathname: '/pagos',
    });
  });
  it('PAGO sin contrato_id y sin id → también /pagos (el id no hace falta)', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'PAGO' }), 'inquilino')).toEqual({
      pathname: '/pagos',
    });
  });

  it('SOLICITUD_MANTENIMIENTO → /solicitud/[id]', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'SOLICITUD_MANTENIMIENTO', id: 's1' }), 'inquilino'),
    ).toEqual({ pathname: '/solicitud/[id]', params: { id: 's1' } });
  });
  it('SOLICITUD_MANTENIMIENTO sin id → null', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'SOLICITUD_MANTENIMIENTO' }), 'inquilino')).toBeNull();
  });

  it('PERIODO → /mi-contrato/[id]/estado-cuenta con el contrato_id', () => {
    expect(
      destinoDeAlerta(
        recurso({ tipo: 'PERIODO', contrato_id: 'c1', periodo: '2026-10-01' }),
        'inquilino',
      ),
    ).toEqual({
      pathname: '/mi-contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
  });
  it('PERIODO sin contrato_id → null', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'PERIODO', periodo: '2026-10-01' }), 'inquilino'),
    ).toBeNull();
  });

  it('CONTRATO → /mi-contrato/[id]', () => {
    expect(
      destinoDeAlerta(recurso({ tipo: 'CONTRATO', id: 'c1', contrato_id: 'c1' }), 'inquilino'),
    ).toEqual({ pathname: '/mi-contrato/[id]', params: { id: 'c1' } });
  });
  it('CONTRATO sin id → null', () => {
    expect(destinoDeAlerta(recurso({ tipo: 'CONTRATO' }), 'inquilino')).toBeNull();
  });
});

describe('destinoDeAlerta: casos sin destino', () => {
  it.each(['arrendador', 'inquilino'] as const)(
    'recurso null (%s) → null: la alerta es informativa',
    (rol) => {
      expect(destinoDeAlerta(null, rol)).toBeNull();
    },
  );

  it.each(['arrendador', 'inquilino'] as const)(
    'un tipo de recurso que el servidor agregue después (%s) → null, sin romper',
    (rol) => {
      const futuro = {
        tipo: 'DOCUMENTO',
        id: 'd1',
        contrato_id: 'c1',
      } as unknown as RecursoAlerta;
      expect(destinoDeAlerta(futuro, rol)).toBeNull();
    },
  );

  it.each(['arrendador', 'inquilino'] as const)('un id vacío cuenta como faltante (%s)', (rol) => {
    expect(destinoDeAlerta(recurso({ tipo: 'CONTRATO', id: '' }), rol)).toBeNull();
    expect(destinoDeAlerta(recurso({ tipo: 'SOLICITUD_MANTENIMIENTO', id: '' }), rol)).toBeNull();
  });
});
