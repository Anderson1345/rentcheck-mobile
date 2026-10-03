// Lógica pura del zoom del visor de imágenes: pellizco con dos dedos, arrastre, doble toque y cerrar
// arrastrando hacia abajo. Recibe los toques crudos (coordenadas de pantalla) y devuelve el estado
// siguiente; el componente solo lo dibuja. Sin librerías: solo eventos táctiles de React Native.

export interface Toque {
  x: number;
  y: number;
}
export interface Caja {
  ancho: number;
  alto: number;
}

export const ESCALA_MINIMA = 1;
export const ESCALA_MAXIMA = 5;
/** Zoom al que lleva un doble toque. */
export const ESCALA_DOBLE_TOQUE = 2.5;
/** Tiempo máximo entre dos toques para que cuenten como un doble toque. */
export const VENTANA_DOBLE_TOQUE_MS = 300;
/** Distancia máxima entre los dos toques de un doble toque. */
export const DISTANCIA_DOBLE_TOQUE = 40;
/** Un toque que se mueve más de esto es un arrastre, no un toque. */
export const MOVIMIENTO_MAXIMO_TOQUE = 10;
/** Un toque más largo que esto no cuenta para el doble toque. */
const DURACION_MAXIMA_TOQUE_MS = 300;
/** Cuánto hay que bajar la imagen (sin zoom) para que se cierre al soltar. */
export const UMBRAL_CIERRE_ARRASTRE = 120;
/** Por debajo de este zoom, al soltar se vuelve a 1. */
const ESCALA_DESPRECIABLE = 1.05;

type Gesto =
  | { tipo: 'pellizco'; distanciaInicial: number; escalaInicial: number }
  | {
      tipo: 'arrastre';
      inicio: Toque;
      xInicial: number;
      yInicial: number;
      inicioT: number;
      movimientoMaximo: number;
    };

export interface EstadoZoom {
  escala: number;
  /** Desplazamiento de la imagen (con zoom). */
  x: number;
  y: number;
  /** Cuánto se ha bajado la imagen sin zoom (para cerrarla). */
  cierreDy: number;
  gesto: Gesto | null;
  ultimoToque: { t: number; x: number; y: number } | null;
}

export const estadoInicial: EstadoZoom = {
  escala: ESCALA_MINIMA,
  x: 0,
  y: 0,
  cierreDy: 0,
  gesto: null,
  ultimoToque: null,
};

export const distanciaEntre = (a: Toque, b: Toque) => Math.hypot(a.x - b.x, a.y - b.y);

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.min(maximo, Math.max(minimo, valor));

/** Escala resultante de separar o juntar los dedos, entre 1 y el máximo. */
export function escalaPorPellizco(
  escalaInicial: number,
  distanciaInicial: number,
  distanciaActual: number,
): number {
  const base = distanciaInicial > 0 ? distanciaInicial : 1;
  return limitar(escalaInicial * (distanciaActual / base), ESCALA_MINIMA, ESCALA_MAXIMA);
}

/** El desplazamiento no puede dejar a la vista bordes vacíos: hasta la mitad de lo que sobra por lado. */
export function limitarDesplazamiento(
  x: number,
  y: number,
  escala: number,
  caja: Caja,
): { x: number; y: number } {
  const maximoX = (caja.ancho * (escala - 1)) / 2;
  const maximoY = (caja.alto * (escala - 1)) / 2;
  return {
    x: maximoX === 0 ? 0 : limitar(x, -maximoX, maximoX),
    y: maximoY === 0 ? 0 : limitar(y, -maximoY, maximoY),
  };
}

export function esDobleToque(
  previo: { t: number; x: number; y: number } | null,
  t: number,
  x: number,
  y: number,
): boolean {
  if (!previo) return false;
  return (
    t - previo.t <= VENTANA_DOBLE_TOQUE_MS &&
    distanciaEntre({ x: previo.x, y: previo.y }, { x, y }) <= DISTANCIA_DOBLE_TOQUE
  );
}

/** Empieza un gesto: un dedo es arrastre (o toque); dos, pellizco. */
export function alTocar(e: EstadoZoom, toques: readonly Toque[], t: number): EstadoZoom {
  if (toques.length >= 2) {
    return {
      ...e,
      cierreDy: 0,
      gesto: {
        tipo: 'pellizco',
        distanciaInicial: distanciaEntre(toques[0], toques[1]),
        escalaInicial: e.escala,
      },
    };
  }
  if (toques.length === 1) {
    return {
      ...e,
      cierreDy: 0,
      gesto: {
        tipo: 'arrastre',
        inicio: toques[0],
        xInicial: e.x,
        yInicial: e.y,
        inicioT: t,
        movimientoMaximo: 0,
      },
    };
  }
  return e;
}

export function alMover(e: EstadoZoom, toques: readonly Toque[], caja: Caja): EstadoZoom {
  const gesto = e.gesto;
  if (!gesto) return e;

  if (gesto.tipo === 'pellizco') {
    if (toques.length < 2) return e;
    const escala = escalaPorPellizco(
      gesto.escalaInicial,
      gesto.distanciaInicial,
      distanciaEntre(toques[0], toques[1]),
    );
    return { ...e, escala, ...limitarDesplazamiento(e.x, e.y, escala, caja) };
  }

  if (toques.length === 0) return e;
  const dx = toques[0].x - gesto.inicio.x;
  const dy = toques[0].y - gesto.inicio.y;
  const movimientoMaximo = Math.max(gesto.movimientoMaximo, Math.hypot(dx, dy));
  const siguiente = { ...e, gesto: { ...gesto, movimientoMaximo } };
  if (e.escala > ESCALA_MINIMA) {
    return {
      ...siguiente,
      ...limitarDesplazamiento(gesto.xInicial + dx, gesto.yInicial + dy, e.escala, caja),
    };
  }
  return { ...siguiente, cierreDy: Math.max(0, dy) };
}

/**
 * Termina un gesto. `restantes` son los dedos que siguen apoyados. Devuelve el estado y si hay que
 * cerrar el visor (se bajó la imagen sin zoom más del umbral).
 */
export function alSoltar(
  e: EstadoZoom,
  restantes: readonly Toque[],
  t: number,
  caja: Caja,
): { estado: EstadoZoom; cerrar: boolean } {
  // Se levantó un dedo del pellizco: el otro sigue como arrastre, sin saltos.
  if (restantes.length > 0) {
    if (e.gesto?.tipo === 'pellizco' && restantes.length === 1) {
      return {
        estado: {
          ...e,
          gesto: {
            tipo: 'arrastre',
            inicio: restantes[0],
            xInicial: e.x,
            yInicial: e.y,
            inicioT: t,
            movimientoMaximo: MOVIMIENTO_MAXIMO_TOQUE + 1,
          },
        },
        cerrar: false,
      };
    }
    return { estado: e, cerrar: false };
  }

  const gesto = e.gesto;
  let estado: EstadoZoom = { ...e, gesto: null, cierreDy: 0 };

  if (gesto?.tipo === 'arrastre') {
    const esToque =
      gesto.movimientoMaximo <= MOVIMIENTO_MAXIMO_TOQUE &&
      t - gesto.inicioT <= DURACION_MAXIMA_TOQUE_MS;
    if (esToque) {
      if (esDobleToque(e.ultimoToque, t, gesto.inicio.x, gesto.inicio.y)) {
        return { estado: alternarZoom(estado, gesto.inicio, caja), cerrar: false };
      }
      return {
        estado: { ...estado, ultimoToque: { t, x: gesto.inicio.x, y: gesto.inicio.y } },
        cerrar: false,
      };
    }
    if (e.escala === ESCALA_MINIMA && e.cierreDy >= UMBRAL_CIERRE_ARRASTRE) {
      return { estado: { ...estado, ultimoToque: null }, cerrar: true };
    }
  }

  if (estado.escala < ESCALA_DESPRECIABLE) {
    estado = { ...estado, escala: ESCALA_MINIMA, x: 0, y: 0 };
  }
  return { estado: { ...estado, ultimoToque: null }, cerrar: false };
}

/** Doble toque: de 1 a ESCALA_DOBLE_TOQUE hacia el punto tocado, o de vuelta a 1. */
function alternarZoom(e: EstadoZoom, punto: Toque, caja: Caja): EstadoZoom {
  if (e.escala > ESCALA_DESPRECIABLE) {
    return { ...e, escala: ESCALA_MINIMA, x: 0, y: 0, ultimoToque: null };
  }
  const escala = ESCALA_DOBLE_TOQUE;
  const x = (caja.ancho / 2 - punto.x) * (escala - 1);
  const y = (caja.alto / 2 - punto.y) * (escala - 1);
  return { ...e, escala, ...limitarDesplazamiento(x, y, escala, caja), ultimoToque: null };
}
