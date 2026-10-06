// Alertas por día de Bogotá (R3-B): agrupar en Hoy / Ayer / Esta semana / Antes y la hora o fecha de
// cada fila. `ahora` se inyecta: nada depende de la fecha real.
import { agruparPorDia, resumenGrupo, tiempoDeAlerta, type GrupoAlertas } from '../agrupacion';

// 12:00 en Bogotá del viernes 2 de octubre de 2026.
const AHORA = new Date('2026-10-02T17:00:00Z');

const a = (id: string, creado_en: string, leida = false) => ({ id, creado_en, leida });
const ids = (grupos: GrupoAlertas<{ id: string }>[]) =>
  grupos.map((g) => [g.clave, g.alertas.map((x) => x.id)]);

describe('agruparPorDia', () => {
  it('Hoy, Ayer, Esta semana y Antes, en ese orden y conservando el orden del servidor', () => {
    const grupos = agruparPorDia(
      [
        a('hoy1', '2026-10-02T15:04:00Z'),
        a('ayer1', '2026-10-01T20:00:00Z'),
        a('hoy2', '2026-10-02T13:00:00Z'),
        a('semana1', '2026-09-30T14:00:00Z'),
        a('antes1', '2026-09-20T14:00:00Z'),
        a('semana2', '2026-09-26T17:00:00Z'),
      ],
      AHORA,
    );
    expect(ids(grupos)).toEqual([
      ['hoy', ['hoy1', 'hoy2']],
      ['ayer', ['ayer1']],
      ['semana', ['semana1', 'semana2']],
      ['antes', ['antes1']],
    ]);
    expect(grupos.map((g) => g.titulo)).toEqual(['Hoy', 'Ayer', 'Esta semana', 'Antes']);
  });

  it('la medianoche es la de Bogotá, no la de UTC', () => {
    const grupos = agruparPorDia(
      [
        // 00:00 del 2 en Bogotá (05:00 UTC): ya es hoy.
        a('medianoche', '2026-10-02T05:00:00Z'),
        // 23:59 del 1 en Bogotá (04:59 UTC del 2): todavía es ayer aunque en UTC ya sea el 2.
        a('antesDeMedianoche', '2026-10-02T04:59:00Z'),
      ],
      AHORA,
    );
    expect(ids(grupos)).toEqual([
      ['hoy', ['medianoche']],
      ['ayer', ['antesDeMedianoche']],
    ]);
  });

  it('"Esta semana" son los 6 días anteriores a hoy; desde el séptimo, "Antes"', () => {
    const grupos = agruparPorDia(
      [a('seis', '2026-09-26T17:00:00Z'), a('siete', '2026-09-25T17:00:00Z')],
      AHORA,
    );
    expect(ids(grupos)).toEqual([
      ['semana', ['seis']],
      ['antes', ['siete']],
    ]);
  });

  it('los grupos vacíos no aparecen y sin alertas no hay grupos', () => {
    expect(
      ids(agruparPorDia([a('x', '2026-10-02T16:00:00Z'), a('y', '2026-08-01T16:00:00Z')], AHORA)),
    ).toEqual([
      ['hoy', ['x']],
      ['antes', ['y']],
    ]);
    expect(agruparPorDia([], AHORA)).toEqual([]);
  });

  it('una alerta con la hora del teléfono atrasada (instante futuro) cuenta como de hoy', () => {
    expect(ids(agruparPorDia([a('futura', '2026-10-03T12:00:00Z')], AHORA))).toEqual([
      ['hoy', ['futura']],
    ]);
  });
});

describe('tiempoDeAlerta', () => {
  it('Hoy y Ayer: la hora de Bogotá (h:mm)', () => {
    expect(tiempoDeAlerta('2026-10-02T15:04:00Z', 'hoy')).toBe('10:04');
    expect(tiempoDeAlerta('2026-10-02T14:00:00Z', 'hoy')).toBe('9:00');
    expect(tiempoDeAlerta('2026-10-02T04:59:00Z', 'ayer')).toBe('23:59');
    expect(tiempoDeAlerta('2026-10-02T05:00:00Z', 'hoy')).toBe('0:00');
  });

  it('Esta semana: el día abreviado de Bogotá', () => {
    // 30 de septiembre de 2026 es miércoles; las 03:00 UTC del 28 son las 22:00 del domingo 27.
    expect(tiempoDeAlerta('2026-09-30T14:00:00Z', 'semana')).toBe('mié.');
    expect(tiempoDeAlerta('2026-09-28T03:00:00Z', 'semana')).toBe('dom.');
    expect(tiempoDeAlerta('2026-09-26T17:00:00Z', 'semana')).toBe('sáb.');
  });

  it('Antes: la fecha dd/mm/aaaa de Bogotá', () => {
    expect(tiempoDeAlerta('2026-09-20T14:00:00Z', 'antes')).toBe('20/09/2026');
    expect(tiempoDeAlerta('2026-09-21T03:00:00Z', 'antes')).toBe('20/09/2026');
  });
});

describe('resumenGrupo (lector de pantalla)', () => {
  it('título, cantidad y cuántas sin leer', () => {
    const [hoy] = agruparPorDia(
      [a('1', '2026-10-02T15:00:00Z'), a('2', '2026-10-02T14:00:00Z', true)],
      AHORA,
    );
    expect(resumenGrupo(hoy)).toBe('Hoy: 2 alertas, 1 sin leer');
    const [antes] = agruparPorDia([a('3', '2026-09-01T15:00:00Z', true)], AHORA);
    expect(resumenGrupo(antes)).toBe('Antes: 1 alerta');
  });
});
