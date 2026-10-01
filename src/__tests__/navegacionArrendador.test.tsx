// Navegación del arrendador con los layouts REALES (raíz, grupo (arrendador) y (pestanas)) y el
// controlador de sesión real. Solo expo-router se reemplaza por un enrutador mínimo que reproduce
// las reglas que importan aquí: Stack.Protected monta una pantalla solo si su guardia es verdadera,
// un Stack sin hijos monta la ruta que toca, y Tabs entrega a `tabBar` el estado de sus pestañas.
// Así se ven el montaje y el desmontaje de los grupos al cambiar la sesión (donde fallan los mocks).
import type { ComponentType, ReactElement } from 'react';
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import { crearToken } from '../pruebas/crearToken';

const mockLlavero = new Map<string, string>();
const mockNavegar = jest.fn();
const mockListar = jest.fn();
let mockRuta: string[] = [];
let mockArbol: Record<string, ComponentType> = {};
let mockNombresTabs: string[] = [];

jest.mock('expo-secure-store', () => ({
  setItemAsync: async (clave: string, valor: string) => void mockLlavero.set(clave, valor),
  getItemAsync: async (clave: string) => mockLlavero.get(clave) ?? null,
  deleteItemAsync: async (clave: string) => void mockLlavero.delete(clave),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
// gcTime infinito: sin el temporizador de limpieza de 5 min que dejaría vivo a Jest.
jest.mock('../consultas/cliente-consultas', () => ({
  ...jest.requireActual('../consultas/cliente-consultas'),
  crearClienteDeConsultas: () =>
    new (jest.requireActual('@tanstack/react-query').QueryClient)({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
        mutations: { gcTime: Infinity },
      },
    }),
}));
jest.mock('../api/inmuebles', () => ({
  ...jest.requireActual('../api/inmuebles'),
  listarInmuebles: (...a: unknown[]) => mockListar(...a),
}));
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const Nivel = React.createContext(0);

  /** Monta la ruta que toca en este nivel: primero su layout (si lo hay) y, dentro, el siguiente. */
  function Salida() {
    const nivel = React.useContext(Nivel);
    const Componente = mockArbol[mockRuta.slice(0, nivel + 1).join('/')];
    if (!Componente) return null;
    return (
      <Nivel.Provider value={nivel + 1}>
        <Componente />
      </Nivel.Provider>
    );
  }
  function Stack({ children }: { children?: ReactElement }) {
    return children ? <>{children}</> : <Salida />;
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
    const nivel = React.useContext(Nivel);
    return name === mockRuta[nivel] ? <Salida /> : null;
  };
  function Tabs({
    tabBar,
    children,
  }: {
    tabBar: (p: unknown) => ReactElement;
    children: ReactElement | ReactElement[];
  }) {
    const nivel = React.useContext(Nivel);
    const nombres: string[] = React.Children.toArray(children).map(
      (c: unknown) => (c as ReactElement<{ name: string }>).props.name,
    );
    React.useEffect(() => {
      mockNombresTabs = nombres;
    });
    return (
      <>
        <Salida />
        {tabBar({
          state: {
            index: nombres.indexOf(mockRuta[nivel]),
            routes: nombres.map((name) => ({ name })),
          },
          navigation: { navigate: mockNavegar },
          descriptors: {},
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        })}
      </>
    );
  }
  Tabs.Screen = function PantallaTab() {
    return null;
  };
  return {
    Stack,
    Tabs,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: () => undefined,
  };
});

// Cargar el layout real, sus pantallas y la sesión por prueba tarda: la suite completa corre en paralelo.
jest.setTimeout(60_000);

const LEJANO = 4_102_444_800;
const guardada = (payload: Record<string, unknown>, rol: string) =>
  JSON.stringify({
    token: crearToken(payload),
    rol,
    usuario: { id: 'x', nombre: 'Camila Ruiz', correo: 'c@x.co' },
  });
const ARRENDADOR = () => guardada({ id: 'a1', exp: LEJANO }, 'arrendador');
const INQUILINO = () => guardada({ inquilinoId: 'i1', exp: LEJANO }, 'inquilino');

interface Montaje {
  raiz: ReactTestRenderer;
  rn: typeof import('react-native');
  rt: typeof import('react-test-renderer');
  etiquetasTabs: () => string[];
  textos: () => string[];
  pestana: (etiqueta: string) => ReactTestInstance;
}

/** Monta el layout raíz real, con módulos nuevos (un controlador de sesión por prueba). */
async function montar(guardado: string | null, ruta: string[]): Promise<Montaje> {
  mockLlavero.clear();
  if (guardado) mockLlavero.set('rentcheck_sesion', guardado);
  mockRuta = ruta;
  /* eslint-disable @typescript-eslint/no-require-imports -- resetModules exige require */
  jest.resetModules();
  const rt: typeof import('react-test-renderer') = require('react-test-renderer');
  const react: typeof import('react') = require('react');
  const rn: typeof import('react-native') = require('react-native');
  const Raiz: ComponentType = require('../../app/_layout').default;
  mockArbol = {
    '(auth)': require('../../app/(auth)/_layout').default,
    '(arrendador)': require('../../app/(arrendador)/_layout').default,
    '(arrendador)/(pestanas)': require('../../app/(arrendador)/(pestanas)/_layout').default,
    '(arrendador)/(pestanas)/panel': require('../../app/(arrendador)/(pestanas)/panel').default,
    '(arrendador)/(pestanas)/inmuebles': require('../../app/(arrendador)/(pestanas)/inmuebles')
      .default,
    '(arrendador)/(pestanas)/contratos-arrendador':
      require('../../app/(arrendador)/(pestanas)/contratos-arrendador').default,
    '(arrendador)/(pestanas)/pagos-arrendador':
      require('../../app/(arrendador)/(pestanas)/pagos-arrendador').default,
    '(arrendador)/(pestanas)/mas-arrendador':
      require('../../app/(arrendador)/(pestanas)/mas-arrendador').default,
    '(inquilino)': require('../../app/(inquilino)/_layout').default,
    '(inquilino)/contratos': require('../../app/(inquilino)/contratos').default,
  };
  /* eslint-enable @typescript-eslint/no-require-imports */

  let raiz!: ReactTestRenderer;
  await rt.act(async () => {
    raiz = rt.create(react.createElement(Raiz));
  });
  await rt.act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });

  const textos = () =>
    raiz.root
      .findAllByType(rn.Text)
      .map((n) =>
        (Array.isArray(n.props.children) ? n.props.children : [n.props.children])
          .filter((c: unknown) => typeof c === 'string' || typeof c === 'number')
          .join(''),
      );
  // Cada Pressable aparece varias veces en el árbol (envoltorios y vista nativa): se toma una por etiqueta.
  const pestanas = () => {
    const vistas = new Set<string>();
    return raiz.root.findAll((n) => {
      const etiqueta = n.props.accessibilityLabel as string | undefined;
      if (n.props.accessibilityRole !== 'tab' || typeof n.props.onPress !== 'function')
        return false;
      if (etiqueta === undefined || vistas.has(etiqueta)) return false;
      vistas.add(etiqueta);
      return true;
    });
  };
  return {
    raiz,
    rn,
    rt,
    textos,
    etiquetasTabs: () => pestanas().map((n) => n.props.accessibilityLabel as string),
    pestana: (etiqueta) => {
      const nodo = pestanas().find((n) => n.props.accessibilityLabel === etiqueta);
      if (!nodo) throw new Error(`No hay una pestaña "${etiqueta}"`);
      return nodo;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListar.mockReset().mockResolvedValue([]);
});

describe('barra inferior del arrendador (layouts reales)', () => {
  it('el arrendador ve las 5 pestañas, con "Panel" activa y las etiquetas siempre visibles', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'panel']);

    expect(m.etiquetasTabs()).toEqual(['Panel', 'Inmuebles', 'Contratos', 'Pagos', 'Más']);
    expect(m.pestana('Panel').props).toMatchObject({ accessibilityState: { selected: true } });
    expect(m.pestana('Inmuebles').props).toMatchObject({ accessibilityState: { selected: false } });
    for (const etiqueta of ['Panel', 'Inmuebles', 'Contratos', 'Pagos', 'Más']) {
      expect(m.textos()).toContain(etiqueta);
    }
    // La pantalla de inicio sigue siendo el saludo provisional.
    expect(m.textos()).toContain('Hola, Camila Ruiz');
  });

  it('las pestañas navegan por el nombre de ruta que declara el layout (sin rutas huérfanas)', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'panel']);
    const { PESTANAS_ARRENDADOR } = jest.requireActual<
      typeof import('../componentes/navegacion/configuracion')
    >('../componentes/navegacion/configuracion');

    expect(mockNombresTabs).toEqual(PESTANAS_ARRENDADOR.map((p) => p.clave));

    await m.rt.act(async () => m.pestana('Inmuebles').props.onPress());
    expect(mockNavegar).toHaveBeenCalledWith('inmuebles');
    await m.rt.act(async () => m.pestana('Más').props.onPress());
    expect(mockNavegar).toHaveBeenLastCalledWith('mas-arrendador');
  });

  it('en la pestaña Inmuebles se ve la lista real y la pestaña activa cambia', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'inmuebles']);
    expect(m.textos()).toContain('Aún no tienes inmuebles');
    expect(m.pestana('Inmuebles').props).toMatchObject({ accessibilityState: { selected: true } });
    expect(m.etiquetasTabs()).toHaveLength(5);
  });

  it.each([
    ['contratos-arrendador', 'Contratos', 'Próximamente (E5)'],
    ['pagos-arrendador', 'Pagos', 'Próximamente (E7)'],
  ])('%s: pantalla "Próximamente" sin lógica', async (ruta, pestana, texto) => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', ruta]);
    expect(m.textos()).toContain(texto);
    expect(m.pestana(pestana).props).toMatchObject({ accessibilityState: { selected: true } });
  });

  it('Más: "Mi perfil" deshabilitado con "Próximamente (E3-B)" y "Cerrar sesión" que cierra la sesión', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'mas-arrendador']);
    expect(m.textos()).toContain('Mi perfil');
    expect(m.textos()).toContain('Próximamente (E3-B)');
    expect(m.etiquetasTabs()).toHaveLength(5);
    // "Mi perfil" no es un botón: no abre nada.
    expect(
      m.raiz.root.findAll(
        (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Mi perfil',
      ),
    ).toHaveLength(0);

    const errores = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const cerrar = m.raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Cerrar sesión').length > 0,
    );
    await m.rt.act(async () => cerrar.props.onPress());
    await m.rt.act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });

    // El grupo (arrendador) se desmonta entero: ni barra ni pantallas del arrendador.
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos()).not.toContain('Mi perfil');
    expect(mockLlavero.size).toBe(0);
    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});

describe('guardias reales: quién entra a las rutas del arrendador', () => {
  it('un inquilino NO accede a las pestañas del arrendador', async () => {
    const m = await montar(INQUILINO(), ['(arrendador)', '(pestanas)', 'inmuebles']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos()).not.toContain('Aún no tienes inmuebles');
    expect(mockListar).not.toHaveBeenCalled();
  });

  it('un inquilino tampoco entra por la raíz del arrendador (/panel)', async () => {
    const m = await montar(INQUILINO(), ['(arrendador)', '(pestanas)', 'panel']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos()).not.toContain('Hola, Camila Ruiz');
  });

  it('sin sesión tampoco', async () => {
    const m = await montar(null, ['(arrendador)', '(pestanas)', 'inmuebles']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(mockListar).not.toHaveBeenCalled();
  });

  it('el inquilino sí ve lo suyo y no recibe la barra del arrendador', async () => {
    const m = await montar(INQUILINO(), ['(inquilino)', 'contratos']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos().join('|')).toContain('Hola, Camila Ruiz');
  });

  it('el arrendador no entra a las rutas del inquilino', async () => {
    const m = await montar(ARRENDADOR(), ['(inquilino)', 'contratos']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos().join('|')).not.toContain('Hola, Camila Ruiz');
  });
});
