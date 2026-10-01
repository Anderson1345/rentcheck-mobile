import {
  MEDIDAS_PLANO,
  porcentajeEntero,
  promedio,
  puntosDeSerie,
  recortarEtiqueta,
  repartirPlano,
  segmentosAnillo,
  trazoArea,
  trazoSuave,
  yDeValor,
} from '../graficas/geometria';

/** Extrae los números de un trazo SVG para compararlos con tolerancia. */
const numeros = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('puntosDeSerie', () => {
  const caja = { x0: 16, x1: 344, yArriba: 50, yAbajo: 140 };

  it('reparte x de forma equidistante y escala y de mínimo (abajo) a máximo (arriba)', () => {
    const p = puntosDeSerie([10, 20, 30], caja);
    expect(p.map((q) => q.x)).toEqual([16, 180, 344]);
    expect(p.map((q) => q.y)).toEqual([140, 95, 50]);
  });

  it('valores iguales quedan a media altura', () => {
    expect(puntosDeSerie([5, 5], caja).map((q) => q.y)).toEqual([95, 95]);
  });

  it('un solo valor queda centrado; sin valores, sin puntos', () => {
    expect(puntosDeSerie([7], caja)).toEqual([{ x: 180, y: 95 }]);
    expect(puntosDeSerie([], caja)).toEqual([]);
  });

  it('yDeValor usa la misma escala', () => {
    expect(yDeValor(20, [10, 20, 30], caja)).toBe(95);
  });
});

describe('trazoSuave y trazoArea', () => {
  // Puntos de la gráfica de ingresos del diseño (A_Componentes, "Ingresos · área").
  const puntos = [
    { x: 16, y: 82.32 },
    { x: 70.67, y: 74.24 },
    { x: 125.33, y: 66.16 },
    { x: 180, y: 60.57 },
    { x: 234.67, y: 68.65 },
    { x: 289.33, y: 63.68 },
  ];
  const disenio =
    'M16 82.32 C25.11 80.98 52.44 76.94 70.67 74.24 C88.89 71.55 107.11 68.44 125.33 66.16 C143.56 63.88 161.78 60.15 180 60.57 C198.22 60.98 216.44 68.13 234.67 68.65 C252.89 69.17 280.22 64.5 289.33 63.68';

  it('reproduce la curva del diseño (Catmull-Rom → Bézier)', () => {
    const d = trazoSuave(puntos);
    expect(d.startsWith('M16 82.32 C')).toBe(true);
    const obtenidos = numeros(d);
    const esperados = numeros(disenio);
    expect(obtenidos).toHaveLength(esperados.length);
    obtenidos.forEach((n, i) => expect(n).toBeCloseTo(esperados[i], 1));
  });

  it('el área cierra hasta la línea base', () => {
    const d = trazoArea(puntos, 142);
    expect(d.endsWith('L289.33 142 L16 142 Z')).toBe(true);
  });

  it('sin puntos devuelve trazos vacíos', () => {
    expect(trazoSuave([])).toBe('');
    expect(trazoArea([], 10)).toBe('');
  });
});

describe('promedio y porcentaje', () => {
  it('promedio', () => {
    expect(promedio([1, 2, 3, 4])).toBe(2.5);
    expect(promedio([])).toBe(0);
  });

  it('porcentaje entero redondeado; total 0 da 0', () => {
    expect(porcentajeEntero(13_650_000, 17_600_000)).toBe(78);
    expect(porcentajeEntero(1, 3)).toBe(33);
    expect(porcentajeEntero(5, 0)).toBe(0);
  });
});

describe('segmentosAnillo', () => {
  it('reproduce los arcos del diseño (r 52, grosor 12): 238,41 y 47,18', () => {
    const [aprobado, revision, sinReportar] = segmentosAnillo(
      [13_650_000, 3_350_000, 600_000],
      52,
      12,
    );
    expect(aprobado?.circunferencia).toBeCloseTo(326.73, 2);
    expect(aprobado?.largo).toBeCloseTo(238.41, 1);
    expect(aprobado?.desfase).toBeCloseTo(-7.5, 2);
    expect(revision?.largo).toBeCloseTo(47.18, 1);
    expect(revision?.desfase).toBeCloseTo(-260.91, 1);
    expect(sinReportar).not.toBeNull();
  });

  it('un valor 0 no dibuja nada y el siguiente empieza donde terminó el anterior', () => {
    const [a, b, c] = segmentosAnillo([50, 0, 50], 50, 10);
    expect(b).toBeNull();
    const mitad = Math.PI * 50;
    expect(c?.desfase).toBeCloseTo(-(mitad + 6.5), 1);
    expect(a?.largo).toBeCloseTo(mitad - 13, 1);
  });

  it('sin total, nada que dibujar', () => {
    expect(segmentosAnillo([0, 0], 50, 10)).toEqual([null, null]);
  });

  it('un tramo menor que el recorte se dibuja como un punto', () => {
    const [, diminuto] = segmentosAnillo([999, 1], 52, 12);
    expect(diminuto?.largo).toBe(0.01);
  });
});

describe('repartirPlano', () => {
  const almendros = {
    nombre: 'Los Almendros',
    unidades: [
      { etiqueta: '601', estado: 'OCUPADA' as const },
      { etiqueta: '501', estado: 'EN_MORA' as const },
      { etiqueta: '402', estado: 'OCUPADA' as const },
      { etiqueta: '302', estado: 'OCUPADA' as const },
      { etiqueta: '201', estado: 'OCUPADA' as const },
      { etiqueta: '101', estado: 'LIBRE' as const },
    ],
  };
  const casa = { nombre: 'Laureles', unidades: [{ etiqueta: 'Casa', estado: 'OCUPADA' as const }] };
  const local = {
    nombre: 'Local 53',
    unidades: [{ etiqueta: 'Local', estado: 'OCUPADA' as const }],
  };

  it('un edificio es una torre de pisos con la geometría del diseño (132 × 122)', () => {
    const { grupos } = repartirPlano([almendros], 360);
    const [torre] = grupos;
    expect(torre.contorno).toEqual({ x: 0, y: 0, ancho: 132, alto: 122 });
    expect(torre.celdas).toHaveLength(6);
    expect(torre.celdas[0]).toMatchObject({
      x: 4,
      y: 6,
      ancho: 124,
      alto: 17,
      etiqueta: '601',
      esPiso: true,
    });
    expect(torre.celdas[1]).toMatchObject({ y: 25, estado: 'EN_MORA' });
    expect(torre.celdas[5]).toMatchObject({ y: 101, estado: 'LIBRE' });
  });

  it('las unidades sueltas son bloques apoyados en la misma línea base', () => {
    const { grupos, ancho } = repartirPlano([almendros, casa, local], 360);
    const [, bCasa, bLocal] = grupos;
    expect(bCasa.contorno).toBeNull();
    expect(bCasa.celdas[0]).toMatchObject({ x: 144, y: 80, ancho: 64, alto: 42, esPiso: false });
    expect(bLocal.celdas[0]).toMatchObject({ x: 220, y: 80 });
    expect(bCasa.celdas[0].y + bCasa.celdas[0].alto).toBe(122);
    expect(ancho).toBe(284);
    expect(grupos[0].etiqueta).toEqual({ x: 66, y: 148, texto: 'Los Almendros' });
  });

  it('si no caben, siguen en otra fila', () => {
    const muchos = Array.from({ length: 6 }, (_, i) => ({
      nombre: `Casa ${i + 1}`,
      unidades: [{ etiqueta: 'Casa', estado: 'OCUPADA' as const }],
    }));
    const { grupos, alto } = repartirPlano(muchos, 300);
    // 64 × 4 + 12 × 3 = 292 ≤ 300: cuatro por fila
    expect(grupos[3].celdas[0].y).toBe(0);
    expect(grupos[4].celdas[0].x).toBe(0);
    expect(grupos[4].celdas[0].y).toBe(
      42 + MEDIDAS_PLANO.altoEtiqueta + MEDIDAS_PLANO.separacionFilas,
    );
    expect(alto).toBeGreaterThan(2 * 42);
  });

  it('ignora inmuebles sin unidades y un plano vacío mide 0', () => {
    expect(repartirPlano([{ nombre: 'Vacío', unidades: [] }], 360)).toEqual({
      grupos: [],
      ancho: 0,
      alto: 0,
    });
  });

  it('recorta los nombres largos con "…"', () => {
    expect(recortarEtiqueta('Edificio Torres del Parque Norte', 76)).toBe('Edificio…');
    expect(recortarEtiqueta('Laureles', 76)).toBe('Laureles');
  });
});
