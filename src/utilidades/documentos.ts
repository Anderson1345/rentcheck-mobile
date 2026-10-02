// Descarga un PDF firmado al caché y abre el selector de compartir. La URL firmada es temporal y
// sensible: no se guarda, no se registra y ningún error la repite.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export class ErrorDescarga extends Error {
  constructor() {
    super('No se pudo descargar el documento.');
    this.name = 'ErrorDescarga';
  }
}

/** Por defecto, un PDF de contrato; los comprobantes de pago pasan su propio título y tipo. */
export interface OpcionesDescarga {
  titulo?: string;
  mimeType?: string;
  uti?: string;
}

export async function descargarYCompartir(
  url: string,
  nombreArchivo: string,
  opciones: OpcionesDescarga = {},
): Promise<void> {
  const destino = `${FileSystem.cacheDirectory}${nombreArchivo}`;
  let descargado = false;
  try {
    const resultado = await FileSystem.downloadAsync(url, destino);
    descargado = true;
    if (resultado.status < 200 || resultado.status >= 300) throw new ErrorDescarga();
    if (!(await Sharing.isAvailableAsync())) throw new ErrorDescarga();
    await Sharing.shareAsync(resultado.uri, {
      mimeType: opciones.mimeType ?? 'application/pdf',
      dialogTitle: opciones.titulo ?? 'Compartir contrato',
      UTI: opciones.uti ?? 'com.adobe.pdf',
    });
  } catch {
    // Cualquier fallo (incluido el nativo, que puede traer la URL en su texto) es el mismo error.
    throw new ErrorDescarga();
  } finally {
    // El documento es sensible: no se deja en el caché.
    if (descargado)
      await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => undefined);
  }
}
