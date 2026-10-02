import type { ContratoDetalle } from '../../api/contratos';
import { puedeCorregir, puedeSolicitarTerminacion } from '../acciones';
import {
  camposCambiadosContrato,
  camposCambiadosInquilino,
  erroresCorreccion,
  erroresInquilino,
  valoresDeContrato,
  type ValoresCorreccion,
} from '../correccion';

const HOY = '2026-10-01';
const base: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-09-01T00:00:00.000Z',
  fecha_fin: '2027-08-31T00:00:00.000Z',
  canon_centavos: 250_000_000,
  tipo_plantilla: 'LOCAL_COMERCIAL',
  dia_pago: 5,
  forma_pago: 'Transferencia',
  datos_recaudo: 'Bancolombia 123',
  deposito_centavos: 500_000_000,
  datos_fiador_o_poliza: 'Fiador Juan',
  condicionesParticularesTexto: 'No mascotas',
  vinculado: false,
  inquilino: { id: 'q', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
  unidad: { id: 'u', nombre: 'Local 1', tipo: 'LOCAL' },
  codigo_acceso: null,
  terminacion_anticipada: {
    estado: 'NINGUNA',
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
  },
};
const con = (extra: Partial<ContratoDetalle>): ContratoDetalle => ({ ...base, ...extra });

describe('valoresDeContrato', () => {
  it('precarga el valor actual (fechas AAAA-MM-DD; null como vacío)', () => {
    expect(valoresDeContrato(base)).toEqual({
      canonCentavos: 250_000_000,
      diaPago: '5',
      formaPago: 'Transferencia',
      datosRecaudo: 'Bancolombia 123',
      depositoCentavos: 500_000_000,
      datosFiador: 'Fiador Juan',
      condiciones: 'No mascotas',
      fechaInicio: '2026-09-01',
      fechaFin: '2027-08-31',
    });
    const v = valoresDeContrato(
      con({
        datos_recaudo: null,
        deposito_centavos: null,
        datos_fiador_o_poliza: null,
        condicionesParticularesTexto: null,
      }),
    );
    expect(v.datosRecaudo).toBe('');
    expect(v.depositoCentavos).toBeNull();
    expect(v.datosFiador).toBe('');
  });
});

describe('camposCambiadosContrato: solo lo que cambió', () => {
  const original = valoresDeContrato(base);
  const cambios = (extra: Partial<ValoresCorreccion>, c: ContratoDetalle = base) =>
    camposCambiadosContrato(c, { ...valoresDeContrato(c), ...extra });

  it('sin cambios: objeto vacío', () => {
    expect(cambios({})).toEqual({});
    expect(original.diaPago).toBe('5');
  });

  it('canon, día, forma y recaudo (recortados)', () => {
    expect(
      cambios({
        canonCentavos: 260_000_000,
        diaPago: '10',
        formaPago: ' Consignación ',
        datosRecaudo: ' Davivienda 9 ',
      }),
    ).toEqual({
      canon_centavos: 260_000_000,
      dia_pago: 10,
      forma_pago: 'Consignación',
      datos_recaudo: 'Davivienda 9',
    });
  });

  it('fechas como AAAA-MM-DD', () => {
    expect(cambios({ fechaFin: '2027-12-31' })).toEqual({ fecha_fin: '2027-12-31' });
    expect(cambios({ fechaInicio: '2026-09-15' })).toEqual({ fecha_inicio: '2026-09-15' });
  });

  it('quitar depósito, fiador o condiciones se envía como null; cambiarlos, el texto', () => {
    expect(cambios({ depositoCentavos: null })).toEqual({ deposito_centavos: null });
    expect(cambios({ datosFiador: '  ' })).toEqual({ datos_fiador_o_poliza: null });
    expect(cambios({ condiciones: '' })).toEqual({ condicionesParticularesTexto: null });
    expect(cambios({ condiciones: ' Sin fiestas ' })).toEqual({
      condicionesParticularesTexto: 'Sin fiestas',
    });
  });

  it('en vivienda el depósito no se envía nunca', () => {
    const vivienda = con({ tipo_plantilla: 'VIVIENDA_URBANA_LEY_820', deposito_centavos: null });
    expect(cambios({ depositoCentavos: 100 }, vivienda)).toEqual({});
  });

  it('vacío que ya estaba vacío no es un cambio (no se envía null)', () => {
    const sin = con({
      deposito_centavos: null,
      datos_fiador_o_poliza: null,
      condicionesParticularesTexto: null,
    });
    expect(cambios({ datosFiador: '', condiciones: '', depositoCentavos: null }, sin)).toEqual({});
  });

  it('datos_recaudo que llega null y no se editó: no se envía', () => {
    const sinRecaudo = con({ datos_recaudo: null });
    expect(cambios({}, sinRecaudo)).toEqual({});
    expect(cambios({ datosRecaudo: 'Nuevo' }, sinRecaudo)).toEqual({ datos_recaudo: 'Nuevo' });
  });

  it('nunca incluye campos no editables', () => {
    const todo = cambios({
      canonCentavos: 1,
      diaPago: '2',
      formaPago: 'x',
      datosRecaudo: 'y',
      depositoCentavos: 3,
      datosFiador: 'z',
      condiciones: 'w',
      fechaInicio: '2026-09-02',
      fechaFin: '2027-09-01',
    });
    for (const k of [
      'unidad_id',
      'inquilino_id',
      'inquilino_nuevo',
      'tipo_plantilla',
      'estado',
      'codigo',
    ]) {
      expect(k in todo).toBe(false);
    }
  });
});

describe('erroresCorreccion', () => {
  const v = (extra: Partial<ValoresCorreccion> = {}) => ({ ...valoresDeContrato(base), ...extra });
  const errores = (extra: Partial<ValoresCorreccion>, c: ContratoDetalle = base) =>
    erroresCorreccion(c, { ...valoresDeContrato(c), ...extra }, HOY);

  it('sin cambios no hay errores', () => {
    expect(errores({})).toEqual({});
    expect(v().canonCentavos).toBe(250_000_000);
  });

  it('valida solo lo que cambió: canon > 0, día 1–31, textos no vacíos', () => {
    expect(errores({ canonCentavos: 0 }).canonCentavos).toBeDefined();
    expect(errores({ canonCentavos: null }).canonCentavos).toBeDefined();
    expect(errores({ diaPago: '32' }).diaPago).toBeDefined();
    expect(errores({ formaPago: ' ' }).formaPago).toBeDefined();
    expect(errores({ datosRecaudo: '' }).datosRecaudo).toBeDefined();
  });

  it('un datos_recaudo nulo sin editar no es un error', () => {
    expect(errores({}, con({ datos_recaudo: null }))).toEqual({});
  });

  it('fechas: fin posterior al inicio y a hoy', () => {
    expect(errores({ fechaFin: '2026-09-01' }).fechaFin).toBeDefined();
    expect(errores({ fechaInicio: '2025-01-01', fechaFin: '2026-10-01' }).fechaFin).toBeDefined();
    expect(errores({ fechaFin: '2026-02-30' }).fechaFin).toBeDefined();
    expect(errores({ fechaFin: '2028-01-01' })).toEqual({});
  });

  it('depósito negativo en no vivienda', () => {
    expect(errores({ depositoCentavos: -1 }).depositoCentavos).toBeDefined();
  });
});

describe('inquilino: campos cambiados y validación', () => {
  const original = { nombre: 'Camilo Pardo', telefono: '3001234567', cedula: '1020304050' };

  it('solo lo que cambió; la cédula se normaliza', () => {
    expect(camposCambiadosInquilino(original, { ...original })).toEqual({});
    expect(
      camposCambiadosInquilino(original, {
        nombre: ' Camilo P. ',
        telefono: '3001234567',
        cedula: '1.020.304-050',
      }),
    ).toEqual({ nombre: 'Camilo P.' });
    expect(camposCambiadosInquilino(original, { ...original, cedula: '9.999.999' })).toEqual({
      cedula: '9999999',
    });
  });

  it('errores: nombre y teléfono no vacíos, documento de 5 a 20', () => {
    expect(erroresInquilino(original)).toEqual({});
    expect(
      Object.keys(erroresInquilino({ nombre: ' ', telefono: '', cedula: '12' })).sort(),
    ).toEqual(['cedula', 'nombre', 'telefono']);
  });
});

describe('puedeSolicitarTerminacion y puedeCorregir', () => {
  it('solicitar: ACTIVO y estado NINGUNA (o sin dato)', () => {
    expect(puedeSolicitarTerminacion(base)).toBe(true);
    expect(puedeSolicitarTerminacion(con({ estado: 'PROGRAMADO' }))).toBe(false);
    expect(
      puedeSolicitarTerminacion(
        con({ terminacion_anticipada: { ...base.terminacion_anticipada!, estado: 'SOLICITADA' } }),
      ),
    ).toBe(false);
    expect(
      puedeSolicitarTerminacion(
        con({ terminacion_anticipada: { ...base.terminacion_anticipada!, estado: 'CONFIRMADA' } }),
      ),
    ).toBe(false);
  });

  it('corregir: sin vincular y PROGRAMADO o ACTIVO', () => {
    expect(puedeCorregir(base)).toBe(true);
    expect(puedeCorregir(con({ estado: 'PROGRAMADO' }))).toBe(true);
    expect(puedeCorregir(con({ vinculado: true }))).toBe(false);
    for (const estado of ['VENCIDO', 'CANCELADO', 'TERMINADO_ANTICIPADAMENTE'] as const) {
      expect(puedeCorregir(con({ estado }))).toBe(false);
    }
  });
});
