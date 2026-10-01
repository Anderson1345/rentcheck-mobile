// Geometría pura de las gráficas: sin React, sin lógica de negocio. Recibe números y devuelve
// coordenadas, trazos SVG y repartos.

export interface Punto {
  x: number;
  y: number;
}

export interface Caja {
  x0: number;
  x1: number;
  /** y del valor más alto. */
  yArriba: number;
  /** y del valor más bajo. */
  yAbajo: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reparte los valores a lo ancho de la caja (x equidistantes) y los escala de mínimo a máximo
 * en vertical. Si todos son iguales, quedan a media altura.
 */
export function puntosDeSerie(valores: readonly number[], caja: Caja): Punto[] {
  if (valores.length === 0) return [];
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const paso = valores.length > 1 ? (caja.x1 - caja.x0) / (valores.length - 1) : 0;
  return valores.map((valor, i) => {
    const relativo = maximo === minimo ? 0.5 : (valor - minimo) / (maximo - minimo);
    return {
      x: r2(valores.length > 1 ? caja.x0 + paso * i : (caja.x0 + caja.x1) / 2),
      y: r2(caja.yAbajo - relativo * (caja.yAbajo - caja.yArriba)),
    };
  });
}

/** y que corresponde a un valor con la misma escala de `puntosDeSerie`. */
export function yDeValor(valor: number, valores: readonly number[], caja: Caja): number {
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const relativo = maximo === minimo ? 0.5 : (valor - minimo) / (maximo - minimo);
  return r2(caja.yAbajo - relativo * (caja.yAbajo - caja.yArriba));
}

/**
 * Curva suave que pasa por todos los puntos (Catmull-Rom uniforme convertida a Bézier cúbica,
 * la misma construcción que usa el diseño).
 */
export function trazoSuave(puntos: readonly Punto[]): string {
  if (puntos.length === 0) return '';
  const [primero] = puntos;
  let d = `M${r2(primero.x)} ${r2(primero.y)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(p2.x)} ${r2(p2.y)}`;
  }
  return d;
}

/** La curva cerrada hasta la línea base, para el relleno degradado. */
export function trazoArea(puntos: readonly Punto[], yBase: number): string {
  if (puntos.length === 0) return '';
  const ultimo = puntos[puntos.length - 1];
  return `${trazoSuave(puntos)} L${r2(ultimo.x)} ${r2(yBase)} L${r2(puntos[0].x)} ${r2(yBase)} Z`;
}

export function promedio(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((suma, v) => suma + v, 0) / valores.length;
}

/** Porcentaje entero (redondeado) de una parte sobre el total; 0 si el total es 0. */
export function porcentajeEntero(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

export interface SegmentoAnillo {
  /** Largo visible del trazo (stroke-dasharray = `${largo} ${circunferencia}`). */
  largo: number;
  /** stroke-dashoffset (negativo: avanza en el sentido del reloj desde las 12). */
  desfase: number;
  circunferencia: number;
}

/**
 * Arcos del anillo con extremos redondeados. Cada segmento ocupa su parte de la circunferencia;
 * se le resta el grosor (los dos medios extremos redondeados) más una separación, y se centra en
 * su tramo. Un valor 0 no dibuja nada (devuelve null en su posición). Así lo construye el diseño:
 * 78 % de r = 52, grosor 12, separación 3 → largo 238,41 y desfase −7,5.
 */
export function segmentosAnillo(
  valores: readonly number[],
  radio: number,
  grosor: number,
  separacion = 3,
): (SegmentoAnillo | null)[] {
  const circunferencia = 2 * Math.PI * radio;
  const total = valores.reduce((s, v) => s + Math.max(0, v), 0);
  const recorte = grosor + separacion;
  let inicio = 0;
  return valores.map((valor) => {
    if (total <= 0 || valor <= 0) return null;
    const tramo = (valor / total) * circunferencia;
    const segmento = {
      // Un tramo más corto que el recorte se dibuja como un punto (solo los extremos redondeados).
      largo: r2(Math.max(0.01, tramo - recorte)),
      desfase: r2(-(inicio + recorte / 2)),
      circunferencia: r2(circunferencia),
    };
    inicio += tramo;
    return segmento;
  });
}

// ---------- Mini-plano de ocupación ----------

export type EstadoCelda = 'OCUPADA' | 'LIBRE' | 'EN_MORA';

export interface InmueblePlano {
  nombre: string;
  /** De arriba hacia abajo (el piso más alto primero). */
  unidades: readonly { etiqueta: string; estado: EstadoCelda }[];
}

export interface CeldaPlano {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  etiqueta: string;
  estado: EstadoCelda;
  /** true en edificios (filas horizontales); false en unidades sueltas (bloque). */
  esPiso: boolean;
}

export interface GrupoPlano {
  nombre: string;
  /** Contorno del edificio (solo con más de una unidad). */
  contorno: { x: number; y: number; ancho: number; alto: number } | null;
  /** Centro y línea base de la etiqueta del inmueble. */
  etiqueta: { x: number; y: number; texto: string };
  celdas: CeldaPlano[];
}

export const MEDIDAS_PLANO = {
  anchoEdificio: 132,
  altoPiso: 17,
  separacionPisos: 2,
  margenSuperior: 6,
  margenInferior: 4,
  margenLateral: 4,
  anchoBloque: 64,
  altoBloque: 42,
  separacionGrupos: 12,
  altoEtiqueta: 26,
  separacionFilas: 18,
  /** Ancho aproximado de un carácter de Manrope 14 (seminegrita). */
  anchoCaracter: 7.6,
} as const;

/** Recorta un texto con "…" para que quepa en un ancho aproximado. */
export function recortarEtiqueta(
  texto: string,
  ancho: number,
  anchoCaracter: number = MEDIDAS_PLANO.anchoCaracter,
): string {
  const maximo = Math.max(1, Math.floor(ancho / anchoCaracter));
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, Math.max(1, maximo - 1)).trimEnd()}…`;
}

function medirGrupo(inmueble: InmueblePlano) {
  const m = MEDIDAS_PLANO;
  if (inmueble.unidades.length > 1) {
    const n = inmueble.unidades.length;
    return {
      ancho: m.anchoEdificio,
      alto: m.margenSuperior + n * m.altoPiso + (n - 1) * m.separacionPisos + m.margenInferior,
    };
  }
  return { ancho: m.anchoBloque, alto: m.altoBloque };
}

/**
 * Reparte los inmuebles de izquierda a derecha: un edificio (varias unidades) es una torre de
 * pisos; una unidad suelta es un bloque. Todos se apoyan en la misma línea base. Si no caben en
 * `anchoDisponible`, siguen en una fila nueva debajo.
 */
export function repartirPlano(
  inmuebles: readonly InmueblePlano[],
  anchoDisponible: number,
): { grupos: GrupoPlano[]; ancho: number; alto: number } {
  const m = MEDIDAS_PLANO;
  const filas: { inmueble: InmueblePlano; ancho: number; alto: number }[][] = [];
  let actual: (typeof filas)[number] = [];
  let anchoFila = 0;

  for (const inmueble of inmuebles) {
    if (inmueble.unidades.length === 0) continue;
    const medida = { inmueble, ...medirGrupo(inmueble) };
    const extra = actual.length > 0 ? m.separacionGrupos + medida.ancho : medida.ancho;
    if (actual.length > 0 && anchoFila + extra > anchoDisponible) {
      filas.push(actual);
      actual = [];
      anchoFila = 0;
    }
    anchoFila += actual.length > 0 ? m.separacionGrupos + medida.ancho : medida.ancho;
    actual.push(medida);
  }
  if (actual.length > 0) filas.push(actual);

  const grupos: GrupoPlano[] = [];
  let yFila = 0;
  let anchoTotal = 0;
  for (const fila of filas) {
    const base = yFila + Math.max(...fila.map((g) => g.alto));
    let x = 0;
    for (const { inmueble, ancho, alto } of fila) {
      const y = base - alto;
      const celdas: CeldaPlano[] =
        inmueble.unidades.length > 1
          ? inmueble.unidades.map((u, i) => ({
              x: x + m.margenLateral,
              y: y + m.margenSuperior + i * (m.altoPiso + m.separacionPisos),
              ancho: ancho - 2 * m.margenLateral,
              alto: m.altoPiso,
              etiqueta: u.etiqueta,
              estado: u.estado,
              esPiso: true,
            }))
          : [
              {
                x,
                y,
                ancho,
                alto,
                etiqueta: inmueble.unidades[0].etiqueta,
                estado: inmueble.unidades[0].estado,
                esPiso: false,
              },
            ];
      grupos.push({
        nombre: inmueble.nombre,
        contorno: inmueble.unidades.length > 1 ? { x, y, ancho, alto } : null,
        etiqueta: {
          x: r2(x + ancho / 2),
          y: base + m.altoEtiqueta,
          texto: recortarEtiqueta(inmueble.nombre, ancho + m.separacionGrupos - 4),
        },
        celdas,
      });
      x += ancho + m.separacionGrupos;
    }
    anchoTotal = Math.max(anchoTotal, x - m.separacionGrupos);
    yFila = base + m.altoEtiqueta + m.separacionFilas;
  }
  return { grupos, ancho: anchoTotal, alto: grupos.length > 0 ? yFila - m.separacionFilas + 4 : 0 };
}
