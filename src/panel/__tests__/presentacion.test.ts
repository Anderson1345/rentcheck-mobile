import {
  conteoDePagos,
  etiquetaMesCorto,
  mesYAnio,
  nombreDelMes,
  textoMora,
  textoUnidades,
} from '../presentacion';

describe('nombres de mes (AAAA-MM del servidor, en español)', () => {
  it.each([
    ['2026-01', 'enero', 'ene'],
    ['2026-02', 'febrero', 'feb'],
    ['2026-03', 'marzo', 'mar'],
    ['2026-04', 'abril', 'abr'],
    ['2026-05', 'mayo', 'may'],
    ['2026-06', 'junio', 'jun'],
    ['2026-07', 'julio', 'jul'],
    ['2026-08', 'agosto', 'ago'],
    ['2026-09', 'septiembre', 'sep'],
    ['2026-10', 'octubre', 'oct'],
    ['2026-11', 'noviembre', 'nov'],
    ['2026-12', 'diciembre', 'dic'],
  ])('%s → %s / %s', (mes, largo, corto) => {
    expect(nombreDelMes(mes)).toBe(largo);
    expect(etiquetaMesCorto(mes)).toBe(corto);
  });

  it('mesYAnio: "Octubre de 2026"', () => {
    expect(mesYAnio('2026-10')).toBe('Octubre de 2026');
    expect(mesYAnio('2027-01')).toBe('Enero de 2027');
  });

  it.each(['', 'xx', '2026-13', '2026-00', '2026', '2026-1'])(
    'un mes inválido (%j) no rompe: devuelve texto vacío',
    (mes) => {
      expect(nombreDelMes(mes)).toBe('');
      expect(etiquetaMesCorto(mes)).toBe('');
      expect(mesYAnio(mes)).toBe('');
    },
  );
});

describe('textos de conteo', () => {
  it('unidades: "7 de 8 unidades" y el singular', () => {
    expect(
      textoUnidades({
        unidades: 8,
        ocupadas: 7,
        libres: 1,
        con_contrato_programado: 0,
        porcentaje: null,
        unidades_detalle: [],
      }),
    ).toBe('7 de 8 unidades');
    expect(
      textoUnidades({
        unidades: 1,
        ocupadas: 1,
        libres: 0,
        con_contrato_programado: 0,
        porcentaje: null,
        unidades_detalle: [],
      }),
    ).toBe('1 de 1 unidad');
    expect(
      textoUnidades({
        unidades: 0,
        ocupadas: 0,
        libres: 0,
        con_contrato_programado: 0,
        porcentaje: null,
        unidades_detalle: [],
      }),
    ).toBe('0 de 0 unidades');
  });

  it('mora: contratos y períodos, en singular y plural', () => {
    expect(textoMora({ contratos: 2, periodos: 4, total_centavos: 1 })).toBe(
      '2 contratos · 4 períodos',
    );
    expect(textoMora({ contratos: 1, periodos: 1, total_centavos: 1 })).toBe(
      '1 contrato · 1 período',
    );
  });
});

describe('conteoDePagos (la insignia de la pestaña Pagos)', () => {
  it('es el conteo de comprobantes por validar del Panel', () => {
    expect(
      conteoDePagos({ pendientes: { comprobantes_por_validar: 4 } } as Parameters<
        typeof conteoDePagos
      >[0]),
    ).toBe(4);
  });
  it('sin Panel (cargando o con error) no hay insignia', () => {
    expect(conteoDePagos(undefined)).toBeUndefined();
  });
});
