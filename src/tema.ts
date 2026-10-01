// Sistema visual "Medianoche" (docs/diseno/medianoche/). Valores tomados de los HTML del diseño.
// Solo modo claro; el modo oscuro no está en el alcance.

/** Colores por rol. */
export const colores = {
  // Tinta: acción primaria, cabeceras y datos sobre fondo claro
  tinta: '#0A1A1F',
  tintaElevada: '#14292F', // parte alta del degradado del botón primario
  tintaPresionada: '#061216',
  tintaPresionadaBase: '#040C0F',
  tintaCapa: '#1C444B', // pista del anillo, foco del campo, capa sobre tinta

  // Acento lima: acción sobre tinta y dato clave
  lima: '#C5F06A',
  limaDuotono: '#B7E35A', // segunda capa de los iconos duotono y punto de gráficas
  limaClara: '#D3F584',
  limaBase: '#C2EC63',
  limaPresionada: '#B6E058',
  limaPresionadaBase: '#ADD84E',

  // Superficies
  fondo: '#F3F1EC',
  superficie: '#FFFFFF',
  deshabilitado: '#DEDBD4',

  // Texto
  texto: '#0E1A1D',
  textoFuerte: '#465255', // etiquetas de grupo y pestañas inactivas
  textoSecundario: '#5E686A',
  textoDeshabilitado: '#737A7C',
  iconoTenue: '#8A9294', // chevrones de fila
  sobreTinta: '#FFFFFF',

  // Destructivo
  peligro: '#BF2C33',
  peligroBase: '#A9222A',
  peligroTexto: '#9E1F25',

  // Gráficas
  serie: '#2A5A62', // relleno del área de ingresos
  enRevisionSobreTinta: '#8CC0DD', // segmento "En revisión" del anillo
} as const;

/** Colores de los estados: la señal (luz) y el texto que la acompaña. */
export const coloresEstado = {
  exito: { senal: '#25A07A', texto: '#1D7457' },
  advertencia: { senal: '#E0A23A', texto: '#97600B' },
  peligro: { senal: '#E05A4F', texto: '#AE3A33' },
  informacion: { senal: '#3D93BF', texto: '#2A6585' },
  programado: { senal: '#3E8C96', texto: '#1C5A63' },
  neutro: { senal: '#98A3A5', texto: '#5E686A' },
  tinta: { senal: '#0A1A1F', texto: '#0A1A1F' },
} as const;

export type TonoEstado = keyof typeof coloresEstado;

/** Transparencias de tinta usadas para fondos tonales y separadores. */
export const tintaAlfa = (alfa: number) => `rgba(10,26,31,${alfa})`;
export const blancoAlfa = (alfa: number) => `rgba(255,255,255,${alfa})`;

/** Convierte "#RRGGBB" a "rgba(r,g,b,alfa)". */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/** Manrope por peso: en Android cada peso es una familia distinta. */
export const fuentes = {
  regular: 'Manrope_400Regular',
  media: 'Manrope_500Medium',
  seminegrita: 'Manrope_600SemiBold',
  negrita: 'Manrope_700Bold',
  extranegrita: 'Manrope_800ExtraBold',
} as const;

/**
 * Escala tipográfica. Mínimo 14 sp; solo `pestana` (barra inferior) baja a 12 sp.
 * El interlineado sigue al diseño (1,45 en párrafos).
 */
export const tipografia = {
  cifraProtagonista: { fontFamily: fuentes.extranegrita, fontSize: 46, letterSpacing: -1.6 },
  cifraMedia: { fontFamily: fuentes.extranegrita, fontSize: 28, letterSpacing: -1.1 },
  titulo: { fontFamily: fuentes.extranegrita, fontSize: 20, letterSpacing: -0.3 },
  tituloSeccion: { fontFamily: fuentes.extranegrita, fontSize: 18, letterSpacing: -0.3 },
  valorGrande: { fontFamily: fuentes.negrita, fontSize: 22, letterSpacing: -0.4 },
  valor: { fontFamily: fuentes.extranegrita, fontSize: 16 },
  cuerpoFuerte: { fontFamily: fuentes.negrita, fontSize: 16, letterSpacing: -0.1 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 23 },
  filaTitulo: { fontFamily: fuentes.negrita, fontSize: 15, letterSpacing: -0.15 },
  etiqueta: { fontFamily: fuentes.negrita, fontSize: 14 },
  secundario: { fontFamily: fuentes.regular, fontSize: 14, lineHeight: 20 },
  pestana: { fontFamily: fuentes.seminegrita, fontSize: 12, letterSpacing: -0.2 },
} as const;

/** Cifras con ancho fijo para que los montos no "bailen". */
export const cifras = { fontVariant: ['tabular-nums' as const] };

/** Espaciado (dp). */
export const espaciado = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Radios. El diseño usa 8, 10, 12, 16, 20, 24 y 32; se reducen a tres pasos más la píldora:
 * pequeño 10 (chips, celdas, teclas), medio 16 (botones, campos, mosaicos de icono) y grande
 * 24 (tarjetas, hojas, cabeceras). Los avatares usan su propia proporción (0,32 del lado).
 */
export const radios = {
  pequeno: 10,
  medio: 16,
  grande: 24,
  pildora: 999,
} as const;

/**
 * Sombras teñidas de tinta (boxShadow de React Native 0.86). El "brillo interior" de los botones
 * (inset) va aparte porque se dibuja sobre el degradado, en una capa encima.
 */
export const sombras = {
  tarjeta: '0 1px 2px rgba(10,26,31,0.05), 0 14px 32px -14px rgba(10,26,31,0.24)',
  botonPrimario: '0 1px 2px rgba(10,26,31,0.2), 0 10px 22px -10px rgba(10,26,31,0.6)',
  botonAcento: '0 12px 28px -12px rgba(197,240,106,0.6)',
  botonPeligro: '0 10px 22px -10px rgba(180,35,42,0.6)',
  brillo: (alfa: number) => `inset 0 1px 0 rgba(255,255,255,${alfa})`,
  segmentoActivo: '0 1px 2px rgba(10,26,31,0.08), 0 4px 12px -4px rgba(10,26,31,0.18)',
  barraInferior: '0 -1px 0 rgba(10,26,31,0.06), 0 -16px 32px -20px rgba(10,26,31,0.3)',
  barraAccion: '0 -1px 0 rgba(10,26,31,0.05), 0 -18px 36px -18px rgba(10,26,31,0.32)',
  avatar: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 6px 14px -8px rgba(10,26,31,0.5)',
  campoEnfocado: '0 0 0 2px #1C444B, 0 0 0 6px rgba(197,240,106,0.5)',
} as const;

/** Alturas táctiles. */
export const alturas = {
  boton: 54,
  botonIcono: 48,
  botonIconoCompacto: 44,
  campo: 64,
  segmentado: 48,
  barraInferior: 80,
} as const;
