// Comprobante de pago: foto (cámara o galería, reducida antes de subir) o PDF. La foto se elige con
// elegirFoto/OpcionesFoto; aquí se prepara. Todo lo demás lo valida el servidor (JPEG, PNG o PDF,
// hasta 10 MB): en el cliente solo se revisa lo que ahorra una subida inútil.

import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ArchivoSubida } from '../api/cliente';
import type { ArchivoFoto } from '../api/inmuebles';
import { TAMANO_MAXIMO_FOTO_BYTES } from '../api/mensajesArchivo';

/** Solo para comprobantes: las demás pantallas de fotos no se reducen. */
export const ANCHO_MAXIMO_COMPROBANTE = 1600;
export const CALIDAD_JPEG_COMPROBANTE = 0.75;
export const TAMANO_MAXIMO_COMPROBANTE_BYTES = TAMANO_MAXIMO_FOTO_BYTES;

export interface Comprobante extends ArchivoSubida {
  /** Nombre que se le muestra a la persona (el servidor recibe `name`, que es fijo). */
  nombreVisible: string;
  tamanoBytes?: number;
}

/**
 * Reduce la foto a 1600 px de ancho como máximo y la vuelve a codificar como JPEG 0.75: pesa mucho
 * menos y se pierden los metadatos (ubicación). Una imagen de 1600 px o menos solo se recodifica.
 */
export async function prepararFoto(archivo: ArchivoFoto): Promise<Comprobante> {
  const original = await ImageManipulator.manipulate(archivo.uri).renderAsync();
  const imagen =
    original.width > ANCHO_MAXIMO_COMPROBANTE
      ? await ImageManipulator.manipulate(original)
          .resize({ width: ANCHO_MAXIMO_COMPROBANTE })
          .renderAsync()
      : original;
  const salida = await imagen.saveAsync({
    compress: CALIDAD_JPEG_COMPROBANTE,
    format: SaveFormat.JPEG,
  });
  return {
    uri: salida.uri,
    name: 'comprobante.jpg',
    type: 'image/jpeg',
    nombreVisible: 'comprobante.jpg',
  };
}

export type ResultadoPdf =
  | { tipo: 'elegido'; comprobante: Comprobante }
  | { tipo: 'cancelado' }
  | { tipo: 'vacio' }
  | { tipo: 'grande' }
  | { tipo: 'formato' }
  | { tipo: 'error' };

/**
 * PDF con el selector de documentos. `copyToCacheDirectory` es necesario: en Android el selector
 * devuelve una URI content:// que el cargador de archivos no puede leer.
 */
export async function elegirPdf(): Promise<ResultadoPdf> {
  try {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    const activo = resultado.assets?.[0];
    if (resultado.canceled || !activo) return { tipo: 'cancelado' };
    if (activo.mimeType && activo.mimeType !== 'application/pdf') return { tipo: 'formato' };
    if (activo.size === 0) return { tipo: 'vacio' };
    if (typeof activo.size === 'number' && activo.size > TAMANO_MAXIMO_COMPROBANTE_BYTES) {
      return { tipo: 'grande' };
    }
    return {
      tipo: 'elegido',
      comprobante: {
        uri: activo.uri,
        // Nombre fijo hacia el servidor: no se envía el nombre original del archivo.
        name: 'comprobante.pdf',
        type: 'application/pdf',
        nombreVisible: activo.name,
        tamanoBytes: activo.size,
      },
    };
  } catch {
    return { tipo: 'error' };
  }
}

/** Texto para un resultado que no es un PDF elegido; null si no hay nada que decir. */
export function mensajeDeResultadoPdf(resultado: ResultadoPdf): string | null {
  switch (resultado.tipo) {
    case 'vacio':
      return 'Ese archivo está vacío. Elige otro.';
    case 'grande':
      return 'El archivo es demasiado grande (máximo 10 MB).';
    case 'formato':
      return 'Ese archivo no es un PDF. Elige un PDF o una foto.';
    case 'error':
      return 'No pudimos abrir el selector de archivos. Inténtalo de nuevo.';
    default:
      return null;
  }
}

/** 800 → "800 B"; 250000 → "244 KB"; 2621440 → "2,5 MB". */
export function describirTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
