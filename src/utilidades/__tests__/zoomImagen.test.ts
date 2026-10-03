import {
  alMover,
  alSoltar,
  alTocar,
  distanciaEntre,
  ESCALA_DOBLE_TOQUE,
  ESCALA_MAXIMA,
  esDobleToque,
  escalaPorPellizco,
  estadoInicial,
  limitarDesplazamiento,
  UMBRAL_CIERRE_ARRASTRE,
  type EstadoZoom,
} from '../zoomImagen';

const CAJA = { ancho: 400, alto: 800 };
const toque = (x: number, y: number) => ({ x, y });

describe('geometría del zoom', () => {
  it('distanciaEntre: la hipotenusa', () => {
    expect(distanciaEntre(toque(0, 0), toque(3, 4))).toBe(5);
  });

  it('escalaPorPellizco: proporcional a cuánto se separan los dedos, entre 1 y el máximo', () => {
    expect(escalaPorPellizco(1, 100, 200)).toBe(2);
    expect(escalaPorPellizco(2, 100, 150)).toBe(3);
    expect(escalaPorPellizco(1, 100, 50)).toBe(1);
    expect(escalaPorPellizco(1, 100, 100_000)).toBe(ESCALA_MAXIMA);
    // Dedos juntos desde el inicio: no divide entre cero.
    expect(escalaPorPellizco(1, 0, 100)).toBeGreaterThanOrEqual(1);
  });

  it('limitarDesplazamiento: sin zoom no hay desplazamiento; con zoom, hasta la mitad de lo que sobra', () => {
    expect(limitarDesplazamiento(50, 50, 1, CAJA)).toEqual({ x: 0, y: 0 });
    expect(limitarDesplazamiento(10_000, -10_000, 3, CAJA)).toEqual({ x: 400, y: -800 });
    expect(limitarDesplazamiento(30, -40, 3, CAJA)).toEqual({ x: 30, y: -40 });
  });

  it('esDobleToque: dos toques seguidos y cercanos; no si pasó mucho tiempo o están lejos', () => {
    const previo = { t: 1000, x: 100, y: 100 };
    expect(esDobleToque(previo, 1200, 105, 98)).toBe(true);
    expect(esDobleToque(previo, 1500, 100, 100)).toBe(false);
    expect(esDobleToque(previo, 1200, 300, 300)).toBe(false);
    expect(esDobleToque(null, 1200, 100, 100)).toBe(false);
  });
});

/** Aplica una secuencia de eventos y devuelve el estado final y si pidió cerrar. */
function pellizcar(inicial: EstadoZoom, desde: number, hasta: number): EstadoZoom {
  let e = alTocar(inicial, [toque(200 - desde / 2, 400), toque(200 + desde / 2, 400)], 0);
  e = alMover(e, [toque(200 - hasta / 2, 400), toque(200 + hasta / 2, 400)], CAJA);
  return e;
}

describe('pellizco', () => {
  it('separar los dedos acerca la imagen; al soltar conserva el zoom', () => {
    const e = pellizcar(estadoInicial, 100, 250);
    expect(e.escala).toBeCloseTo(2.5);
    const soltado = alSoltar(e, [], 100, CAJA);
    expect(soltado.cerrar).toBe(false);
    expect(soltado.estado.escala).toBeCloseTo(2.5);
    expect(soltado.estado.gesto).toBeNull();
  });

  it('un zoom casi imperceptible (menos de 1,05) vuelve a 1 y centra la imagen', () => {
    const e = pellizcar(estadoInicial, 100, 103);
    const { estado } = alSoltar(e, [], 100, CAJA);
    expect(estado.escala).toBe(1);
    expect(estado.x).toBe(0);
    expect(estado.y).toBe(0);
  });

  it('pellizcar para alejar no baja de 1', () => {
    expect(pellizcar(estadoInicial, 200, 20).escala).toBe(1);
  });

  it('levantar un dedo sigue como arrastre sin saltos de zoom', () => {
    const e = pellizcar(estadoInicial, 100, 200);
    const { estado } = alSoltar(e, [toque(250, 400)], 100, CAJA);
    expect(estado.escala).toBeCloseTo(2);
    expect(estado.gesto?.tipo).toBe('arrastre');
  });
});

describe('arrastre', () => {
  const conZoom: EstadoZoom = { ...estadoInicial, escala: 2 };

  it('con zoom, mover un dedo desplaza la imagen (dentro de sus límites)', () => {
    let e = alTocar(conZoom, [toque(200, 400)], 0);
    e = alMover(e, [toque(260, 430)], CAJA);
    expect(e.x).toBe(60);
    expect(e.y).toBe(30);
    e = alMover(e, [toque(2000, 4000)], CAJA);
    expect(e.x).toBe(200);
    expect(e.y).toBe(400);
  });

  it('el desplazamiento se acumula entre gestos', () => {
    let e = alTocar(conZoom, [toque(200, 400)], 0);
    e = alMover(e, [toque(240, 400)], CAJA);
    e = alSoltar(e, [], 500, CAJA).estado;
    e = alTocar(e, [toque(200, 400)], 2000);
    e = alMover(e, [toque(220, 400)], CAJA);
    expect(e.x).toBe(60);
  });

  it('sin zoom la imagen no se mueve, pero arrastrar hacia abajo prepara el cierre', () => {
    let e = alTocar(estadoInicial, [toque(200, 400)], 0);
    e = alMover(e, [toque(210, 520)], CAJA);
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
    expect(e.cierreDy).toBe(120);
  });

  it('arrastrar hacia arriba sin zoom no hace nada', () => {
    let e = alTocar(estadoInicial, [toque(200, 400)], 0);
    e = alMover(e, [toque(200, 300)], CAJA);
    expect(e.cierreDy).toBe(0);
  });

  it('soltar tras bajar más del umbral pide cerrar; menos, no y vuelve a su sitio', () => {
    const largo = alMover(
      alTocar(estadoInicial, [toque(200, 400)], 0),
      [toque(200, 400 + UMBRAL_CIERRE_ARRASTRE + 20)],
      CAJA,
    );
    expect(alSoltar(largo, [], 500, CAJA).cerrar).toBe(true);

    const corto = alMover(alTocar(estadoInicial, [toque(200, 400)], 0), [toque(200, 450)], CAJA);
    const resultado = alSoltar(corto, [], 500, CAJA);
    expect(resultado.cerrar).toBe(false);
    expect(resultado.estado.cierreDy).toBe(0);
  });

  it('con zoom, arrastrar hacia abajo NO cierra (mueve la imagen)', () => {
    let e = alTocar(conZoom, [toque(200, 400)], 0);
    e = alMover(e, [toque(200, 700)], CAJA);
    expect(alSoltar(e, [], 500, CAJA).cerrar).toBe(false);
  });
});

describe('doble toque', () => {
  /** Un toque corto: apoyar y levantar sin moverse. */
  function tocarYSoltar(e: EstadoZoom, x: number, y: number, t: number) {
    return alSoltar(alTocar(e, [toque(x, y)], t), [], t + 60, CAJA);
  }

  it('dos toques seguidos acercan al zoom del doble toque; otro doble toque lo deja en 1', () => {
    let e = tocarYSoltar(estadoInicial, 200, 400, 1000).estado;
    expect(e.escala).toBe(1);
    e = tocarYSoltar(e, 200, 400, 1200).estado;
    expect(e.escala).toBe(ESCALA_DOBLE_TOQUE);
    e = tocarYSoltar(e, 200, 400, 5000).estado;
    e = tocarYSoltar(e, 200, 400, 5200).estado;
    expect(e.escala).toBe(1);
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
  });

  it('acerca hacia el punto tocado (queda dentro de los límites)', () => {
    let e = tocarYSoltar(estadoInicial, 50, 400, 1000).estado;
    e = tocarYSoltar(e, 50, 400, 1200).estado;
    // Tocar a la izquierda del centro desplaza la imagen a la derecha para verlo.
    expect(e.x).toBeGreaterThan(0);
    expect(e.x).toBeLessThanOrEqual((CAJA.ancho * (ESCALA_DOBLE_TOQUE - 1)) / 2);
  });

  it('dos toques separados por mucho tiempo no son un doble toque', () => {
    let e = tocarYSoltar(estadoInicial, 200, 400, 1000).estado;
    e = tocarYSoltar(e, 200, 400, 2500).estado;
    expect(e.escala).toBe(1);
  });

  it('un arrastre no cuenta como toque (no activa el doble toque)', () => {
    let e = alTocar(estadoInicial, [toque(200, 400)], 1000);
    e = alMover(e, [toque(200, 460)], CAJA);
    e = alSoltar(e, [], 1100, CAJA).estado;
    e = tocarYSoltar(e, 200, 460, 1200).estado;
    expect(e.escala).toBe(1);
  });
});
