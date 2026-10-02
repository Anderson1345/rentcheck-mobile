// Flujo completo "ya tengo cuenta" con el layout REAL (Stack.Protected y SesionProvider reales):
// anónimo en login-inquilino con ?codigo=…, login con respuesta simulada, y la vinculación del
// contrato en la pantalla del inquilino. El Stack se reemplaza por uno que solo monta la pantalla
// del grupo accesible, para poder ver el desmontaje del grupo (auth) al iniciar sesión.
import type { ReactElement } from 'react';
import type { ReactTestRenderer } from 'react-test-renderer';

import { crearToken } from '../pruebas/crearToken';

const mockLlavero = new Map<string, string>();
const mockVincular = jest.fn();
const mockLoginInquilino = jest.fn();
const mockAtras = jest.fn();
let mockParams: Record<string, string> = {};
// Pantallas de cada grupo, creadas dentro del registro aislado (misma copia de React).
let mockPantallas: Record<string, ReactElement> = {};

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
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    }),
}));
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: async () => ({ verificacion_correo: false, recuperacion_contrasena: false }),
  iniciarSesionInquilino: (...a: unknown[]) => mockLoginInquilino(...a),
  vincularContrato: (...a: unknown[]) => mockVincular(...a),
}));
// Mi panel pide la lista de contratos: aquí, vacía.
jest.mock('../api/inquilino', () => ({
  ...jest.requireActual('../api/inquilino'),
  listarContratosInquilino: async () => [],
}));
jest.mock('expo-router', () => {
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
    return mockPantallas[name] ?? null;
  };
  return {
    Stack,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockAtras }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: () => undefined,
  };
});

const LEJANO = 4_102_444_800;
const CONTRATO = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-09-01T00:00:00.000Z',
  fecha_fin: '2027-08-31T00:00:00.000Z',
  vinculado_en: '2026-10-01T10:00:00.000Z',
  datos_recaudo: null,
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inmueble: { id: 'm1', direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
};
const RESPUESTA_LOGIN = {
  access_token: crearToken({ inquilinoId: 'i1', exp: LEJANO }),
  inquilino: {
    id: 'i1',
    nombre: 'Camilo Pardo',
    correo: 'camilo@ejemplo.com',
    telefono: '3',
    creado_en: 'x',
  },
};

/** Monta el layout real con módulos nuevos (un controlador de sesión por prueba). */
async function montar() {
  mockLlavero.clear();
  let m!: {
    rt: typeof import('react-test-renderer');
    react: typeof import('react');
    Layout: () => ReactElement;
    rn: typeof import('react-native');
    pendiente: typeof import('../sesion/codigoPendiente');
    ErrorApi: typeof import('../api/cliente').ErrorApi;
  };
  /* eslint-disable @typescript-eslint/no-require-imports -- resetModules exige require */
  // Un registro de módulos nuevo y único (React, react-native y la app comparten copia): el
  // controlador de sesión es uno por módulo y cada prueba necesita el suyo.
  jest.resetModules();
  m = {
    rt: require('react-test-renderer'),
    react: require('react'),
    Layout: require('../../app/_layout').default,
    rn: require('react-native'),
    pendiente: require('../sesion/codigoPendiente'),
    // La clase de error de ESTE registro: la app la reconoce con instanceof.
    ErrorApi: require('../api/cliente').ErrorApi,
  };
  mockPantallas = {
    '(auth)': m.react.createElement(require('../../app/(auth)/login-inquilino').default),
    // La entrada del inquilino: Mi panel dentro del proveedor del contrato seleccionado.
    '(inquilino)': m.react.createElement(
      require('../inquilino/ContratoSeleccionado').ContratoSeleccionadoProvider,
      null,
      m.react.createElement(require('../../app/(inquilino)/(pestanas)/mi-panel').default),
    ),
  };

  /* eslint-enable @typescript-eslint/no-require-imports */
  let raiz!: ReactTestRenderer;
  await m.rt.act(async () => {
    raiz = m.rt.create(m.react.createElement(m.Layout));
  });

  const esperar = () =>
    m.rt.act(async () => {
      await new Promise<void>((resolver) => setTimeout(resolver, 10));
    });
  const textos = () =>
    raiz.root
      .findAllByType(m.rn.Text)
      .map((n) =>
        (Array.isArray(n.props.children) ? n.props.children : [n.props.children])
          .filter((c: unknown) => typeof c === 'string' || typeof c === 'number')
          .join(''),
      );
  const campo = (etiqueta: string) =>
    raiz.root.findAllByType(m.rn.TextInput).find((n) => n.props.accessibilityLabel === etiqueta)!;
  const escribir = (etiqueta: string, texto: string) =>
    m.rt.act(async () => campo(etiqueta).props.onChangeText(texto));
  const pulsar = (titulo: string) =>
    m.rt.act(async () => {
      raiz.root
        .find(
          (n) =>
            n.props.accessibilityRole === 'button' &&
            n.findAll((h) => h.props.children === titulo).length > 0,
        )
        .props.onPress();
    });
  return { m, raiz, esperar, textos, escribir, pulsar };
}

// Cargar todo el app en frío (resetModules) tarda más que el límite por defecto.
jest.setTimeout(60_000);

beforeEach(() => {
  // reset (no clear): también descarta las respuestas simuladas que una prueba dejó sin usar.
  mockVincular.mockReset();
  mockLoginInquilino.mockReset();
  mockAtras.mockReset();
  mockParams = { codigo: 'RC-AB3D-9KPX' };
});

describe('"ya tengo cuenta": del login a la vinculación, con el layout real', () => {
  it('login con ?codigo=RC-AB3D-9KPX → vincularContrato UNA vez con ese código y se ve el contrato agregado', async () => {
    mockLoginInquilino.mockResolvedValueOnce(RESPUESTA_LOGIN);
    mockVincular.mockResolvedValueOnce(CONTRATO);
    const t = await montar();

    // Anónimo: está el login con el aviso del código pendiente.
    expect(t.textos().join(' ')).toContain('RC-AB3D-9KPX');
    expect(t.m.pendiente.hayCodigoPendiente()).toBe(true);

    await t.escribir('Correo', 'camilo@ejemplo.com');
    await t.escribir('Contraseña', 'Clave2026');
    await t.pulsar('Iniciar sesión');
    await t.esperar();
    await t.esperar();

    expect(mockVincular).toHaveBeenCalledTimes(1);
    expect(mockVincular).toHaveBeenCalledWith('RC-AB3D-9KPX');
    const visibles = t.textos().join(' | ');
    expect(visibles).toContain('Contrato agregado: Apto 302 · Calle 45 # 12-30.');
    expect(visibles).not.toContain('Agregando tu contrato…');
    expect(t.m.pendiente.hayCodigoPendiente()).toBe(false);
  });

  it('un 404 al vincular muestra el mensaje y no deja la interfaz en "Agregando…"', async () => {
    mockLoginInquilino.mockResolvedValueOnce(RESPUESTA_LOGIN);
    const t = await montar();
    mockVincular.mockRejectedValueOnce(
      new t.m.ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' }),
    );
    await t.escribir('Correo', 'camilo@ejemplo.com');
    await t.escribir('Contraseña', 'Clave2026');
    await t.pulsar('Iniciar sesión');
    await t.esperar();
    await t.esperar();
    const visibles = t.textos().join(' | ');
    expect(mockVincular).toHaveBeenCalledTimes(1);
    expect(visibles).toContain('Código de acceso no válido.');
    expect(visibles).not.toContain('Agregando tu contrato…');
  });

  it('si se sale del login sin iniciar sesión (botón atrás), el código pendiente queda limpio y no se vincula', async () => {
    const t = await montar();
    expect(t.m.pendiente.hayCodigoPendiente()).toBe(true);
    // Salir de la pantalla: el Stack desmonta el login.
    await t.m.rt.act(async () => t.raiz.unmount());
    expect(t.m.pendiente.hayCodigoPendiente()).toBe(false);
    expect(mockVincular).not.toHaveBeenCalled();
  });

  it('sin parámetro `codigo` el login no deja nada pendiente y la pantalla del inquilino no vincula', async () => {
    mockParams = {};
    mockLoginInquilino.mockResolvedValueOnce(RESPUESTA_LOGIN);
    const t = await montar();
    expect(t.m.pendiente.hayCodigoPendiente()).toBe(false);
    await t.escribir('Correo', 'camilo@ejemplo.com');
    await t.escribir('Contraseña', 'Clave2026');
    await t.pulsar('Iniciar sesión');
    await t.esperar();
    expect(mockVincular).not.toHaveBeenCalled();
    expect(t.textos().join(' ')).not.toMatch(/Agregando|Contrato agregado/);
  });
});
