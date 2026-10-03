// R1-B: bienvenida sin enlaces de desarrollo fuera de __DEV__, selector de rol del login (replace, sin
// apilar) y comprobaciones propias de las pantallas de acceso rediseñadas.
import { act } from 'react-test-renderer';

import Bienvenida from '../../app/(auth)/index';
import LoginArrendador from '../../app/(auth)/login-arrendador';
import LoginInquilino from '../../app/(auth)/login-inquilino';
import RegistroArrendador from '../../app/(auth)/registro-arrendador';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({}),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: async () => ({ verificacion_correo: false, recuperacion_contrasena: true }),
}));

type Raiz = Parameters<typeof textosDe>[0];
const entorno = globalThis as unknown as { __DEV__: boolean };
const enDesarrollo = entorno.__DEV__;
afterEach(() => {
  entorno.__DEV__ = enDesarrollo;
  jest.clearAllMocks();
});

const hayTexto = (raiz: Raiz, texto: string) => textosDe(raiz).includes(texto);
const pestana = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find(
    (n) => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === etiqueta,
  );
const enlace = (raiz: Raiz, texto: string) =>
  raiz.root.find(
    (n) =>
      n.props.accessibilityRole === 'link' &&
      n.findAll((h) => h.props.children === texto).length > 0,
  );

describe('bienvenida', () => {
  it('con __DEV__ ofrece "Diagnóstico" y "Galería"', async () => {
    entorno.__DEV__ = true;
    const { raiz } = await renderizarPantalla(<Bienvenida />);
    expect(hayTexto(raiz, 'Diagnóstico')).toBe(true);
    expect(hayTexto(raiz, 'Galería')).toBe(true);
  });

  it('fuera de __DEV__ no hay enlaces de desarrollo', async () => {
    entorno.__DEV__ = false;
    const { raiz } = await renderizarPantalla(<Bienvenida />);
    expect(hayTexto(raiz, 'Diagnóstico')).toBe(false);
    expect(hayTexto(raiz, 'Galería')).toBe(false);
    expect(raiz.root.findAll((n) => n.props.accessibilityRole === 'link')).toHaveLength(0);
  });

  it('pregunta "¿Cómo vas a usar RentCheck?" y lleva a cada login con los dos botones de rol', async () => {
    const { raiz } = await renderizarPantalla(<Bienvenida />);
    expect(hayTexto(raiz, '¿Cómo vas a usar RentCheck?')).toBe(true);
    expect(hayTexto(raiz, 'Tus arriendos, claros y al día.')).toBe(true);
    await act(async () => botonDe(raiz, 'Soy arrendador').props.onPress());
    expect(mockPush).toHaveBeenLastCalledWith('/login-arrendador');
    await act(async () => botonDe(raiz, 'Soy inquilino').props.onPress());
    expect(mockPush).toHaveBeenLastCalledWith('/login-inquilino');
  });
});

describe('selector de rol del login', () => {
  it('en el login del arrendador marca "Soy arrendador" y pasar a inquilino usa replace (no apila)', async () => {
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    expect(pestana(raiz, 'Soy arrendador').props.accessibilityState.selected).toBe(true);
    expect(pestana(raiz, 'Soy inquilino').props.accessibilityState.selected).toBe(false);
    act(() => pestana(raiz, 'Soy inquilino').props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/login-inquilino');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('en el login del inquilino marca "Soy inquilino" y volver a arrendador usa replace', async () => {
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    expect(pestana(raiz, 'Soy inquilino').props.accessibilityState.selected).toBe(true);
    act(() => pestana(raiz, 'Soy arrendador').props.onPress());
    expect(mockReplace).toHaveBeenCalledWith('/login-arrendador');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('tocar el rol que ya está activo no navega', async () => {
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    act(() => pestana(raiz, 'Soy arrendador').props.onPress());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('registro del arrendador', () => {
  it('"Crear cuenta" va en la barra de acción fija, no dentro del contenido que se desplaza', async () => {
    const { raiz } = await renderizarPantalla(<RegistroArrendador />);
    const barra = raiz.root.findByProps({ testID: 'accion-fija' });
    expect(barra.findAll((n) => n.props.children === 'Crear cuenta').length).toBeGreaterThan(0);
    const desplazable = raiz.root.findAll(
      (n) => n.props.keyboardShouldPersistTaps === 'handled',
    )[0];
    expect(desplazable.findAll((n) => n.props.children === 'Crear cuenta')).toHaveLength(0);
    expect(textosDe(raiz)).toEqual(expect.arrayContaining(['Crea tu cuenta', 'Para arrendadores']));
  });
});

describe('login rediseñado', () => {
  it('arrendador: frase, "¿La olvidaste?", botón principal y "¿No tienes cuenta? Crear cuenta"', async () => {
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    expect(hayTexto(raiz, 'Tus arriendos, claros y al día.')).toBe(true);
    expect(hayTexto(raiz, '¿La olvidaste?')).toBe(true);
    expect(hayBoton(raiz, 'Iniciar sesión')).toBe(true);
    expect(textosDe(raiz).join(' ')).toContain('¿No tienes cuenta?');
    act(() => enlace(raiz, 'Crear cuenta').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/registro-arrendador');
  });

  it('inquilino: "¿Aún no tienes cuenta? Tengo un código de activación" lleva a /activar', async () => {
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    expect(textosDe(raiz).join(' ')).toContain('¿Aún no tienes cuenta?');
    act(() => enlace(raiz, 'Tengo un código de activación').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/activar');
  });

  it('G1 queda reservado: no hay botón de Google ni separador visible todavía', async () => {
    for (const pantalla of [<LoginArrendador key="a" />, <LoginInquilino key="i" />]) {
      const { raiz } = await renderizarPantalla(pantalla);
      const todo = textosDe(raiz).join(' ');
      expect(todo).not.toMatch(/Google/i);
      expect(todo).not.toContain('o con tu correo');
    }
  });
});
