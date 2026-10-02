import type { ContratoDetalle } from '../../api/contratos';
import {
  accionesDisponibles,
  formatearPorcentaje,
  huboCambio,
  mesDePeriodo,
  parsearMeses,
  parsearPorcentaje,
} from '../acciones';

const base: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  canon_centavos: 100_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  vinculado: false,
  inquilino: { id: 'q', nombre: 'Camilo' },
  unidad: { id: 'u', nombre: 'Apto', tipo: 'APARTAMENTO' },
  codigo_acceso: null,
  incrementos_ipc: [],
  aviso_no_renovacion: {
    estado: 'NINGUNO',
    dado_por: null,
    dado_en: null,
    motivo: null,
    puede_dar: true,
    puede_cancelar: false,
  },
};
const con = (extra: Partial<ContratoDetalle>): ContratoDetalle => ({ ...base, ...extra });

describe('accionesDisponibles: por estado y por los booleanos del servidor', () => {
  it('ACTIVO: incremento, prórroga y dar aviso (puede_dar)', () => {
    expect(accionesDisponibles(base)).toEqual({
      incremento: true,
      prorroga: true,
      darAviso: true,
      cancelarAviso: false,
      cancelarProgramado: false,
    });
  });

  it('ACTIVO con aviso propio vigente: cancelar aviso (puede_cancelar), no dar', () => {
    const c = con({
      aviso_no_renovacion: {
        ...base.aviso_no_renovacion!,
        estado: 'DADO',
        puede_dar: false,
        puede_cancelar: true,
      },
    });
    const a = accionesDisponibles(c);
    expect(a.cancelarAviso).toBe(true);
    expect(a.darAviso).toBe(false);
  });

  it('aviso vigente dado por el inquilino (puede_cancelar=false): solo informativo', () => {
    const c = con({
      aviso_no_renovacion: {
        ...base.aviso_no_renovacion!,
        estado: 'DADO',
        puede_dar: false,
        puede_cancelar: false,
      },
    });
    const a = accionesDisponibles(c);
    expect(a.cancelarAviso).toBe(false);
    expect(a.darAviso).toBe(false);
  });

  it('los booleanos mandan: sin puede_dar no hay botón aunque esté ACTIVO', () => {
    const c = con({ aviso_no_renovacion: undefined });
    expect(accionesDisponibles(c).darAviso).toBe(false);
  });

  it('PROGRAMADO: solo cancelar programado', () => {
    expect(accionesDisponibles(con({ estado: 'PROGRAMADO' }))).toEqual({
      incremento: false,
      prorroga: false,
      darAviso: false,
      cancelarAviso: false,
      cancelarProgramado: true,
    });
  });

  it.each(['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'] as const)(
    '%s: ninguna acción',
    (estado) => {
      expect(Object.values(accionesDisponibles(con({ estado })))).not.toContain(true);
    },
  );
});

describe('parsearPorcentaje', () => {
  it.each([
    ['5', 5],
    ['5,5', 5.5],
    ['5.25', 5.25],
    [' 100 ', 100],
    ['0,01', 0.01],
  ])('"%s" → %d', (texto, valor) => {
    expect(parsearPorcentaje(texto)).toEqual({ valor });
  });

  it.each(['', '  ', '0', '0,00', '-3', '100,01', '101', '5,555', 'abc', '5%', '1,2,3'])(
    '"%s" no es válido',
    (texto) => {
      expect('error' in parsearPorcentaje(texto)).toBe(true);
    },
  );

  it('mensajes en español', () => {
    expect(parsearPorcentaje('')).toEqual({ error: 'Escribe el porcentaje.' });
    expect(parsearPorcentaje('150')).toEqual({
      error: 'El porcentaje debe ser mayor que 0 y no pasar de 100, con hasta 2 decimales.',
    });
  });
});

describe('parsearMeses', () => {
  it.each([
    ['1', 1],
    ['60', 60],
    [' 18 ', 18],
  ])('"%s" → %d', (t, v) => expect(parsearMeses(t)).toEqual({ valor: v }));
  it.each(['', '0', '61', '1,5', 'x', '-2'])('"%s" no es válido', (t) => {
    expect('error' in parsearMeses(t)).toBe(true);
  });
});

describe('formatearPorcentaje (puede llegar como texto)', () => {
  it('quita ceros sobrantes y usa coma', () => {
    expect(formatearPorcentaje('4.00')).toBe('4');
    expect(formatearPorcentaje('5.50')).toBe('5,5');
    expect(formatearPorcentaje(5.25)).toBe('5,25');
    expect(formatearPorcentaje('9.0900')).toBe('9,09');
  });
  it('un valor que no es número devuelve null', () => {
    expect(formatearPorcentaje('abc')).toBeNull();
    expect(formatearPorcentaje(undefined)).toBeNull();
  });
});

describe('mesDePeriodo', () => {
  it('"2026-10-01T00:00:00.000Z" → "Octubre de 2026"', () => {
    expect(mesDePeriodo('2026-10-01T00:00:00.000Z')).toBe('Octubre de 2026');
    expect(mesDePeriodo('2027-01-01T00:00:00.000Z')).toBe('Enero de 2027');
  });
});

describe('huboCambio: verificación tras "sin respuesta"', () => {
  it('incremento: cambia el canon o hay un incremento más', () => {
    expect(huboCambio('incremento', base, base)).toBe(false);
    expect(huboCambio('incremento', base, con({ canon_centavos: 104_000_000 }))).toBe(true);
    const inc = {
      id: 'i',
      fecha_aplicacion: '2026-10-01T00:00:00.000Z',
      canon_anterior_centavos: 1,
      canon_nuevo_centavos: 1,
      porcentaje_ipc_aplicado: '4',
    };
    expect(huboCambio('incremento', base, con({ incrementos_ipc: [inc] }))).toBe(true);
  });

  it('prórroga: cambia la fecha de fin', () => {
    expect(huboCambio('prorroga', base, base)).toBe(false);
    expect(huboCambio('prorroga', base, con({ fecha_fin: '2027-12-31T00:00:00.000Z' }))).toBe(true);
  });

  it('dar aviso: pasa de NINGUNO a DADO; cancelar: de DADO a NINGUNO', () => {
    const dado = con({
      aviso_no_renovacion: { ...base.aviso_no_renovacion!, estado: 'DADO' },
    });
    expect(huboCambio('darAviso', base, base)).toBe(false);
    expect(huboCambio('darAviso', base, dado)).toBe(true);
    expect(huboCambio('cancelarAviso', dado, dado)).toBe(false);
    expect(huboCambio('cancelarAviso', dado, base)).toBe(true);
  });

  it('cancelar programado: el estado pasa a CANCELADO', () => {
    const programado = con({ estado: 'PROGRAMADO' });
    expect(huboCambio('cancelarProgramado', programado, programado)).toBe(false);
    expect(huboCambio('cancelarProgramado', programado, con({ estado: 'CANCELADO' }))).toBe(true);
  });
});
