// Foto desde la cámara o la galería con expo-image-picker. Devuelve siempre un resultado (nunca
// lanza): elegida, cancelada, permiso denegado, formato no admitido, demasiado grande o error.

import * as ImagePicker from 'expo-image-picker';

import type { ArchivoFoto } from '../api/inmuebles';
import { TAMANO_MAXIMO_FOTO_BYTES } from '../api/mensajesArchivo';

/** Compresión del propio selector: una foto de teléfono queda en 1 a 3 MB, muy por debajo de 10 MB. */
export const CALIDAD_FOTO = 0.7;
export { TAMANO_MAXIMO_FOTO_BYTES };

export type OrigenFoto = 'camara' | 'galeria';

export type ResultadoFoto =
  | { tipo: 'elegida'; archivo: ArchivoFoto }
  | { tipo: 'cancelada' }
  | { tipo: 'denegado'; definitivo: boolean }
  | { tipo: 'formato' }
  | { tipo: 'grande' }
  | { tipo: 'error' };

type TipoImagen = ArchivoFoto['type'];

const EXTENSION: Record<TipoImagen, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };

/** JPG o PNG: por el tipo que informa el sistema o, si falta, por la extensión de la ruta. */
function tipoDeImagen(mimeType: string | null | undefined, uri: string): TipoImagen | null {
  const informado = mimeType?.toLowerCase();
  if (informado) {
    if (informado === 'image/jpeg' || informado === 'image/jpg') return 'image/jpeg';
    if (informado === 'image/png') return 'image/png';
    return null;
  }
  const extension = /\.(jpe?g|png)(?:$|\?)/i.exec(uri)?.[1]?.toLowerCase();
  if (!extension) return null;
  return extension === 'png' ? 'image/png' : 'image/jpeg';
}

function aResultado(activo: ImagePicker.ImagePickerAsset): ResultadoFoto {
  const tipo = tipoDeImagen(activo.mimeType, activo.uri);
  if (!tipo) return { tipo: 'formato' };
  if (typeof activo.fileSize === 'number' && activo.fileSize > TAMANO_MAXIMO_FOTO_BYTES) {
    return { tipo: 'grande' };
  }
  // Nombre fijo: no se envía el nombre original del archivo del teléfono.
  return {
    tipo: 'elegida',
    archivo: { uri: activo.uri, name: `portada.${EXTENSION[tipo]}`, type: tipo },
  };
}

/**
 * La cámara pide permiso en el momento de usarla. La galería abre el selector del sistema (Android
 * y iOS lo ofrecen sin permiso de acceso a las fotos): solo se pasa a la persona lo que elija.
 */
export async function elegirFoto(origen: OrigenFoto): Promise<ResultadoFoto> {
  try {
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return { tipo: 'denegado', definitivo: !permiso.canAskAgain };
    }
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: CALIDAD_FOTO,
      allowsEditing: false,
      exif: false,
    };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);
    const activo = resultado.assets?.[0];
    if (resultado.canceled || !activo) return { tipo: 'cancelada' };
    return aResultado(activo);
  } catch {
    return { tipo: 'error' };
  }
}

/** Texto para mostrar ante un resultado que no es una foto; null si no hay nada que decir. */
export function mensajeDeResultadoFoto(resultado: ResultadoFoto): string | null {
  switch (resultado.tipo) {
    case 'denegado':
      return resultado.definitivo
        ? 'El permiso de la cámara está desactivado. Actívalo en los ajustes del teléfono para tomar fotos, o elige una de la galería.'
        : 'Para tomar la foto, RentCheck necesita permiso para usar la cámara. También puedes elegir una foto de la galería.';
    case 'formato':
      return 'Esa imagen no es JPG ni PNG. Elige otra foto o tómala con la cámara.';
    case 'grande':
      return 'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.';
    case 'error':
      return 'No pudimos abrir la cámara o la galería. Inténtalo de nuevo.';
    default:
      return null;
  }
}
