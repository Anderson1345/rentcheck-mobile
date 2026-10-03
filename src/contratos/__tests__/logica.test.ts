import type { ContratoResumen } from '../../api/contratos';
import { contratoListaEjemplo } from '../../pruebas/datosContratos';
import { borradorInicial } from '../esquemas';
import { fechaFinPorMeses, sumarDias, sumarMeses } from '../fechasContrato';
import { ocupacionPorUnidad, textoOcupacion } from '../ocupacion';
import { esPlantillaVivienda, ETIQUETA_PLANTILLA, plantillaParaUnidad } from '../plantilla';
import { buscarContratoCreado } from '../recuperacion';

describe('plantillaParaUnidad (espejo de plantilla-unidad.ts del backend)', () => {
  it.each([
    ['PARQUEADERO', 'RESIDENCIAL', 'PARQUEADERO'],
    ['PARQUEADERO', 'COMERCIAL', 'PARQUEADERO'],
    ['APARTAMENTO', 'RESIDENCIAL', 'VIVIENDA_URBANA_LEY_820'],
    ['CASA', 'RESIDENCIAL', 'VIVIENDA_URBANA_LEY_820'],
    ['HABITACION', 'RESIDENCIAL', 'VIVIENDA_URBANA_LEY_820'],
    ['LOCAL', 'COMERCIAL', 'LOCAL_COMERCIAL'],
    ['APARTAMENTO', 'COMERCIAL', 'LOCAL_COMERCIAL'],
    ['LOCAL', 'RESIDENCIAL', 'VIVIENDA_URBANA_LEY_820'],
  ] as const)('%s + %s → %s', (tipo, uso, esperada) => {
    expect(plantillaParaUnidad(tipo, uso)).toBe(esperada);
  });

  it('etiquetas en español y solo la de vivienda es "vivienda"', () => {
    expect(ETIQUETA_PLANTILLA).toEqual({
      VIVIENDA_URBANA_LEY_820: 'Vivienda urbana (Ley 820 de 2003)',
      LOCAL_COMERCIAL: 'Local comercial',
      PARQUEADERO: 'Parqueadero',
    });
    expect(esPlantillaVivienda('VIVIENDA_URBANA_LEY_820')).toBe(true);
    expect(esPlantillaVivienda('LOCAL_COMERCIAL')).toBe(false);
    expect(esPlantillaVivienda('PARQUEADERO')).toBe(false);
  });
});

// Copia de mesesDeTermino / sumarMesesUTC del backend (src/common/fechas-contrato.util.ts).
function ultimoDia(anio: number, mes0: number) {
  return new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate();
}
function sumarMesesUTC(f: Date, meses: number): Date {
  const destino = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + meses, 1));
  const ultimoDestino = ultimoDia(destino.getUTCFullYear(), destino.getUTCMonth());
  const dia = f.getUTCDate();
  const esUltimo = dia === ultimoDia(f.getUTCFullYear(), f.getUTCMonth());
  return new Date(
    Date.UTC(
      destino.getUTCFullYear(),
      destino.getUTCMonth(),
      esUltimo ? ultimoDestino : Math.min(dia, ultimoDestino),
    ),
  );
}
function sumarDiasUTC(f: Date, dias: number): Date {
  return new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate() + dias));
}
function mesesDeTermino(inicio: Date, fin: Date): number {
  const siguiente = sumarDiasUTC(fin, 1);
  let meses =
    (siguiente.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
    (siguiente.getUTCMonth() - inicio.getUTCMonth());
  while (meses > 1 && sumarMesesUTC(inicio, meses).getTime() > siguiente.getTime()) meses -= 1;
  return Math.max(1, meses);
}
const aFecha = (t: string) => new Date(`${t}T00:00:00.000Z`);

describe('fechasContrato', () => {
  it('sumarMeses: día inexistente → último del mes; último día → último día', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2028-01-31', 1)).toBe('2028-02-29');
    expect(sumarMeses('2028-02-29', 12)).toBe('2029-02-28');
    expect(sumarMeses('2027-06-30', 6)).toBe('2027-12-31');
    expect(sumarMeses('2026-01-10', 12)).toBe('2027-01-10');
    expect(sumarMeses('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('fechaFinPorMeses: fin inclusivo (inicio + n meses − 1 día)', () => {
    expect(fechaFinPorMeses('2026-01-10', 12)).toBe('2027-01-09');
    expect(fechaFinPorMeses('2026-01-01', 12)).toBe('2026-12-31');
    expect(fechaFinPorMeses('2026-01-31', 1)).toBe('2026-02-27');
  });

  const INICIOS = ['2026-01-31', '2028-02-29', '2026-06-30', '2026-01-01', '2026-01-10'];
  it.each(INICIOS.flatMap((i) => [1, 6, 12, 24].map((n) => [i, n] as const)))(
    'mesesDeTermino del backend devuelve n para inicio %s y n=%i',
    (inicio, n) => {
      const fin = fechaFinPorMeses(inicio, n);
      expect(mesesDeTermino(aFecha(inicio), aFecha(fin))).toBe(n);
    },
  );
});

// R2-B: el elemento de GET /contratos es el tipo generado (ContratoListaDto); se parte del ejemplo completo.
const contrato = ({
  unidadId,
  ...extra
}: Partial<ContratoResumen> & { unidadId?: string }): ContratoResumen =>
  contratoListaEjemplo({
    fecha_inicio: '2026-01-01T00:00:00.000Z',
    fecha_fin: '2026-12-31T00:00:00.000Z',
    canon_centavos: 100_000_000,
    unidad: { id: unidadId ?? 'u1', nombre: 'Apto', tipo: 'APARTAMENTO' },
    ...extra,
  });

describe('ocupacionPorUnidad', () => {
  it('solo cuenta ACTIVO y PROGRAMADO; sugiere el día siguiente al último fin', () => {
    const o = ocupacionPorUnidad([
      contrato({ id: 'a', estado: 'ACTIVO', fecha_fin: '2026-12-31T00:00:00.000Z' }),
      contrato({
        id: 'b',
        estado: 'PROGRAMADO',
        fecha_inicio: '2027-01-01T00:00:00.000Z',
        fecha_fin: '2027-12-31T00:00:00.000Z',
      }),
      contrato({ id: 'c', estado: 'CANCELADO', fecha_fin: '2030-01-01T00:00:00.000Z' }),
      contrato({ id: 'd', estado: 'VENCIDO', fecha_fin: '2031-01-01T00:00:00.000Z' }),
    ]);
    expect(o.u1.contratos).toHaveLength(2);
    expect(o.u1.fechaInicioSugerida).toBe('2028-01-01');
  });

  it('unidad sin contratos vigentes: no aparece', () => {
    expect(ocupacionPorUnidad([contrato({ estado: 'CANCELADO' })])).toEqual({});
  });

  it('separa por unidad', () => {
    const o = ocupacionPorUnidad([contrato({ unidadId: 'u1' }), contrato({ unidadId: 'u2' })]);
    expect(Object.keys(o).sort()).toEqual(['u1', 'u2']);
  });

  it('textoOcupacion: arrendada hasta (activo) o programada desde', () => {
    const activa = ocupacionPorUnidad([contrato({ fecha_fin: '2027-09-30T00:00:00.000Z' })]).u1;
    expect(textoOcupacion(activa)).toBe('Arrendada hasta 30/09/2027');
    const programada = ocupacionPorUnidad([
      contrato({
        estado: 'PROGRAMADO',
        fecha_inicio: '2026-11-01T00:00:00.000Z',
        fecha_fin: '2027-10-31T00:00:00.000Z',
      }),
    ]).u1;
    expect(textoOcupacion(programada)).toBe('Programada desde 01/11/2026');
  });
});

describe('buscarContratoCreado', () => {
  const base = {
    ...borradorInicial('2026-10-01'),
    unidadId: 'u1',
    modoInquilino: 'nuevo' as const,
    nombre: '  Camilo Pardo ',
    canonCentavos: 100_000_000,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
  };

  it('coincide: misma unidad, fechas, canon, estado vigente y nombre', () => {
    expect(buscarContratoCreado(base, [contrato({ id: 'x' })])).toBe('x');
  });

  it('coincide también con PROGRAMADO', () => {
    expect(buscarContratoCreado(base, [contrato({ id: 'p', estado: 'PROGRAMADO' })])).toBe('p');
  });

  it.each([
    ['otra unidad', { unidadId: 'u9' }],
    ['otro canon', { canon_centavos: 1 }],
    ['otra fecha de inicio', { fecha_inicio: '2026-01-02T00:00:00.000Z' }],
    ['otra fecha de fin', { fecha_fin: '2027-01-01T00:00:00.000Z' }],
    ['CANCELADO', { estado: 'CANCELADO' as const }],
    ['VENCIDO', { estado: 'VENCIDO' as const }],
    ['otro nombre', { inquilino: { id: 'q1', nombre: 'Otra Persona' } }],
  ])('no coincide con %s', (_n, extra) => {
    expect(buscarContratoCreado(base, [contrato(extra)])).toBeNull();
  });

  it('inquilino existente: compara por id, no por nombre', () => {
    const existente = { ...base, modoInquilino: 'existente' as const, inquilinoId: 'q1' };
    expect(
      buscarContratoCreado(existente, [
        contrato({ id: 'y', inquilino: { id: 'q1', nombre: 'Nombre viejo' } }),
      ]),
    ).toBe('y');
    expect(
      buscarContratoCreado(existente, [
        contrato({ inquilino: { id: 'q2', nombre: 'Camilo Pardo' } }),
      ]),
    ).toBeNull();
  });

  it('sin lista o vacía: null', () => {
    expect(buscarContratoCreado(base, [])).toBeNull();
  });
});
