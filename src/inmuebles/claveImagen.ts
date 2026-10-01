// Clave de caché de la portada. La URL firmada cambia en cada petición (la firma vence en 1 hora),
// pero la foto es la misma: sin una clave estable, la imagen se descarga de nuevo y parpadea.
//
// El contrato no trae updated_at y el servidor sobrescribe la foto en la MISMA ruta
// (inmuebles/<id>/portada.jpg), así que la ruta por sí sola no detecta un cambio de foto. Por eso
// la clave suma: la ruta sin firma + una versión local que sube cuando la app cambia la foto +
// una ventana de 6 horas (cubre un cambio hecho desde otro dispositivo).

const VENTANA_MS = 6 * 60 * 60 * 1000;
const versiones = new Map<string, number>();

/** Llamar cuando la app sube una portada nueva: la clave cambia y la imagen se descarga otra vez. */
export function marcarPortadaCambiada(inmuebleId: string): void {
  versiones.set(inmuebleId, (versiones.get(inmuebleId) ?? 0) + 1);
}

/** null si no hay URL remota (sin foto o vista previa local): no se cachea con clave propia. */
export function claveCachePortada(
  inmuebleId: string,
  url: string | null,
  ahora: number = Date.now(),
): string | null {
  const ruta = url ? /^https?:\/\/[^/]+(\/[^?#]*)/i.exec(url)?.[1] : undefined;
  if (!ruta) return null;
  const version = versiones.get(inmuebleId) ?? 0;
  return `portada:${inmuebleId}:${ruta}:v${version}:${Math.floor(ahora / VENTANA_MS)}`;
}
