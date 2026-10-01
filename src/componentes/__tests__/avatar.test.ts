import { FORMAS_RELIEVE, TONOS_RELIEVE } from '../avatar/relieves';
import {
  hashNombre,
  NUMERO_TONOS,
  NUMERO_VARIANTES,
  seleccionarRelieve,
} from '../avatar/seleccion';

describe('selección del avatar de relieve', () => {
  it('hay 12 variantes (6 formas del diseño + giradas) y 6 tonos', () => {
    expect(FORMAS_RELIEVE).toHaveLength(6);
    expect(NUMERO_VARIANTES).toBe(12);
    expect(TONOS_RELIEVE).toHaveLength(6);
    expect(NUMERO_TONOS).toBe(6);
    for (const forma of FORMAS_RELIEVE) {
      expect(forma.curvas.length).toBeGreaterThan(0);
      expect(forma.pico[0]).toBeGreaterThan(0);
      expect(forma.pico[0]).toBeLessThan(48);
    }
  });

  it('es determinista: el mismo nombre da siempre la misma variante y tono', () => {
    const a = seleccionarRelieve('Laura Mejía');
    for (let i = 0; i < 5; i++) expect(seleccionarRelieve('Laura Mejía')).toEqual(a);
    expect(hashNombre('Laura Mejía')).toBe(hashNombre('Laura Mejía'));
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(seleccionarRelieve('  laura   MEJÍA ')).toEqual(seleccionarRelieve('Laura Mejía'));
  });

  it('valores fijos: el hash no cambia entre versiones (las personas no cambian de avatar)', () => {
    expect(hashNombre('')).toBe(0x811c9dc5);
    expect(hashNombre('a')).toBe(0xe40c292c);
    expect(seleccionarRelieve('Marta Ríos')).toEqual(seleccionarRelieve('marta ríos'));
  });

  it('nombres distintos cubren las 12 variantes y los 6 tonos', () => {
    const variantes = new Set<number>();
    const tonos = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const { variante, tono } = seleccionarRelieve(`Persona de prueba ${i}`);
      expect(variante).toBeGreaterThanOrEqual(0);
      expect(variante).toBeLessThan(12);
      expect(tono).toBeGreaterThanOrEqual(0);
      expect(tono).toBeLessThan(6);
      variantes.add(variante);
      tonos.add(tono);
    }
    expect(variantes.size).toBe(12);
    expect(tonos.size).toBe(6);
  });

  it('el reparto es razonablemente parejo (ninguna variante con más del doble de lo esperado)', () => {
    const conteo = new Array(12).fill(0);
    const n = 1200;
    for (let i = 0; i < n; i++) conteo[seleccionarRelieve(`Nombre ${i} Apellido`).variante]++;
    for (const c of conteo) expect(c).toBeLessThan((n / 12) * 2);
  });
});
