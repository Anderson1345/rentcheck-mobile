// Configuración común de Jest (setupFilesAfterEnv, R4-C): todo árbol creado con react-test-renderer se
// desmonta al terminar su prueba (ver src/pruebas/limpieza.ts). Así ninguna actualización (TanStack Query,
// la cuenta regresiva de "Verifica tu correo", la app completa de las pruebas de navegación) llega después
// de cerrar el entorno, y el worker de Jest termina solo. Las pruebas no cambian: siguen usando `create`.
import { alTerminarLaPrueba, limpiarPrueba } from './limpieza';

// El prefijo "mock" deja usarlo dentro de la fábrica; apunta a ESTE registro aunque una prueba llame a
// jest.resetModules() (la fábrica vuelve a correr, pero el cierre sigue siendo este).
const mockAlTerminarLaPrueba = alTerminarLaPrueba;

jest.mock('react-test-renderer', () => {
  const real = jest.requireActual('react-test-renderer');
  return {
    ...real,
    create: (...argumentos: Parameters<typeof real.create>) => {
      const raiz = real.create(...argumentos);
      mockAlTerminarLaPrueba(async () => {
        await real.act(async () => raiz.unmount());
      });
      return raiz;
    },
  };
});

afterEach(async () => {
  await limpiarPrueba();
});
