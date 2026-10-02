// Clave de idempotencia por borrador (cabecera Idempotency-Key), común a todo envío que el servidor
// deduplica por clave y contenido (pagos, solicitudes de mantenimiento).

import { generarClaveIdempotencia } from './idempotencia';

/** Campo escalar del contenido de un envío. */
export type CampoBorrador = string | number | boolean | null | undefined;

/**
 * UNA clave de idempotencia por borrador. Se conserva mientras el contenido (los campos y el archivo
 * adjunto) no cambie, aunque haya errores de red o "sin respuesta": así reenviar no duplica el
 * registro, porque el servidor devuelve el mismo. Cambia cuando cambia cualquier campo o el adjunto
 * (el servidor compara incluso los bytes del archivo, por eso el adjunto no se vuelve a preparar
 * entre reintentos) y tras un envío exitoso (`reiniciar`).
 */
export class BorradorIdempotente {
  private actual: { huella: string; clave: string } | null = null;

  constructor(private readonly generar: () => string = () => generarClaveIdempotencia()) {}

  /** `campos` en un orden fijo; `archivoUri` es la uri ya preparada (la que se sube) o null. */
  claveParaEnvio(campos: readonly CampoBorrador[], archivoUri: string | null | undefined): string {
    // JSON distingue null de "" y de undefined (que queda como null en un arreglo).
    const huella = JSON.stringify([campos, archivoUri ?? null]);
    if (!this.actual || this.actual.huella !== huella) {
      this.actual = { huella, clave: this.generar() };
    }
    return this.actual.clave;
  }

  reiniciar(): void {
    this.actual = null;
  }
}
