// Layout raíz: las rutas de cada rol solo existen para ese rol (Stack.Protected) y el splash se
// oculta cuando la sesión terminó de cargar. Se usa el layout real con un Stack falso que solo
// reporta qué pantallas quedan accesibles, y un llavero (expo-secure-store) en memoria.
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import type { ReactTestRenderer } from 'react-test-renderer';

import { crearToken } from '../pruebas/crearToken';

const mockLlavero = new Map<string, string>();
const mockOcultarSplash = jest.fn();
const mockFuentes = { listas: true };

jest.mock('expo-secure-store', () => ({
  setItemAsync: async (clave: string, valor: string) => void mockLlavero.set(clave, valor),
  getItemAsync: async (clave: string) => mockLlavero.get(clave) ?? null,
  deleteItemAsync: async (clave: string) => void mockLlavero.delete(clave),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: () => mockOcultarSplash(),
}));
jest.mock('expo-font', () => ({ useFonts: () => [mockFuentes.listas, null] }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-router', () => {
  const { Text: TextoNativo } = jest.requireActual('react-native');
  function Stack({ children }: { children: ReactElement }) {
    return children;
  }
  Stack.Protected = function Protected({
    guard,
    children,
  }: {
    guard: boolean;
    children: ReactElement;
  }) {
    return guard ? children : null;
  };
  Stack.Screen = function Screen({ name }: { name: string }) {
    return <TextoNativo>{name}</TextoNativo>;
  };
  return { Stack };
});

const GUARDADA = (payload: Record<string, unknown>, rol: string) =>
  JSON.stringify({
    token: crearToken(payload),
    rol,
    usuario: { id: 'x', nombre: 'Persona', correo: 'p@x.co' },
  });
const LEJANO = 4_102_444_800;

/**
 * Monta el layout real con un registro de módulos nuevo (el controlador de sesión es uno por
 * módulo). React, el renderizador y react-native se cargan dentro del mismo registro aislado
 * para que compartan una sola copia de React.
 */
async function montar(guardado: string | null) {
  mockLlavero.clear();
  if (guardado) mockLlavero.set('rentcheck_sesion', guardado);
  let modulos!: {
    renderizador: typeof import('react-test-renderer');
    react: typeof import('react');
    Layout: () => ReactElement;
    TextoNativo: typeof Text;
  };
  /* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules exige require */
  jest.isolateModules(() => {
    modulos = {
      renderizador: require('react-test-renderer'),
      react: require('react'),
      Layout: require('../../app/_layout').default,
      TextoNativo: require('react-native').Text,
    };
  });
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { renderizador, react, Layout, TextoNativo } = modulos;
  let raiz!: ReactTestRenderer;
  await renderizador.act(async () => {
    raiz = renderizador.create(react.createElement(Layout));
  });
  return raiz.root.findAllByType(TextoNativo).map((n) => n.props.children as string);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFuentes.listas = true;
});

describe('layout raíz: rutas protegidas por rol', () => {
  it('sin sesión: solo existe (auth) — ni (arrendador) ni (inquilino)', async () => {
    expect(await montar(null)).toEqual(['(auth)']);
  });

  it('arrendador: solo (arrendador)', async () => {
    const visibles = await montar(GUARDADA({ id: 'a1', exp: LEJANO }, 'arrendador'));
    expect(visibles).toEqual(['(arrendador)']);
  });

  it('inquilino: solo (inquilino); no puede entrar a las rutas del arrendador', async () => {
    const visibles = await montar(GUARDADA({ inquilinoId: 'i1', exp: LEJANO }, 'inquilino'));
    expect(visibles).toEqual(['(inquilino)']);
    expect(visibles).not.toContain('(arrendador)');
  });

  it('el rol sale del token: un rol guardado distinto del del token no abre la pantalla de ese rol', async () => {
    // El almacén dice "arrendador" pero el token es de inquilino: se descarta la sesión.
    const visibles = await montar(GUARDADA({ inquilinoId: 'i1', exp: LEJANO }, 'arrendador'));
    expect(visibles).toEqual(['(auth)']);
    expect(mockLlavero.size).toBe(0);
  });

  it('token vencido al arrancar: vuelve a (auth) y se borra lo guardado', async () => {
    const visibles = await montar(GUARDADA({ id: 'a1', exp: 1 }, 'arrendador'));
    expect(visibles).toEqual(['(auth)']);
    expect(mockLlavero.size).toBe(0);
  });
});

describe('layout raíz: splash', () => {
  it('se oculta cuando la sesión terminó de cargar (con sesión guardada ya muestra la pantalla del rol)', async () => {
    const visibles = await montar(GUARDADA({ id: 'a1', exp: LEJANO }, 'arrendador'));
    expect(mockOcultarSplash).toHaveBeenCalledTimes(1);
    expect(visibles).toEqual(['(arrendador)']);
  });

  it('no se oculta, ni se pinta nada, mientras la fuente no esté lista', async () => {
    mockFuentes.listas = false;
    const visibles = await montar(null);
    expect(mockOcultarSplash).not.toHaveBeenCalled();
    expect(visibles).toEqual([]);
  });
});
