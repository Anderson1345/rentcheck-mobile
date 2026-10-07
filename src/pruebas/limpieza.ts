// Limpieza al terminar cada prueba (R4-C). Un árbol de React que sigue montado después de la prueba
// recibe las notificaciones de TanStack Query (llegan con setTimeout) y vuelve a pintar cuando Jest ya
// desmontó el entorno: de ahí salían "Cannot log after tests are done", "import a file after the Jest
// environment has been torn down" y el aviso de que un worker no terminó bien. Quien monta algo registra
// aquí cómo desmontarlo; src/pruebas/despuesDeCadaPrueba.ts vacía la lista en cada afterEach.

type Limpieza = () => void | Promise<void>;

const pendientes: Limpieza[] = [];

/** Registra algo que hay que deshacer al terminar la prueba actual (desmontar, vaciar una caché…). */
export function alTerminarLaPrueba(limpieza: Limpieza): void {
  pendientes.push(limpieza);
}

/** Corre las limpiezas registradas, de la última a la primera. Un fallo no detiene a las demás. */
export async function limpiarPrueba(): Promise<void> {
  while (pendientes.length > 0) {
    const limpieza = pendientes.pop();
    try {
      await limpieza?.();
    } catch {
      // Un árbol que la prueba ya desmontó, por ejemplo: no hay nada más que hacer.
    }
  }
}
