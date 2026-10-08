// A1 (APK de demostración): fuera de desarrollo, Diagnóstico y Galería no se pueden abrir (ni por enlace
// ni escribiendo la ruta o el esquema rentcheck://, que llevan a la misma ruta); "Más" muestra la versión
// de la app en los dos roles; y la configuración de EAS lleva la URL pública del backend.
import type { ReactElement } from 'react';
import { act } from 'react-test-renderer';

import Bienvenida from '../../app/(auth)/index';
import Diagnostico from '../../app/(auth)/diagnostico';
import Galeria from '../../app/(auth)/galeria';
import MasArrendador from '../../app/(arrendador)/(pestanas)/mas-arrendador';
import MasInquilino from '../../app/(inquilino)/(pestanas)/mas';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import { renderizarPantalla, textosDe } from '../pruebas/pantallas';

const mockGet = jest.fn();

jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: () => undefined,
    Redirect: ({ href }: { href: string }) => (
      <View testID="redireccion" accessibilityHint={href} />
    ),
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
// Una versión que no es la de app.json: así se ve que sale de expo-constants (expoConfig.version).
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '7.8.9' } },
}));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: { get: (...a: unknown[]) => mockGet(...a) },
}));
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: async () => ({ verificacion_correo: false, recuperacion_contrasena: false }),
}));
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const entorno = globalThis as unknown as { __DEV__: boolean };
const DEV_ORIGINAL = entorno.__DEV__;

const redireccionDe = (raiz: Raiz) =>
  raiz.root
    .findAll((n) => typeof n.type === 'string' && n.props.testID === 'redireccion')
    .map((n) => n.props.accessibilityHint as string);

const montar = async (pantalla: ReactElement) => (await renderizarPantalla(pantalla)).raiz;

beforeEach(() => {
  mockGet.mockReset();
  // El Diagnóstico queda "conectando" (la petición no termina) para no salir a la red.
  mockGet.mockImplementation(() => new Promise(() => undefined));
});
afterEach(() => {
  entorno.__DEV__ = DEV_ORIGINAL;
});

describe('Diagnóstico y Galería fuera de desarrollo (A1)', () => {
  describe('build que no es de desarrollo (__DEV__ = false)', () => {
    beforeEach(() => {
      entorno.__DEV__ = false;
    });

    it('la bienvenida no muestra los enlaces', async () => {
      const raiz = await montar(<Bienvenida />);
      const textos = textosDe(raiz);
      expect(textos).toContain('¿Cómo vas a usar RentCheck?');
      expect(textos).not.toContain('Diagnóstico');
      expect(textos).not.toContain('Galería');
    });

    it('la ruta /diagnostico (o rentcheck://diagnostico) lleva a la entrada y no consulta el servidor', async () => {
      const raiz = await montar(<Diagnostico />);
      expect(redireccionDe(raiz)).toEqual(['/']);
      expect(textosDe(raiz)).not.toContain('Conectando con el servidor…');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('la ruta /galeria (o rentcheck://galeria) lleva a la entrada', async () => {
      const raiz = await montar(<Galeria />);
      expect(redireccionDe(raiz)).toEqual(['/']);
      expect(textosDe(raiz)).not.toContain('Sistema visual Medianoche');
    });
  });

  describe('en desarrollo (__DEV__ = true) siguen disponibles', () => {
    beforeEach(() => {
      entorno.__DEV__ = true;
    });

    it('Diagnóstico abre y consulta el servidor', async () => {
      const raiz = await montar(<Diagnostico />);
      expect(redireccionDe(raiz)).toEqual([]);
      expect(textosDe(raiz)).toContain('Conectando con el servidor…');
    });

    it('Galería abre', async () => {
      const raiz = await montar(<Galeria />);
      expect(redireccionDe(raiz)).toEqual([]);
      expect(textosDe(raiz)).toContain('Sistema visual Medianoche');
    });
  });
});

describe('Versión visible en "Más" (A1)', () => {
  const sesion = (rol: 'arrendador' | 'inquilino') => ({
    token: crearToken({ id: 'u1', exp: 4_102_444_800 }),
    rol,
    usuario: { id: 'u1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
  });

  const ultimoTexto = (raiz: Raiz) => {
    const textos = textosDe(raiz);
    return textos[textos.length - 1];
  };

  it('arrendador: "RentCheck · versión X.Y.Z" al final, tomada de expo-constants', async () => {
    const { raiz } = await renderizarPantalla(<MasArrendador />, sesion('arrendador'));
    expect(textosDe(raiz)).toContain('RentCheck · versión 7.8.9');
    expect(ultimoTexto(raiz)).toBe('RentCheck · versión 7.8.9');
  });

  it('inquilino: "RentCheck · versión X.Y.Z" al final, tomada de expo-constants', async () => {
    const { raiz } = await renderizarPantalla(
      <ContratoSeleccionadoProvider>
        <MasInquilino />
      </ContratoSeleccionadoProvider>,
      sesion('inquilino'),
    );
    await act(async () => undefined);
    expect(textosDe(raiz)).toContain('RentCheck · versión 7.8.9');
    expect(ultimoTexto(raiz)).toBe('RentCheck · versión 7.8.9');
  });
});

describe('Configuración del APK (A1)', () => {
  const eas = require('../../eas.json');
  const app = require('../../app.json');
  const URL_BACKEND = 'https://rentcheck-backend-9zb6.onrender.com';

  it('preview y production llevan la URL pública del backend; development no se toca', () => {
    expect(eas.build.preview.env).toEqual({ EXPO_PUBLIC_API_URL: URL_BACKEND, APP_ENV: 'preview' });
    expect(eas.build.production.env).toEqual({
      EXPO_PUBLIC_API_URL: URL_BACKEND,
      APP_ENV: 'production',
    });
    expect(eas.build.development.env).toBeUndefined();
    expect(eas.build.preview.android.buildType).toBe('apk');
  });

  it('app.json: versión 1.0.0 y package, scheme y slug sin cambios', () => {
    expect(app.expo.version).toBe('1.0.0');
    expect(app.expo.android.package).toBe('com.rentcheck.app');
    expect(app.expo.scheme).toBe('rentcheck');
    expect(app.expo.slug).toBe('rentcheck');
  });

  it('bloquea los permisos que la app no usa (micrófono, ubicación, contactos)', () => {
    const bloqueados: string[] = app.expo.android.blockedPermissions ?? [];
    expect(bloqueados).toEqual(
      expect.arrayContaining([
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.READ_CONTACTS',
      ]),
    );
  });
});
