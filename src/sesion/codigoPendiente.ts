// Código de activación que espera a que la persona inicie sesión para vincularse ("ya tengo
// cuenta"). Vive solo en memoria: NUNCA en AsyncStorage, secure-store ni logs. Se consume una sola
// vez, sea cual sea el resultado de la vinculación.

let codigoPendiente: string | null = null;

export function guardarCodigoPendiente(codigo: string): void {
  codigoPendiente = codigo;
}

export function hayCodigoPendiente(): boolean {
  return codigoPendiente !== null;
}

/** Devuelve el código y lo borra: una segunda llamada devuelve null. */
export function consumirCodigoPendiente(): string | null {
  const codigo = codigoPendiente;
  codigoPendiente = null;
  return codigo;
}

export function limpiarCodigoPendiente(): void {
  codigoPendiente = null;
}
