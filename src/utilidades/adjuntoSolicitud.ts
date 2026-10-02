// Adjunto de una solicitud de mantenimiento: UNA foto (JPG o PNG) o UN video MP4, hasta 20 MB. El
// servidor valida el contenido real por bytes; aquí solo se revisa lo que ahorra una subida inútil.
// Un video nunca se recodifica ni se recorta (en Expo Go no existe compresión de video): se muestra su
// tamaño y se bloquea lo que pasa del máximo. La foto se reduce UNA vez al elegirla y esa uri es la
// que se guarda en el borrador y se usa en todos los reintentos (el servidor compara los bytes).

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import type { ArchivoSubida } from '../api/cliente';
import type { ArchivoFoto } from '../api/inmuebles';
import { describirTamano, prepararFoto } from './comprobante';

/** Máximo que acepta el servidor para el adjunto (413 por encima). */
export const TAMANO_MAXIMO_ADJUNTO_BYTES = 20 * 1024 * 1024;
/** Tope de la grabación con la cámara; en Android depende de la app de cámara y puede no respetarse. */
export const DURACION_MAXIMA_VIDEO_SEGUNDOS = 30;

export type TipoAdjuntoElegido = 'IMAGEN' | 'VIDEO';

export interface AdjuntoElegido extends ArchivoSubida {
  tipo: TipoAdjuntoElegido;
  /** Nombre que se le muestra a la persona (el servidor recibe `name`, que es fijo). */
  nombreVisible: string;
  tamanoBytes?: number;
  duracionMs?: number;
}

/** La foto ya reducida (1600 px, JPEG 0,75), lista para subir. Se llama una sola vez por foto. */
export async function prepararAdjuntoFoto(archivo: ArchivoFoto): Promise<AdjuntoElegido> {
  const reducida = await prepararFoto(archivo);
  return {
    uri: reducida.uri,
    name: 'foto.jpg',
    type: 'image/jpeg',
    tipo: 'IMAGEN',
    nombreVisible: 'foto.jpg',
  };
}

export type OrigenVideo = 'camara' | 'galeria';

export type ResultadoVideo =
  | { tipo: 'elegido'; adjunto: AdjuntoElegido }
  | { tipo: 'cancelado' }
  | { tipo: 'denegado'; definitivo: boolean }
  | { tipo: 'formato' }
  | { tipo: 'grande'; tamanoBytes: number }
  | { tipo: 'vacio' }
  | { tipo: 'error' };

/** Lee el tamaño del archivo cuando el selector no lo informa; null si no se puede saber. */
export type LectorDeTamano = (uri: string) => Promise<number | null>;

const leerTamanoNativo: LectorDeTamano = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
};

/** MP4: por el tipo que informa el sistema o, si falta, por la extensión del nombre o de la ruta. */
function esMp4(
  mimeType: string | null | undefined,
  nombre: string | null | undefined,
  uri: string,
) {
  const informado = mimeType?.toLowerCase();
  if (informado) return informado === 'video/mp4';
  return /\.mp4(?:$|\?)/i.test(nombre ?? uri);
}

/**
 * Video desde la cámara o la galería. Devuelve siempre un resultado (nunca lanza). El tipo que se
 * declara al servidor es siempre `video/mp4`.
 */
export async function elegirVideo(
  origen: OrigenVideo,
  leerTamano: LectorDeTamano = leerTamanoNativo,
): Promise<ResultadoVideo> {
  try {
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return { tipo: 'denegado', definitivo: !permiso.canAskAgain };
    }
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      allowsEditing: false,
      videoMaxDuration: DURACION_MAXIMA_VIDEO_SEGUNDOS,
    };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);
    const activo = resultado.assets?.[0];
    if (resultado.canceled || !activo) return { tipo: 'cancelado' };

    if (!esMp4(activo.mimeType, activo.fileName, activo.uri)) return { tipo: 'formato' };
    const tamano = activo.fileSize ?? (await leerTamano(activo.uri)) ?? undefined;
    if (tamano === 0) return { tipo: 'vacio' };
    if (tamano !== undefined && tamano > TAMANO_MAXIMO_ADJUNTO_BYTES) {
      return { tipo: 'grande', tamanoBytes: tamano };
    }
    return {
      tipo: 'elegido',
      adjunto: {
        uri: activo.uri,
        // Nombre y tipo fijos hacia el servidor: no se envía el nombre original del teléfono.
        name: 'video.mp4',
        type: 'video/mp4',
        tipo: 'VIDEO',
        nombreVisible: activo.fileName ?? 'video.mp4',
        ...(tamano !== undefined ? { tamanoBytes: tamano } : {}),
        ...(typeof activo.duration === 'number' ? { duracionMs: activo.duration } : {}),
      },
    };
  } catch {
    return { tipo: 'error' };
  }
}

/** Texto para un resultado que no es un video elegido; null si no hay nada que decir. */
export function mensajeDeResultadoVideo(resultado: ResultadoVideo): string | null {
  switch (resultado.tipo) {
    case 'denegado':
      return resultado.definitivo
        ? 'El permiso de la cámara está desactivado. Actívalo en los ajustes del teléfono para grabar, o elige un video de la galería.'
        : 'Para grabar el video, RentCheck necesita permiso para usar la cámara. También puedes elegir un video de la galería.';
    case 'formato':
      return 'Solo se admiten videos MP4.';
    case 'grande':
      return `El video pesa ${describirTamano(resultado.tamanoBytes)} y el máximo es 20 MB. Elige un clip más corto: con unos 15 segundos suele bastar.`;
    case 'vacio':
      return 'Ese video está vacío. Elige otro.';
    case 'error':
      return 'No pudimos abrir la cámara o la galería. Inténtalo de nuevo.';
    default:
      return null;
  }
}

/** 12000 → "0:12"; 65000 → "1:05"; sin dato, vacío. */
export function describirDuracion(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '';
  const total = Math.round(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = String(total % 60).padStart(2, '0');
  return `${minutos}:${segundos}`;
}
