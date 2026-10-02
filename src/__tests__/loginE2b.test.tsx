// Cambios de E2-B en los logins: enlace de "olvidé mi contraseña" según las capacidades del
// servidor, correo sin verificar (403), código pendiente de activación y vinculación al iniciar
// sesión; y la pantalla "no disponible".
import { act } from 'react-test-renderer';

import NoEncontrada from '../../app/+not-found';
import MiPanel from '../../app/(inquilino)/(pestanas)/mi-panel';
import LoginArrendador from '../../app/(auth)/login-arrendador';
import LoginInquilino from '../../app/(auth)/login-inquilino';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  pulsar,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';
import {
  consumirCodigoPendiente,
  guardarCodigoPendiente,
  hayCodigoPendiente,
  limpiarCodigoPendiente,
} from '../sesion/codigoPendiente';
import type { DatosSesion } from '../sesion/tipos';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));
// Mi panel pide la lista de contratos: aquí, vacía.
jest.mock('../api/inquilino', () => ({
  ...jest.requireActual('../api/inquilino'),
  listarContratosInquilino: async () => [],
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
const mockCapacidades = jest.fn();
const mockLoginArrendador = jest.fn();
const mockLoginInquilino = jest.fn();
const mockVincular = jest.fn();
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: () => mockCapacidades(),
  iniciarSesionArrendador: (...a: unknown[]) => mockLoginArrendador(...a),
  iniciarSesionInquilino: (...a: unknown[]) => mockLoginInquilino(...a),
  vincularContrato: (...a: unknown[]) => mockVincular(...a),
}));

const ENLACE = '¿Olvidaste tu contraseña?';
const hayEnlace = (raiz: Parameters<typeof textosDe>[0], texto: string) =>
  raiz.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'link' &&
      n.findAll((h) => h.props.children === texto).length > 0,
  ).length > 0;
const enlace = (raiz: Parameters<typeof textosDe>[0], texto: string) =>
  raiz.root.find(
    (n) =>
      n.props.accessibilityRole === 'link' &&
      n.findAll((h) => h.props.children === texto).length > 0,
  );

const error = (status: number, codigo: string) =>
  new ErrorApi({ status, codigo, mensaje: 'técnico' });
const sesionInquilino: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};
const sesionArrendador: DatosSesion = {
  token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
};
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

let consola: jest.SpyInstance[];
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  limpiarCodigoPendiente();
  mockCapacidades.mockResolvedValue({ verificacion_correo: false, recuperacion_contrasena: false });
  consola = (['log', 'warn', 'error', 'info', 'debug'] as const).map((m) =>
    jest.spyOn(console, m).mockImplementation(() => undefined),
  );
});
afterEach(() => {
  for (const espia of consola) expect(espia).not.toHaveBeenCalled();
  consola.forEach((e) => e.mockRestore());
});

describe('enlace "¿Olvidaste tu contraseña?" según las capacidades', () => {
  it.each([
    ['arrendador', () => <LoginArrendador />],
    ['inquilino', () => <LoginInquilino />],
  ])('login del %s: oculto con recuperacion_contrasena=false', async (_rol, pantalla) => {
    const { raiz } = await renderizarPantalla(pantalla());
    expect(hayEnlace(raiz, ENLACE)).toBe(false);
  });

  it.each([
    ['arrendador', () => <LoginArrendador />],
    ['inquilino', () => <LoginInquilino />],
  ])(
    'login del %s: visible con recuperacion_contrasena=true y lleva a recuperar-contrasena con su rol',
    async (rol, pantalla) => {
      mockCapacidades.mockResolvedValue({
        verificacion_correo: true,
        recuperacion_contrasena: true,
      });
      const { raiz } = await renderizarPantalla(pantalla());
      expect(hayEnlace(raiz, ENLACE)).toBe(true);
      await act(async () => enlace(raiz, ENLACE).props.onPress());
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/recuperar-contrasena',
        params: { rol },
      });
    },
  );

  it('si ya se escribió el correo, se lleva a la pantalla de recuperación', async () => {
    mockCapacidades.mockResolvedValue({ verificacion_correo: true, recuperacion_contrasena: true });
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    await escribirEn(raiz, 'Correo', ' Camilo@Ejemplo.com ');
    await act(async () => enlace(raiz, ENLACE).props.onPress());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recuperar-contrasena',
      params: { rol: 'inquilino', correo: 'camilo@ejemplo.com' },
    });
  });

  it('solo una de las dos funciones activa: el enlace sigue la de recuperación', async () => {
    mockCapacidades.mockResolvedValue({
      verificacion_correo: true,
      recuperacion_contrasena: false,
    });
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    expect(hayEnlace(raiz, ENLACE)).toBe(false);
  });

  it('si GET /auth/capacidades falla, el enlace queda oculto y el login sigue funcionando', async () => {
    mockCapacidades.mockRejectedValue(new ErrorSinConexion());
    mockLoginArrendador.mockResolvedValueOnce({
      access_token: sesionArrendador.token,
      arrendador: {
        id: 'a1',
        nombre: 'Marta Ríos',
        correo: 'marta@ejemplo.com',
        telefono: '3',
        foto_cedula_nit_url: null,
        creado_en: 'x',
      },
    });
    const { raiz, controlador } = await renderizarPantalla(<LoginArrendador />);
    expect(hayEnlace(raiz, ENLACE)).toBe(false);
    await escribirEn(raiz, 'Correo', 'marta@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'Clave2026');
    await pulsar(raiz, 'Iniciar sesión');
    expect(controlador.obtener().estado).toBe('arrendador');
  });

  it('con GET /auth/capacidades colgado (Render dormido) el formulario ya se puede usar', async () => {
    mockCapacidades.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    expect(botonDe(raiz, 'Iniciar sesión').props.disabled).toBe(false);
  });
});

describe('login: correo precargado y correo sin verificar', () => {
  it('prellena el correo que llega por parámetro (tras verificar o restablecer)', async () => {
    mockParams = { correo: 'camilo@ejemplo.com' };
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    expect(campoDe(raiz, 'Correo')?.props.value).toBe('camilo@ejemplo.com');
  });

  it('403 CORREO_NO_VERIFICADO: mensaje y botón "Verificar mi correo" que abre la verificación con reenvío', async () => {
    mockLoginInquilino.mockRejectedValueOnce(error(403, 'CORREO_NO_VERIFICADO'));
    const { raiz, controlador } = await renderizarPantalla(<LoginInquilino />);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'Clave2026');
    await pulsar(raiz, 'Iniciar sesión');
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(textosDe(raiz).join(' ')).toMatch(/verificar tu correo/);
    await pulsar(raiz, 'Verificar mi correo');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/verifica-correo',
      params: { correo: 'camilo@ejemplo.com', rol: 'inquilino', reenviar: '1' },
    });
  });

  it('el login del arrendador manda rol arrendador', async () => {
    mockLoginArrendador.mockRejectedValueOnce(error(403, 'CORREO_NO_VERIFICADO'));
    const { raiz } = await renderizarPantalla(<LoginArrendador />);
    await escribirEn(raiz, 'Correo', 'marta@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'Clave2026');
    await pulsar(raiz, 'Iniciar sesión');
    await pulsar(raiz, 'Verificar mi correo');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/verifica-correo',
      params: { correo: 'marta@ejemplo.com', rol: 'arrendador', reenviar: '1' },
    });
  });

  it('otros errores no muestran el botón de verificar', async () => {
    mockLoginInquilino.mockRejectedValueOnce(error(401, 'NO_AUTENTICADO'));
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'Clave2026');
    await pulsar(raiz, 'Iniciar sesión');
    expect(hayBoton(raiz, 'Verificar mi correo')).toBe(false);
  });
});

describe('login del inquilino: activación y código pendiente', () => {
  it('trae el botón "Tengo un código de activación" y la nota', async () => {
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    expect(textosDe(raiz).join(' ')).toContain('Tu arrendador te dará un código de activación');
    await pulsar(raiz, 'Tengo un código de activación');
    expect(mockPush).toHaveBeenCalledWith('/activar');
  });

  it('con el parámetro `codigo` guarda el código pendiente en memoria y avisa que se agregará', async () => {
    mockParams = { codigo: 'RC-AB3D-9KPX' };
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    expect(hayCodigoPendiente()).toBe(true);
    expect(textosDe(raiz).join(' ')).toContain('RC-AB3D-9KPX');
  });

  it('un parámetro `codigo` mal formado se ignora', async () => {
    mockParams = { codigo: 'basura' };
    await renderizarPantalla(<LoginInquilino />);
    expect(hayCodigoPendiente()).toBe(false);
  });

  it('si se sale del login sin iniciar sesión, el código pendiente se borra', async () => {
    mockParams = { codigo: 'RC-AB3D-9KPX' };
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    act(() => raiz.unmount());
    expect(hayCodigoPendiente()).toBe(false);
  });

  it('si se sale porque la sesión se inició, el código pendiente se conserva para vincularlo', async () => {
    mockParams = { codigo: 'RC-AB3D-9KPX' };
    mockLoginInquilino.mockResolvedValueOnce({
      access_token: sesionInquilino.token,
      inquilino: {
        id: 'i1',
        nombre: 'Camilo Pardo',
        correo: 'camilo@ejemplo.com',
        telefono: '3',
        creado_en: 'x',
      },
    });
    const { raiz } = await renderizarPantalla(<LoginInquilino />);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'Clave2026');
    await pulsar(raiz, 'Iniciar sesión');
    act(() => raiz.unmount());
    expect(hayCodigoPendiente()).toBe(true);
  });
});

// La entrada del inquilino es Mi panel; la vinculación pendiente se muestra en ella.
const ContratosInquilino = () => (
  <ContratoSeleccionadoProvider>
    <MiPanel />
  </ContratoSeleccionadoProvider>
);

describe('vinculación tras iniciar sesión (Mi panel del inquilino)', () => {
  it('con código pendiente llama a vincular UNA vez y muestra la unidad y la dirección', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockResolvedValueOnce(CONTRATO);
    const { raiz } = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(mockVincular).toHaveBeenCalledTimes(1);
    expect(mockVincular).toHaveBeenCalledWith('RC-AB3D-9KPX');
    expect(textosDe(raiz).join(' ')).toContain('Apto 302');
    expect(textosDe(raiz).join(' ')).toContain('Calle 45 # 12-30');
    expect(consumirCodigoPendiente()).toBeNull();
  });

  it('mientras vincula muestra que está agregando el contrato', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockReturnValueOnce(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(textosDe(raiz).join(' ')).toMatch(/Agregando tu contrato/);
  });

  it('404: el mensaje genérico de código no válido; el código ya no queda', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockRejectedValueOnce(error(404, 'NO_ENCONTRADO'));
    const { raiz } = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(textosDe(raiz).join(' ')).toContain('Código de acceso no válido.');
    expect(hayCodigoPendiente()).toBe(false);
  });

  it('429 muestra el mensaje de espera y no reintenta solo', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockRejectedValueOnce(error(429, 'DEMASIADOS_INTENTOS'));
    const { raiz } = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(textosDe(raiz).join(' ')).toContain('Espera 15 minutos');
    expect(mockVincular).toHaveBeenCalledTimes(1);
  });

  it('sin código pendiente no llama a vincular ni muestra nada extra', async () => {
    const { raiz } = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(mockVincular).not.toHaveBeenCalled();
    expect(textosDe(raiz).join(' ')).not.toMatch(/Agregando|Contrato agregado/);
  });

  it('volver a abrir la pantalla no vuelve a vincular (el código se consumió)', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockResolvedValue(CONTRATO);
    const primera = await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    act(() => primera.raiz.unmount());
    await renderizarPantalla(<ContratosInquilino />, sesionInquilino);
    expect(mockVincular).toHaveBeenCalledTimes(1);
  });
});

describe('+not-found: "Esta pantalla no está disponible"', () => {
  it('muestra el mensaje y "Ir al inicio" lleva a la bienvenida sin sesión', async () => {
    const { raiz } = await renderizarPantalla(<NoEncontrada />);
    expect(textosDe(raiz)).toContain('Esta pantalla no está disponible');
    await pulsar(raiz, 'Ir al inicio');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('con sesión de inquilino (el caso del enlace de activación) lleva a su pantalla', async () => {
    const { raiz } = await renderizarPantalla(<NoEncontrada />, sesionInquilino);
    await pulsar(raiz, 'Ir al inicio');
    expect(mockReplace).toHaveBeenCalledWith('/mi-panel');
  });

  it('con sesión de arrendador lleva a su panel', async () => {
    const { raiz } = await renderizarPantalla(<NoEncontrada />, sesionArrendador);
    await pulsar(raiz, 'Ir al inicio');
    expect(mockReplace).toHaveBeenCalledWith('/panel');
  });
});
