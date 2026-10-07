// Mi panel del inquilino (R3-B): solo presentación de lo que da el servidor. El conteo de días y la
// agrupación usan `hoy` inyectado (día de Bogotá): nada depende de la fecha real.
import type { PeriodoCuenta } from '../../api/contratos';
import {
  accionDePeriodo,
  lineaDePagos,
  plazoDePago,
  textoFechaLimite,
  textoHace,
  textoSolicitud,
  textoVencidosPanel,
  tituloProximoPago,
} from '../miPanel';

const HOY = '2026-10-02';

describe('plazoDePago (chip de la tarjeta del próximo pago)', () => {
  it('faltan días: advertencia hasta 5 días, información si falta más', () => {
    expect(plazoDePago('2026-10-07T00:00:00.000Z', HOY)).toEqual({
      texto: 'Faltan 5 días',
      tono: 'advertencia',
    });
    expect(plazoDePago('2026-10-03T00:00:00.000Z', HOY)).toEqual({
      texto: 'Falta 1 día',
      tono: 'advertencia',
    });
    expect(plazoDePago('2026-11-05T00:00:00.000Z', HOY)).toEqual({
      texto: 'Faltan 34 días',
      tono: 'informacion',
    });
  });

  it('el mismo día: "Vence hoy"', () => {
    expect(plazoDePago('2026-10-02T00:00:00.000Z', HOY)).toEqual({
      texto: 'Vence hoy',
      tono: 'advertencia',
    });
  });

  it('ya pasó: "Vencido hace N días" en peligro', () => {
    expect(plazoDePago('2026-09-05T00:00:00.000Z', HOY)).toEqual({
      texto: 'Vencido hace 27 días',
      tono: 'peligro',
    });
    expect(plazoDePago('2026-10-01', HOY)).toEqual({
      texto: 'Vencido hace 1 día',
      tono: 'peligro',
    });
  });
});

describe('accionDePeriodo (R4-A: la tarjeta según el estado del período)', () => {
  it('EN_REVISION: sin plazo, la nota de revisión y "Reemplazar comprobante" secundario', () => {
    expect(accionDePeriodo('EN_REVISION')).toEqual({
      conPlazo: false,
      nota: 'Tu comprobante está en revisión',
      boton: { titulo: 'Reemplazar comprobante', variante: 'secundario' },
    });
  });

  it.each(['PARCIAL', 'PENDIENTE', 'VENCIDO'] as const)(
    '%s: conserva el plazo y "Reportar pago" primario',
    (estado) => {
      expect(accionDePeriodo(estado)).toEqual({
        conPlazo: true,
        nota: null,
        boton: { titulo: 'Reportar pago', variante: 'acento' },
      });
    },
  );
});

describe('textos de la tarjeta', () => {
  it('"Tu próximo pago · Octubre" con el mes del período', () => {
    expect(tituloProximoPago('2026-10-01T00:00:00.000Z')).toBe('Tu próximo pago · Octubre');
    expect(tituloProximoPago('2027-01-01')).toBe('Tu próximo pago · Enero');
  });

  it('"Fecha límite: lunes 5 de octubre" (día calendario, sin correrlo por zona)', () => {
    expect(textoFechaLimite('2026-10-05T00:00:00.000Z')).toBe('Fecha límite: lunes 5 de octubre');
    expect(textoFechaLimite('2026-11-05')).toBe('Fecha límite: jueves 5 de noviembre');
  });

  it('períodos vencidos: cantidad y total pendiente del servidor', () => {
    expect(textoVencidosPanel(2, 300_000_000)).toBe(
      '2 períodos vencidos · Total pendiente $ 3.000.000',
    );
    expect(textoVencidosPanel(1, 50_000_000)).toBe('1 período vencido · Total pendiente $ 500.000');
  });
});

describe('lineaDePagos ("Tus pagos")', () => {
  const periodo = (mes: string, estado: PeriodoCuenta['estado']): PeriodoCuenta => ({
    periodo: `${mes}-01T00:00:00.000Z`,
    fechaLimite: `${mes}-05T00:00:00.000Z`,
    canonVigenteCentavos: 100_000_000,
    estado,
    montoAprobadoCentavos: 0,
  });

  it('los últimos 12 períodos del estado de cuenta, con su inicial y el mes de hoy resaltado', () => {
    const meses = [
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ];
    const linea = lineaDePagos(
      meses.map((m) => periodo(m, m === '2026-10' ? 'PENDIENTE' : 'PAGADO')),
      HOY,
    );
    expect(linea).toHaveLength(12);
    expect(linea.map((p) => p.inicial).join('')).toBe('NDEFMAMJJASO');
    expect(linea[0]).toEqual({ inicial: 'N', mes: 'noviembre', estado: 'PAGADO', actual: false });
    expect(linea[11]).toEqual({ inicial: 'O', mes: 'octubre', estado: 'PENDIENTE', actual: true });
  });

  it('menos de 12 períodos: los que haya; sin períodos, la línea vacía', () => {
    expect(lineaDePagos([periodo('2026-09', 'VENCIDO')], HOY)).toEqual([
      { inicial: 'S', mes: 'septiembre', estado: 'VENCIDO', actual: false },
    ]);
    expect(lineaDePagos([], HOY)).toEqual([]);
  });
});

describe('la última solicitud', () => {
  const AHORA = new Date('2026-10-02T17:00:00Z');

  it('"hace N días" por día de Bogotá', () => {
    expect(textoHace('2026-10-02T13:00:00Z', AHORA)).toBe('hoy');
    // 04:59 UTC del 2 = 23:59 del 1 en Bogotá: ayer.
    expect(textoHace('2026-10-02T04:59:00Z', AHORA)).toBe('ayer');
    expect(textoHace('2026-09-30T15:00:00Z', AHORA)).toBe('hace 2 días');
  });

  it('"Urgencia media · hace 2 días"', () => {
    expect(textoSolicitud('MEDIO', '2026-09-30T15:00:00Z', AHORA)).toBe(
      'Urgencia media · hace 2 días',
    );
    expect(textoSolicitud('ALTO', '2026-10-02T13:00:00Z', AHORA)).toBe('Urgencia alta · hoy');
  });
});
