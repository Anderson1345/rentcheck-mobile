// Generado por scripts/extraer-diseno.js — no editar a mano.
// Trazos de los 20 iconos propios de Medianoche (retícula 24, trazo 1,65; duotono 1,75).
// `relleno` es la segunda capa lima de la versión duotono; solo la tienen los 9 iconos que el
// diseño define en duotono.

export interface TrazoIcono {
  trazos: readonly string[];
  relleno?: readonly string[];
}

export const TRAZOS_ICONOS = {
  panel: {
    trazos: [
      'M4 14.5a8 8 0 0 1 16 0',
      'M12 14.5l3.4-4.4',
      'M4.5 18.5h15',
      'M10.8 14.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0',
    ],
    relleno: ['M4 14.5a8 8 0 0 1 16 0z'],
  },
  inmuebles: {
    trazos: [
      'M3.5 20.5h17',
      'M5.5 20.5V10.5h6',
      'M11.5 20.5v-16h7v16',
      'M14.5 8h1.5',
      'M14.5 11.5h1.5',
      'M14.5 15h1.5',
      'M8 14h1',
      'M8 17.5h1',
    ],
    relleno: ['M11.5 20.5v-16h7v16z'],
  },
  contratos: {
    trazos: [
      'M13.5 3.5H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z',
      'M13.5 3.5V8H18',
      'M9 11.5h4.5',
      'M9 16.6c.8-1.5 1.6-1.6 2.1-.3.5 1.3 1.3 1.3 2.1 0 .4-.6.9-.7 1.4-.1',
    ],
    relleno: ['M13.5 3.5H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z'],
  },
  pagos: {
    trazos: ['M20.5 12a8.5 8.5 0 1 1-5-7.75', 'M20.5 3.5l-6 6', 'M14.5 5.6v3.9h3.9'],
    relleno: ['M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0'],
  },
  mas: {
    trazos: [
      'M6 4h2.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1 -2 2h-2.5a2 2 0 0 1 -2 -2v-2.5a2 2 0 0 1 2 -2z',
      'M15.5 4h2.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1 -2 2h-2.5a2 2 0 0 1 -2 -2v-2.5a2 2 0 0 1 2 -2z',
      'M6 13.5h2.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1 -2 2h-2.5a2 2 0 0 1 -2 -2v-2.5a2 2 0 0 1 2 -2z',
      'M13.5 16.75a3.25 3.25 0 1 0 6.5 0a3.25 3.25 0 1 0 -6.5 0',
    ],
    relleno: [
      'M13.5 16.75a3.25 3.25 0 1 0 6.5 0a3.25 3.25 0 1 0 -6.5 0',
      'M6 4h2.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1 -2 2h-2.5a2 2 0 0 1 -2 -2v-2.5a2 2 0 0 1 2 -2z',
    ],
  },
  comprobante: {
    trazos: [
      'M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z',
      'M9 8h6',
      'M9 11.5h6',
      'M9 15h3.5',
    ],
    relleno: ['M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z'],
  },
  camara: {
    trazos: [
      'M4 9a2 2 0 0 1 2-2h1.8l1.4-2.3h5.6L16.2 7H18a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
      'M8.7 13a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0',
    ],
  },
  // R4-C (a8): video propio (adjunto de mantenimiento), distinto de la cámara de fotos.
  video: {
    trazos: [
      'M4 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
      'M16 10.5l4-2.5v8l-4-2.5',
    ],
  },
  documento: {
    trazos: [
      'M14 3.5H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-11z',
      'M14 3.5v4h4',
      'M9 12.5h6',
      'M9 16h4',
    ],
  },
  descarga: {
    trazos: ['M12 4v10.5', 'M8 10.5l4 4 4-4', 'M5 16v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V16'],
  },
  compartir: {
    trazos: [
      'M14 4.5h5.5V10',
      'M19.5 4.5L12 12',
      'M17.5 13.5v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h4',
    ],
  },
  mantenimiento: {
    trazos: [
      'M6.5 8.5h11a3.5 3.5 0 0 1 3.5 3.5v0a3.5 3.5 0 0 1 -3.5 3.5h-11a3.5 3.5 0 0 1 -3.5 -3.5v0a3.5 3.5 0 0 1 3.5 -3.5z',
      'M11 10.5h2a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1 -1.5 1.5h-2a1.5 1.5 0 0 1 -1.5 -1.5v0a1.5 1.5 0 0 1 1.5 -1.5z',
      'M7.5 8.5v2',
      'M16.5 8.5v2',
    ],
    relleno: [
      'M6.5 8.5h11a3.5 3.5 0 0 1 3.5 3.5v0a3.5 3.5 0 0 1 -3.5 3.5h-11a3.5 3.5 0 0 1 -3.5 -3.5v0a3.5 3.5 0 0 1 3.5 -3.5z',
    ],
  },
  alerta: {
    trazos: ['M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14z', 'M10.2 20.5h3.6'],
    relleno: ['M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14z'],
  },
  calendario: {
    trazos: [
      'M7 5.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3z',
      'M4 10h16',
      'M8.5 3.5V7',
      'M15.5 3.5V7',
      'M14.4 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0',
    ],
    relleno: ['M4 8.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V10H4z'],
  },
  filtro: {
    trazos: [
      'M4 7h8.8',
      'M17.2 7H20',
      'M4 12h2.8',
      'M11.2 12H20',
      'M4 17h10.8',
      'M19.2 17h.8',
      'M12.8 7a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0',
      'M6.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0',
      'M14.8 17a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0',
    ],
  },
  atras: {
    trazos: ['M14.5 5.5L8 12l6.5 6.5'],
  },
  buscar: {
    trazos: ['M4.2 10.5a6.3 6.3 0 1 0 12.6 0a6.3 6.3 0 1 0 -12.6 0', 'M15.2 15.2L20 20'],
  },
  aprobar: {
    trazos: ['M5 12.5l4.5 4.5L19 7.5'],
  },
  rechazar: {
    trazos: ['M7 7l10 10', 'M17 7L7 17'],
  },
  anadir: {
    trazos: ['M12 5v14', 'M5 12h14'],
  },
  perfil: {
    trazos: [
      'M8.4 8.8a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0',
      'M5 20c1.3-3.3 3.9-5 7-5s5.7 1.7 7 5',
    ],
  },
  // Fuera de la hoja de 20: chevron de las filas de lista (pantalla Panel del diseño).
  adelante: {
    trazos: ['M9.5 5.5L16 12l-6.5 6.5'],
  },
} as const satisfies Record<string, TrazoIcono>;

export type NombreIcono = keyof typeof TRAZOS_ICONOS;
