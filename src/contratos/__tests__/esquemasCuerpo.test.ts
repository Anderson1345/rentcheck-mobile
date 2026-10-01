import {
  type BorradorContrato,
  borradorInicial,
  erroresDePaso,
  normalizarDocumento,
  PASO,
} from '../esquemas';
import { construirCuerpo } from '../cuerpo';

const HOY = '2026-10-01';
const nuevo = (extra: Partial<BorradorContrato> = {}): BorradorContrato => ({
  ...borradorInicial(HOY),
  inmuebleId: 'i1',
  unidadId: 'u1',
  plantilla: 'LOCAL_COMERCIAL',
  modoInquilino: 'nuevo',
  nombre: ' Camilo Pardo ',
  documento: '1.020-304 050',
  telefono: ' 3001234567 ',
  canonCentavos: 250_000_000,
  diaPago: '5',
  formaPago: ' Transferencia ',
  datosRecaudo: ' Bancolombia ahorros 123 ',
  fechaInicio: '2026-11-01',
  fechaFin: '2027-10-31',
  ...extra,
});

describe('normalizarDocumento', () => {
  it('quita puntos, espacios y guiones y pone mayúsculas', () => {
    expect(normalizarDocumento(' 1.020-304 050 ')).toBe('1020304050');
    expect(normalizarDocumento('ab-12.345')).toBe('AB12345');
  });
});

describe('erroresDePaso', () => {
  it('Unidad: exige elegir una', () => {
    expect(erroresDePaso(PASO.UNIDAD, nuevo({ unidadId: null }), HOY).unidadId).toBeDefined();
    expect(erroresDePaso(PASO.UNIDAD, nuevo(), HOY)).toEqual({});
  });

  it('Inquilino nuevo: nombre, teléfono y documento de 5 a 20 alfanuméricos', () => {
    expect(erroresDePaso(PASO.INQUILINO, nuevo(), HOY)).toEqual({});
    const e = erroresDePaso(
      PASO.INQUILINO,
      nuevo({ nombre: ' ', telefono: '', documento: '12-3' }),
      HOY,
    );
    expect(Object.keys(e).sort()).toEqual(['documento', 'nombre', 'telefono']);
    expect(
      erroresDePaso(PASO.INQUILINO, nuevo({ documento: 'A'.repeat(21) }), HOY).documento,
    ).toBeDefined();
    expect(erroresDePaso(PASO.INQUILINO, nuevo({ documento: 'AB123' }), HOY)).toEqual({});
  });

  it('Inquilino existente: exige elegir uno y no pide los datos del nuevo', () => {
    const b = nuevo({ modoInquilino: 'existente', inquilinoId: null, nombre: '', documento: '' });
    expect(Object.keys(erroresDePaso(PASO.INQUILINO, b, HOY))).toEqual(['inquilinoId']);
    expect(erroresDePaso(PASO.INQUILINO, { ...b, inquilinoId: 'q1' }, HOY)).toEqual({});
  });

  it('Pago: canon entero > 0, día 1–31, forma y recaudo no vacíos', () => {
    expect(erroresDePaso(PASO.PAGO, nuevo(), HOY)).toEqual({});
    expect(
      erroresDePaso(PASO.PAGO, nuevo({ canonCentavos: null }), HOY).canonCentavos,
    ).toBeDefined();
    expect(erroresDePaso(PASO.PAGO, nuevo({ canonCentavos: 0 }), HOY).canonCentavos).toBeDefined();
    for (const dia of ['0', '32', 'x', '', '1.5']) {
      expect(erroresDePaso(PASO.PAGO, nuevo({ diaPago: dia }), HOY).diaPago).toBeDefined();
    }
    for (const dia of ['1', '31']) {
      expect(erroresDePaso(PASO.PAGO, nuevo({ diaPago: dia }), HOY).diaPago).toBeUndefined();
    }
    const e = erroresDePaso(PASO.PAGO, nuevo({ formaPago: '  ', datosRecaudo: '' }), HOY);
    expect(Object.keys(e).sort()).toEqual(['datosRecaudo', 'formaPago']);
  });

  it('Pago: el depósito es opcional y entero ≥ 0 (en vivienda se ignora)', () => {
    expect(erroresDePaso(PASO.PAGO, nuevo({ depositoCentavos: null }), HOY)).toEqual({});
    expect(erroresDePaso(PASO.PAGO, nuevo({ depositoCentavos: 0 }), HOY)).toEqual({});
    expect(
      erroresDePaso(PASO.PAGO, nuevo({ depositoCentavos: -5 }), HOY).depositoCentavos,
    ).toBeDefined();
    expect(
      erroresDePaso(
        PASO.PAGO,
        nuevo({ plantilla: 'VIVIENDA_URBANA_LEY_820', depositoCentavos: -5 }),
        HOY,
      ),
    ).toEqual({});
  });

  it('Fechas: fin > inicio y fin > hoy', () => {
    expect(erroresDePaso(PASO.FECHAS, nuevo(), HOY)).toEqual({});
    expect(
      erroresDePaso(PASO.FECHAS, nuevo({ fechaInicio: '2026-11-01', fechaFin: '2026-11-01' }), HOY)
        .fechaFin,
    ).toBeDefined();
    expect(
      erroresDePaso(PASO.FECHAS, nuevo({ fechaInicio: '2026-11-01', fechaFin: '2026-10-01' }), HOY)
        .fechaFin,
    ).toBeDefined();
    // Fin pasado (inicio antiguo): fin ≤ hoy.
    expect(
      erroresDePaso(PASO.FECHAS, nuevo({ fechaInicio: '2025-01-01', fechaFin: '2026-10-01' }), HOY)
        .fechaFin,
    ).toBeDefined();
    expect(
      erroresDePaso(PASO.FECHAS, nuevo({ fechaInicio: '2025-01-01', fechaFin: '2026-10-02' }), HOY),
    ).toEqual({});
  });

  it('Fechas: formato inválido o vacío', () => {
    expect(erroresDePaso(PASO.FECHAS, nuevo({ fechaInicio: '' }), HOY).fechaInicio).toBeDefined();
    expect(
      erroresDePaso(PASO.FECHAS, nuevo({ fechaFin: '2026-02-30' }), HOY).fechaFin,
    ).toBeDefined();
  });

  it('Garantías y Resumen no tienen obligatorios', () => {
    expect(erroresDePaso(PASO.GARANTIAS, nuevo(), HOY)).toEqual({});
    expect(erroresDePaso(PASO.RESUMEN, nuevo(), HOY)).toEqual({});
  });
});

describe('construirCuerpo', () => {
  it('inquilino nuevo: solo inquilino_nuevo (datos normalizados), fechas AAAA-MM-DD', () => {
    const cuerpo = construirCuerpo(nuevo());
    expect(cuerpo).toEqual({
      unidad_id: 'u1',
      inquilino_nuevo: { nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
      tipo_plantilla: 'LOCAL_COMERCIAL',
      canon_centavos: 250_000_000,
      dia_pago: 5,
      forma_pago: 'Transferencia',
      datos_recaudo: 'Bancolombia ahorros 123',
      fecha_inicio: '2026-11-01',
      fecha_fin: '2027-10-31',
    });
    expect('inquilino_id' in cuerpo).toBe(false);
  });

  it('inquilino existente: solo inquilino_id', () => {
    const cuerpo = construirCuerpo(nuevo({ modoInquilino: 'existente', inquilinoId: 'q1' }));
    expect(cuerpo.inquilino_id).toBe('q1');
    expect('inquilino_nuevo' in cuerpo).toBe(false);
  });

  it('depósito: se envía en local/parqueadero; se omite si es 0/vacío o si es vivienda', () => {
    expect(construirCuerpo(nuevo({ depositoCentavos: 500_000_000 })).deposito_centavos).toBe(
      500_000_000,
    );
    expect(
      construirCuerpo(nuevo({ plantilla: 'PARQUEADERO', depositoCentavos: 100 })).deposito_centavos,
    ).toBe(100);
    for (const d of [0, null]) {
      expect('deposito_centavos' in construirCuerpo(nuevo({ depositoCentavos: d }))).toBe(false);
    }
    const vivienda = construirCuerpo(
      nuevo({ plantilla: 'VIVIENDA_URBANA_LEY_820', depositoCentavos: 500_000_000 }),
    );
    expect('deposito_centavos' in vivienda).toBe(false);
  });

  it('textos opcionales: vacíos se omiten; con valor se envían recortados con el nombre exacto', () => {
    const vacio = construirCuerpo(nuevo({ datosFiador: '  ', condiciones: '' }));
    expect('datos_fiador_o_poliza' in vacio).toBe(false);
    expect('condicionesParticularesTexto' in vacio).toBe(false);
    const lleno = construirCuerpo(
      nuevo({ datosFiador: ' Fiador Juan ', condiciones: ' No mascotas ' }),
    );
    expect(lleno.datos_fiador_o_poliza).toBe('Fiador Juan');
    expect(lleno.condicionesParticularesTexto).toBe('No mascotas');
  });

  it('el canon viaja como entero en centavos', () => {
    expect(Number.isInteger(construirCuerpo(nuevo()).canon_centavos)).toBe(true);
  });
});
