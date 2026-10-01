import {
  PESTANAS_ARRENDADOR,
  PESTANAS_INQUILINO,
  textoInsignia,
} from '../navegacion/configuracion';

describe('barra inferior', () => {
  it('configuración del arrendador e inquilino según el diseño', () => {
    expect(PESTANAS_ARRENDADOR.map((p) => p.etiqueta)).toEqual([
      'Panel',
      'Inmuebles',
      'Contratos',
      'Pagos',
      'Más',
    ]);
    expect(PESTANAS_INQUILINO.map((p) => p.etiqueta)).toEqual([
      'Mi panel',
      'Pagos',
      'Solicitudes',
      'Más',
    ]);
  });

  it('insignia: nada en 0, el número hasta 9 y "9+" desde 10', () => {
    expect(textoInsignia(undefined)).toBeNull();
    expect(textoInsignia(0)).toBeNull();
    expect(textoInsignia(3)).toBe('3');
    expect(textoInsignia(9)).toBe('9');
    expect(textoInsignia(10)).toBe('9+');
    expect(textoInsignia(250)).toBe('9+');
  });
});

describe('claves de las pestañas del arrendador', () => {
  it('son nombres de ruta únicos; los de contratos, pagos y más no chocan con las rutas del inquilino', () => {
    const claves = PESTANAS_ARRENDADOR.map((p) => p.clave);
    expect(new Set(claves).size).toBe(claves.length);
    expect(claves).toEqual([
      'panel',
      'inmuebles',
      'contratos-arrendador',
      'pagos-arrendador',
      'mas-arrendador',
    ]);
    // Dos grupos de rutas no pueden compartir la misma URL (/pagos, /mas del inquilino).
    const clavesInquilino: string[] = PESTANAS_INQUILINO.map((p) => p.clave);
    for (const clave of claves) expect(clavesInquilino).not.toContain(clave);
  });
});
