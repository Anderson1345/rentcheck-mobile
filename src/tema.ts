// Tokens de diseño. Paleta neutra y sobria; el diseño visual se define después.

export const colores = {
  primario: '#1F3A5F',
  sobrePrimario: '#FFFFFF',
  fondo: '#F6F7F9',
  superficie: '#FFFFFF',
  texto: '#1A1D23',
  textoSecundario: '#5B6472',
  borde: '#D5D9E0',
  exito: '#1E7B4F',
  advertencia: '#B7791F',
  peligro: '#B3261E',
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radios = {
  sm: 6,
  md: 10,
  lg: 16,
  pildora: 999,
} as const;

export const tipografia = {
  pequeno: 12,
  normal: 16,
  subtitulo: 18,
  titulo: 24,
  grande: 32,
} as const;
