import { compararFechas, formatearFechaCorta, formatearFechaLarga, hoyBogota } from '../fechas';

describe('hoyBogota', () => {
  it('devuelve AAAA-MM-DD de Bogotá a mediodía', () => {
    expect(hoyBogota(new Date('2026-10-01T17:00:00Z'))).toBe('2026-10-01');
  });

  it('a las 00:00 de Bogotá ya es el día nuevo, aunque en UTC sean las 05:00', () => {
    expect(hoyBogota(new Date('2026-10-01T05:00:00Z'))).toBe('2026-10-01');
  });

  it('un minuto antes de la medianoche de Bogotá sigue siendo el día anterior', () => {
    expect(hoyBogota(new Date('2026-10-01T04:59:59Z'))).toBe('2026-09-30');
  });

  it('medianoche en Bogotá frente a UTC: a las 22:00 de Bogotá, UTC ya cambió de día', () => {
    const instante = new Date('2026-10-01T03:00:00Z'); // 22:00 del 30/09 en Bogotá
    expect(instante.toISOString().slice(0, 10)).toBe('2026-10-01'); // UTC dice otro día
    expect(hoyBogota(instante)).toBe('2026-09-30');
  });

  it('cruza fin de año y año bisiesto', () => {
    expect(hoyBogota(new Date('2027-01-01T04:00:00Z'))).toBe('2026-12-31');
    expect(hoyBogota(new Date('2028-03-01T04:59:00Z'))).toBe('2028-02-29');
  });

  it('no depende de la zona horaria del proceso', () => {
    const antes = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Auckland';
      expect(hoyBogota(new Date('2026-10-01T03:00:00Z'))).toBe('2026-09-30');
      process.env.TZ = 'Asia/Tokyo';
      expect(hoyBogota(new Date('2026-10-01T03:00:00Z'))).toBe('2026-09-30');
    } finally {
      if (antes === undefined) delete process.env.TZ;
      else process.env.TZ = antes;
    }
  });
});

describe('formatearFechaLarga', () => {
  it('formatea una fecha de negocio como "1 de octubre de 2026"', () => {
    expect(formatearFechaLarga('2026-10-01')).toBe('1 de octubre de 2026');
    expect(formatearFechaLarga('2026-01-15')).toBe('15 de enero de 2026');
    expect(formatearFechaLarga('2026-12-31')).toBe('31 de diciembre de 2026');
  });

  it('toma el día calendario de una fecha ISO de la API (@db.Date) sin correrlo de día', () => {
    expect(formatearFechaLarga('2026-10-01T00:00:00.000Z')).toBe('1 de octubre de 2026');
    expect(formatearFechaLarga('2026-10-01T00:00:00Z')).toBe('1 de octubre de 2026');
  });

  it('un texto ISO con hora (que no es medianoche UTC exacta) es un instante y se pasa a Bogotá', () => {
    // 03:00 UTC del 2 de octubre = 22:00 del 1 de octubre en Bogotá
    expect(formatearFechaLarga('2026-10-02T03:00:00Z')).toBe('1 de octubre de 2026');
    expect(formatearFechaLarga('2026-10-02T03:00:00.000Z')).toBe('1 de octubre de 2026');
    // 05:00 UTC = medianoche en Bogotá: ya es el mismo día
    expect(formatearFechaLarga('2026-10-02T05:00:00Z')).toBe('2 de octubre de 2026');
    // Con desfase explícito
    expect(formatearFechaLarga('2026-10-01T23:30:00-05:00')).toBe('1 de octubre de 2026');
    expect(formatearFechaLarga('2026-10-02T00:30:00+02:00')).toBe('1 de octubre de 2026');
  });

  it('medianoche con otro desfase no es un @db.Date: es un instante', () => {
    // 00:00 en UTC+2 = 22:00 UTC del día anterior = 17:00 en Bogotá del día anterior
    expect(formatearFechaLarga('2026-10-02T00:00:00+02:00')).toBe('1 de octubre de 2026');
  });

  it('rechaza textos ISO con hora inválidos', () => {
    expect(() => formatearFechaLarga('2026-10-02T25:00:00Z')).toThrow();
    expect(() => formatearFechaLarga('2026-10-02Tbasura')).toThrow();
  });

  it('un instante (Date) se convierte al día de Bogotá', () => {
    expect(formatearFechaLarga(new Date('2026-10-01T03:00:00Z'))).toBe('30 de septiembre de 2026');
  });

  it('rechaza fechas inválidas', () => {
    expect(() => formatearFechaLarga('2026-13-01')).toThrow();
    expect(() => formatearFechaLarga('2026-02-30')).toThrow();
    expect(() => formatearFechaLarga('hoy')).toThrow();
    expect(() => formatearFechaLarga(new Date('no es fecha'))).toThrow();
  });
});

describe('formatearFechaCorta', () => {
  it('formatea como "01/10/2026"', () => {
    expect(formatearFechaCorta('2026-10-01')).toBe('01/10/2026');
    expect(formatearFechaCorta('2026-12-31')).toBe('31/12/2026');
  });

  it('un instante (Date) se convierte al día de Bogotá', () => {
    expect(formatearFechaCorta(new Date('2026-10-01T03:00:00Z'))).toBe('30/09/2026');
    expect(formatearFechaCorta(new Date('2026-10-01T05:00:00Z'))).toBe('01/10/2026');
  });
});

describe('compararFechas', () => {
  it('ordena fechas de negocio', () => {
    expect(compararFechas('2026-09-30', '2026-10-01')).toBeLessThan(0);
    expect(compararFechas('2026-10-01', '2026-09-30')).toBeGreaterThan(0);
    expect(compararFechas('2026-10-01', '2026-10-01')).toBe(0);
  });

  it('compara el día calendario aunque una venga como ISO completo', () => {
    expect(compararFechas('2026-10-01T00:00:00.000Z', '2026-10-01')).toBe(0);
  });

  it('un instante cuenta por su día en Bogotá', () => {
    expect(compararFechas(new Date('2026-10-01T03:00:00Z'), '2026-09-30')).toBe(0);
  });

  it('un texto ISO con hora cuenta por su día en Bogotá', () => {
    expect(compararFechas('2026-10-02T03:00:00Z', '2026-10-01')).toBe(0);
    expect(compararFechas('2026-10-02T03:00:00Z', '2026-10-02T00:00:00.000Z')).toBeLessThan(0);
  });
});

describe('formatearFechaCorta con texto ISO con hora', () => {
  it('pasa el instante al día de Bogotá', () => {
    expect(formatearFechaCorta('2026-10-02T03:00:00Z')).toBe('01/10/2026');
  });
});
