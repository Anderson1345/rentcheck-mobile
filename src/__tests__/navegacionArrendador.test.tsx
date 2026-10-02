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
const mockObtener = jest.fn();
const mockPerfil = jest.fn();
const mockPush = jest.fn();
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
  obtenerInmueble: (...a: unknown[]) => mockObtener(...a),
}));
jest.mock('../api/contratos', () => ({
  ...jest.requireActual('../api/contratos'),
  listarContratos: async () => [],
  listarInquilinos: async () => [],
  obtenerContrato: async () => ({
    id: 'c1',
    estado: 'ACTIVO',
    fecha_inicio: '2026-10-01T00:00:00.000Z',
    fecha_fin: '2027-09-30T00:00:00.000Z',
    canon_centavos: 1,
    tipo_plantilla: 'LOCAL_COMERCIAL',
    vinculado: false,
    inquilino: { id: 'q', nombre: 'Camilo Pardo' },
    unidad: { id: 'u', nombre: 'Local 1', tipo: 'LOCAL' },
    codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2026-10-31T15:00:00.000Z' },
  }),
}));
jest.mock('../api/inquilino', () => ({
  ...jest.requireActual('../api/inquilino'),
  listarContratosInquilino: async () => [],
}));
jest.mock('../api/perfil', () => ({
  ...jest.requireActual('../api/perfil'),
  obtenerPerfil: (...a: unknown[]) => mockPerfil(...a),
}));
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const Nivel = React.createContext(0);

  /** Monta la ruta que toca en este nivel: primero su layout (si lo hay) y, dentro, el siguiente. */
  function Salida({ hasta }: { hasta?: number }) {
    const nivel = React.useContext(Nivel);
    const fin = hasta ?? nivel + 1;
    const Componente = mockArbol[mockRuta.slice(0, fin).join('/')];
    if (!Componente) return null;
    return (
      <Nivel.Provider value={fin}>
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
    // Un nombre como "inmueble/[id]/unidad/nueva" abarca varios segmentos de la ruta.
    if (name === mockRuta[nivel]) return <Salida />;
    return name === mockRuta.slice(nivel).join('/') ? <Salida hasta={mockRuta.length} /> : null;
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
    useRouter: () => ({
      push: (...a: unknown[]) => mockPush(...a),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
    }),
    useLocalSearchParams: () => ({ id: 'i1', unidadId: 'u1' }),
    useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
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
    '(arrendador)/perfil': require('../../app/(arrendador)/perfil').default,
    '(arrendador)/contrato/nuevo': require('../../app/(arrendador)/contrato/nuevo').default,
    '(arrendador)/contrato/[id]/creado': require('../../app/(arrendador)/contrato/[id]/creado')
      .default,
    '(arrendador)/inmueble/[id]/unidad/nueva':
      require('../../app/(arrendador)/inmueble/[id]/unidad/nueva').default,
    '(arrendador)/inmueble/[id]/unidad/[unidadId]':
      require('../../app/(arrendador)/inmueble/[id]/unidad/[unidadId]').default,
    '(inquilino)': require('../../app/(inquilino)/_layout').default,
    '(inquilino)/(pestanas)': require('../../app/(inquilino)/(pestanas)/_layout').default,
    '(inquilino)/(pestanas)/mi-panel': require('../../app/(inquilino)/(pestanas)/mi-panel').default,
    '(inquilino)/(pestanas)/pagos': require('../../app/(inquilino)/(pestanas)/pagos').default,
    '(inquilino)/(pestanas)/solicitudes': require('../../app/(inquilino)/(pestanas)/solicitudes')
      .default,
    '(inquilino)/(pestanas)/mas': require('../../app/(inquilino)/(pestanas)/mas').default,
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
  mockObtener.mockReset().mockResolvedValue({
    id: 'i1',
    arrendador_id: 'a1',
    direccion: 'Calle 45 # 12-30',
    ciudad: 'Bogotá',
    estrato: 4,
    matricula_inmobiliaria: 'M-1',
    foto_portada_url: null,
    creado_en: 'x',
    unidades: [
      {
        id: 'u1',
        inmueble_id: 'i1',
        nombre: 'Apto 302',
        tipo: 'APARTAMENTO',
        metros_cuadrados: '50',
        numero_habitaciones: 1,
        numero_banos: 1,
        canon_base_centavos: 100,
        ocupantes_maximos: 2,
        acepta_mascotas: false,
        uso_permitido: 'RESIDENCIAL',
        foto_principal_url: null,
        creado_en: 'x',
      },
    ],
  });
  mockPerfil.mockReset().mockResolvedValue({
    id: 'a1',
    nombre: 'Camila Ruiz',
    correo: 'c@x.co',
    telefono: '300',
    cedula: '1020304050',
    foto_cedula_nit_url: null,
    creado_en: 'x',
  });
  mockPush.mockReset();
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

  it.each([['pagos-arrendador', 'Pagos', 'Próximamente (E7)']])(
    '%s: pantalla "Próximamente" sin lógica',
    async (ruta, pestana, texto) => {
      const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', ruta]);
      expect(m.textos()).toContain(texto);
      expect(m.pestana(pestana).props).toMatchObject({ accessibilityState: { selected: true } });
    },
  );

  it('Contratos ya no es "Próximamente": lista (vacía aquí), botón "Nuevo contrato" y pestaña activa', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'contratos-arrendador']);
    expect(m.textos()).toContain('Aún no tienes contratos');
    expect(m.textos().join('|')).not.toContain('Próximamente');
    expect(m.pestana('Contratos').props).toMatchObject({ accessibilityState: { selected: true } });
    const boton = m.raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Nuevo contrato').length > 0,
    );
    await m.rt.act(async () => boton.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/contrato/nuevo');
  });

  it('Más: "Mi perfil" abre el perfil y "Cerrar sesión" cierra la sesión', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', '(pestanas)', 'mas-arrendador']);
    expect(m.textos()).toContain('Mi perfil');
    expect(m.textos()).not.toContain('Próximamente (E3-B)');
    expect(m.etiquetasTabs()).toHaveLength(5);
    // "Mi perfil" ya es una fila activa que abre /perfil.
    const fila = m.raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Mi perfil').length > 0,
    );
    await m.rt.act(async () => fila.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/perfil');

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

  it('el inquilino sí ve lo suyo, con su barra y no la del arrendador', async () => {
    const m = await montar(INQUILINO(), ['(inquilino)', '(pestanas)', 'mi-panel']);
    expect(m.etiquetasTabs()).toEqual(['Mi panel', 'Pagos', 'Solicitudes', 'Más']);
    expect(m.etiquetasTabs()).not.toContain('Inmuebles');
  });

  it('el arrendador no entra a las rutas del inquilino', async () => {
    const m = await montar(ARRENDADOR(), ['(inquilino)', '(pestanas)', 'mi-panel']);
    expect(m.etiquetasTabs()).toEqual([]);
    expect(m.textos()).not.toContain('Aún no tienes contratos');
  });
});

describe('barra inferior del inquilino (layouts reales)', () => {
  it('4 pestañas con "Mi panel" activa; las rutas son las claves de PESTANAS_INQUILINO', async () => {
    const m = await montar(INQUILINO(), ['(inquilino)', '(pestanas)', 'mi-panel']);
    const { PESTANAS_INQUILINO } = jest.requireActual<
      typeof import('../componentes/navegacion/configuracion')
    >('../componentes/navegacion/configuracion');

    expect(m.etiquetasTabs()).toEqual(['Mi panel', 'Pagos', 'Solicitudes', 'Más']);
    expect(m.pestana('Mi panel').props).toMatchObject({ accessibilityState: { selected: true } });
    expect(mockNombresTabs).toEqual(PESTANAS_INQUILINO.map((p) => p.clave));

    await m.rt.act(async () => m.pestana('Pagos').props.onPress());
    expect(mockNavegar).toHaveBeenCalledWith('pagos');
    await m.rt.act(async () => m.pestana('Más').props.onPress());
    expect(mockNavegar).toHaveBeenLastCalledWith('mas');
  });

  it.each([
    ['pagos', 'Pagos', 'Próximamente (E7)'],
    ['solicitudes', 'Solicitudes', 'Próximamente (E8)'],
  ])('%s: pantalla "Próximamente" y pestaña activa', async (ruta, pestana, texto) => {
    const m = await montar(INQUILINO(), ['(inquilino)', '(pestanas)', ruta]);
    expect(m.textos()).toContain(texto);
    expect(m.pestana(pestana).props).toMatchObject({ accessibilityState: { selected: true } });
  });

  it('Más: solo "Cerrar sesión"; al cerrar se desmonta todo el grupo (inquilino)', async () => {
    const m = await montar(INQUILINO(), ['(inquilino)', '(pestanas)', 'mas']);
    expect(m.etiquetasTabs()).toHaveLength(4);
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
    expect(m.etiquetasTabs()).toEqual([]);
    expect(mockLlavero.size).toBe(0);
    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});

describe('rutas de la pila del arrendador (perfil y unidades) con los layouts reales', () => {
  it('perfil: el arrendador lo ve, fuera de la barra de pestañas', async () => {
    const m = await montar(ARRENDADOR(), ['(arrendador)', 'perfil']);
    expect(m.textos()).toContain('No se puede cambiar.');
    expect(m.etiquetasTabs()).toEqual([]);
  });

  it('nueva unidad y editar unidad cargan sus pantallas', async () => {
    const nueva = await montar(ARRENDADOR(), [
      '(arrendador)',
      'inmueble',
      '[id]',
      'unidad',
      'nueva',
    ]);
    expect(nueva.textos()).toContain('Podrás agregar la foto después de crearla.');
    const editar = await montar(ARRENDADOR(), [
      '(arrendador)',
      'inmueble',
      '[id]',
      'unidad',
      '[unidadId]',
    ]);
    expect(editar.textos()).toContain('Eliminar unidad');
  });

  it('un inquilino NO accede al perfil ni a las unidades del arrendador', async () => {
    const perfil = await montar(INQUILINO(), ['(arrendador)', 'perfil']);
    expect(perfil.textos()).not.toContain('No se puede cambiar.');
    expect(mockPerfil).not.toHaveBeenCalled();
    const unidad = await montar(INQUILINO(), [
      '(arrendador)',
      'inmueble',
      '[id]',
      'unidad',
      'nueva',
    ]);
    expect(unidad.textos()).not.toContain('Podrás agregar la foto después de crearla.');
    expect(mockObtener).not.toHaveBeenCalled();
  });
});

describe('asistente de contrato con los layouts reales', () => {
  it('el arrendador llega al asistente (con cédula en su perfil) y a la pantalla de éxito', async () => {
    const asistente = await montar(ARRENDADOR(), ['(arrendador)', 'contrato', 'nuevo']);
    await asistente.rt.act(async () => {
      await new Promise<void>((r) => setTimeout(r, 20));
    });
    expect(asistente.textos()).toContain('Paso 1 de 6 · Unidad');
    expect(asistente.etiquetasTabs()).toEqual([]);

    const creado = await montar(ARRENDADOR(), ['(arrendador)', 'contrato', '[id]', 'creado']);
    await creado.rt.act(async () => {
      await new Promise<void>((r) => setTimeout(r, 20));
    });
    expect(creado.textos()).toContain('Contrato creado');
    expect(creado.textos()).toContain('RC-AB3D-9KPX');
  });

  it('un inquilino NO accede al asistente ni a "Contrato creado"', async () => {
    const a = await montar(INQUILINO(), ['(arrendador)', 'contrato', 'nuevo']);
    expect(a.textos().join('|')).not.toContain('Paso 1 de 6');
    const b = await montar(INQUILINO(), ['(arrendador)', 'contrato', '[id]', 'creado']);
    expect(b.textos()).not.toContain('Contrato creado');
    expect(mockPerfil).not.toHaveBeenCalled();
  });
});
