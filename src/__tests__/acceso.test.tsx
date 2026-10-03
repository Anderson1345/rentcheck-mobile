// Pantallas de acceso: autofill y teclados, bloqueo del botón mientras envía, mensajes de error en
// español, caso "requiere verificación" y aviso de sesión vencida.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import LoginArrendador from '../../app/(auth)/login-arrendador';
import LoginInquilino from '../../app/(auth)/login-inquilino';
import RegistroArrendador from '../../app/(auth)/registro-arrendador';
import Bienvenida from '../../app/(auth)/index';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SESION_VENCIDA, MENSAJE_SIN_CONEXION } from '../api/errores';
import { crearToken } from '../pruebas/crearToken';
import { crearControladorSesion } from '../sesion/controlador';
import { SesionProvider } from '../sesion/SesionProvider';
import type { DatosSesion } from '../sesion/tipos';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace }),
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
const mockIniciarArrendador = jest.fn();
const mockIniciarInquilino = jest.fn();
const mockRegistrar = jest.fn();
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: async () => ({ verificacion_correo: false, recuperacion_contrasena: false }),
  iniciarSesionArrendador: (...args: unknown[]) => mockIniciarArrendador(...args),
  iniciarSesionInquilino: (...args: unknown[]) => mockIniciarInquilino(...args),
  registrarArrendador: (...args: unknown[]) => mockRegistrar(...args),
}));

const EXP_LEJANO = 4_102_444_800;
const respuestaArrendador = () => ({
  access_token: crearToken({ id: 'a1', exp: EXP_LEJANO }),
  arrendador: {
    id: 'a1',
    nombre: 'Marta Ríos',
    correo: 'marta@ejemplo.com',
    telefono: '3001234567',
    foto_cedula_nit_url: null,
    creado_en: '2026-09-01T00:00:00.000Z',
  },
});

async function renderizar(
  pantalla: ReactElement,
  guardado: DatosSesion | null = null,
): Promise<{ raiz: ReactTestRenderer; controlador: ReturnType<typeof crearControladorSesion> }> {
  const controlador = crearControladorSesion({
    almacen: {
      guardar: async () => undefined,
      leer: async () => guardado,
      borrar: async () => undefined,
    },
    limpiarCache: () => undefined,
  });
  await controlador.arrancar();
  const cliente = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = create(
      <QueryClientProvider client={cliente}>
        <SesionProvider controlador={controlador}>{pantalla}</SesionProvider>
      </QueryClientProvider>,
    );
  });
  return { raiz, controlador };
}

const campo = (raiz: ReactTestRenderer, etiqueta: string) =>
  raiz.root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === etiqueta)!;
const boton = (raiz: ReactTestRenderer, titulo: string) =>
  raiz.root.find(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.findAll((h) => h.props.children === titulo || h.props.children === `${titulo}`).length > 0,
  );
const textos = (raiz: ReactTestRenderer) =>
  raiz.root
    .findAllByType(Text)
    .flatMap((n) => n.props.children)
    .filter((c: unknown): c is string => typeof c === 'string');

async function escribir(raiz: ReactTestRenderer, etiqueta: string, texto: string) {
  await act(async () => campo(raiz, etiqueta).props.onChangeText(texto));
}

async function enviar(raiz: ReactTestRenderer, titulo: string) {
  await act(async () => {
    boton(raiz, titulo).props.onPress();
  });
}

beforeEach(() => jest.clearAllMocks());

describe('formulario de login', () => {
  it('correo y contraseña con teclado, autofill y tipos correctos; contraseña oculta al inicio', async () => {
    const { raiz } = await renderizar(<LoginArrendador />);
    const correo = campo(raiz, 'Correo');
    expect(correo.props).toMatchObject({
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoComplete: 'email',
      textContentType: 'emailAddress',
    });
    const contrasena = campo(raiz, 'Contraseña');
    expect(contrasena.props).toMatchObject({
      secureTextEntry: true,
      autoComplete: 'current-password',
      textContentType: 'password',
    });
  });

  it('el botón "Mostrar" revela la contraseña y "Ocultar" la vuelve a ocultar', async () => {
    const { raiz } = await renderizar(<LoginArrendador />);
    const alternar = () =>
      raiz.root.find(
        (n) => n.props.accessibilityLabel?.toString().endsWith('contraseña') && n.props.onPress,
      );
    expect(alternar().props.accessibilityLabel).toBe('Mostrar contraseña');
    await act(async () => alternar().props.onPress());
    expect(campo(raiz, 'Contraseña').props.secureTextEntry).toBe(false);
    expect(alternar().props.accessibilityLabel).toBe('Ocultar contraseña');
    await act(async () => alternar().props.onPress());
    expect(campo(raiz, 'Contraseña').props.secureTextEntry).toBe(true);
  });

  it('con campos vacíos o inválidos no llama al servidor y muestra los errores en español', async () => {
    const { raiz } = await renderizar(<LoginArrendador />);
    await enviar(raiz, 'Iniciar sesión');
    expect(mockIniciarArrendador).not.toHaveBeenCalled();
    expect(textos(raiz)).toEqual(
      expect.arrayContaining(['Escribe tu correo.', 'Escribe tu contraseña.']),
    );
    await escribir(raiz, 'Correo', 'no-es-correo');
    await escribir(raiz, 'Contraseña', 'x');
    await enviar(raiz, 'Iniciar sesión');
    expect(textos(raiz)).toContain('Escribe un correo válido.');
  });

  it('envía el correo ya recortado y en minúsculas, e inicia la sesión con la respuesta', async () => {
    mockIniciarArrendador.mockResolvedValueOnce(respuestaArrendador());
    const { raiz, controlador } = await renderizar(<LoginArrendador />);
    await escribir(raiz, 'Correo', '  Marta@Ejemplo.COM ');
    await escribir(raiz, 'Contraseña', 'Clave2026');
    await enviar(raiz, 'Iniciar sesión');
    expect(mockIniciarArrendador).toHaveBeenCalledWith('marta@ejemplo.com', 'Clave2026');
    expect(controlador.obtener().estado).toBe('arrendador');
  });

  it('mientras envía, el botón queda bloqueado y un segundo toque no envía otra vez', async () => {
    let terminar!: (valor: unknown) => void;
    mockIniciarArrendador.mockReturnValueOnce(new Promise((resolver) => (terminar = resolver)));
    const { raiz } = await renderizar(<LoginArrendador />);
    await escribir(raiz, 'Correo', 'marta@ejemplo.com');
    await escribir(raiz, 'Contraseña', 'Clave2026');
    await enviar(raiz, 'Iniciar sesión');

    const bloqueado = boton(raiz, 'Entrando…');
    expect(bloqueado.props.disabled).toBe(true);
    expect(bloqueado.props.accessibilityState).toMatchObject({ busy: true });
    expect(mockIniciarArrendador).toHaveBeenCalledTimes(1);

    await act(async () => terminar(respuestaArrendador()));
  });

  it('401 (credenciales inválidas), 429, sin conexión y 403 se muestran en español, sin datos técnicos', async () => {
    const casos: [ErrorApi | ErrorSinConexion, RegExp | string][] = [
      [
        new ErrorApi({ status: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Credenciales inválidas.' }),
        /Credenciales inválidas/,
      ],
      [
        new ErrorApi({
          status: 429,
          codigo: 'DEMASIADAS_SOLICITUDES',
          mensaje: 'ThrottlerException',
        }),
        /Demasiados intentos/,
      ],
      [
        new ErrorApi({ status: 403, codigo: 'CORREO_NO_VERIFICADO', mensaje: 'x' }),
        /verificar tu correo/,
      ],
      [new ErrorSinConexion(), MENSAJE_SIN_CONEXION],
    ];
    for (const [error, esperado] of casos) {
      mockIniciarArrendador.mockRejectedValueOnce(error);
      const { raiz } = await renderizar(<LoginArrendador />);
      await escribir(raiz, 'Correo', 'marta@ejemplo.com');
      await escribir(raiz, 'Contraseña', 'Clave2026');
      await enviar(raiz, 'Iniciar sesión');
      const visibles = textos(raiz).join(' | ');
      expect(visibles).toMatch(esperado);
      expect(visibles).not.toMatch(/Throttler|statusCode|NO_AUTENTICADO|token/i);
    }
  });

  it('el login del inquilino llama a su endpoint y trae la nota de activación', async () => {
    const { raiz } = await renderizar(<LoginInquilino />);
    // R1-B: la pregunta y el enlace "Tengo un código de activación" van juntos; la nota queda debajo.
    const visibles = textos(raiz).join(' ');
    expect(visibles).toContain('¿Aún no tienes cuenta?');
    expect(visibles).toContain('Tu arrendador te dará un código de activación.');
    mockIniciarInquilino.mockResolvedValueOnce({
      access_token: crearToken({ inquilinoId: 'i1', exp: EXP_LEJANO }),
      inquilino: { id: 'i1', nombre: 'Camilo', correo: 'c@x.co', telefono: '3', creado_en: 'x' },
    });
    await escribir(raiz, 'Correo', 'c@x.co');
    await escribir(raiz, 'Contraseña', 'Clave2026');
    await enviar(raiz, 'Iniciar sesión');
    expect(mockIniciarInquilino).toHaveBeenCalledWith('c@x.co', 'Clave2026');
  });
});

describe('registro del arrendador', () => {
  async function llenar(raiz: ReactTestRenderer) {
    await escribir(raiz, 'Nombre completo', ' Marta Ríos ');
    await escribir(raiz, 'Correo', 'Marta@Ejemplo.com');
    await escribir(raiz, 'Teléfono', '300 123 4567');
    await escribir(raiz, 'Contraseña', 'Clave2026');
  }

  it('campos con el teclado y el autofill correctos', async () => {
    const { raiz } = await renderizar(<RegistroArrendador />);
    expect(campo(raiz, 'Nombre completo').props).toMatchObject({
      autoComplete: 'name',
      textContentType: 'name',
      autoCapitalize: 'words',
    });
    expect(campo(raiz, 'Teléfono').props).toMatchObject({
      keyboardType: 'phone-pad',
      autoComplete: 'tel',
      textContentType: 'telephoneNumber',
    });
    expect(campo(raiz, 'Contraseña').props).toMatchObject({
      secureTextEntry: true,
      autoComplete: 'new-password',
      textContentType: 'newPassword',
    });
  });

  it('valida nombre, teléfono y contraseña antes de enviar', async () => {
    const { raiz } = await renderizar(<RegistroArrendador />);
    await escribir(raiz, 'Correo', 'marta@ejemplo.com');
    await escribir(raiz, 'Contraseña', 'corta');
    await enviar(raiz, 'Crear cuenta');
    expect(mockRegistrar).not.toHaveBeenCalled();
    expect(textos(raiz)).toEqual(
      expect.arrayContaining([
        'Escribe tu nombre.',
        'Escribe tu teléfono.',
        'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
      ]),
    );
  });

  it('registra solo nombre, correo, teléfono y contraseña, y deja la sesión iniciada', async () => {
    mockRegistrar.mockResolvedValueOnce(respuestaArrendador());
    const { raiz, controlador } = await renderizar(<RegistroArrendador />);
    await llenar(raiz);
    await enviar(raiz, 'Crear cuenta');
    expect(mockRegistrar).toHaveBeenCalledWith({
      nombre: 'Marta Ríos',
      correo: 'marta@ejemplo.com',
      telefono: '300 123 4567',
      contrasena: 'Clave2026',
    });
    expect(controlador.obtener().estado).toBe('arrendador');
  });

  it('con requiere_verificacion no inicia sesión y lleva a "Revisa tu correo"', async () => {
    mockRegistrar.mockResolvedValueOnce({
      requiere_verificacion: true,
      correo: 'marta@ejemplo.com',
    });
    const { raiz, controlador } = await renderizar(<RegistroArrendador />);
    await llenar(raiz);
    await enviar(raiz, 'Crear cuenta');
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(controlador.obtenerToken()).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/verifica-correo',
      params: { correo: 'marta@ejemplo.com', rol: 'arrendador' },
    });
  });

  it('un 409 no revela si el correo existe', async () => {
    mockRegistrar.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'CONFLICTO', mensaje: 'Ya existe' }),
    );
    const { raiz } = await renderizar(<RegistroArrendador />);
    await llenar(raiz);
    await enviar(raiz, 'Crear cuenta');
    const visibles = textos(raiz).join(' ');
    expect(visibles).toContain('No pudimos completar el registro con esos datos');
    expect(visibles).not.toMatch(/ya existe|ya está registrado/i);
  });
});

describe('aviso de sesión vencida', () => {
  const vencida: DatosSesion = {
    token: crearToken({ id: 'a1', exp: 1 }),
    rol: 'arrendador',
    usuario: { id: 'a1', nombre: 'Marta', correo: 'm@x.co' },
  };

  it('la bienvenida y el login lo muestran cuando el token guardado venció', async () => {
    const bienvenida = await renderizar(<Bienvenida />, vencida);
    expect(textos(bienvenida.raiz)).toContain(MENSAJE_SESION_VENCIDA);
    const login = await renderizar(<LoginArrendador />, vencida);
    expect(textos(login.raiz)).toContain(MENSAJE_SESION_VENCIDA);
  });

  it('sin sesión previa no aparece', async () => {
    const { raiz } = await renderizar(<Bienvenida />);
    expect(textos(raiz)).not.toContain(MENSAJE_SESION_VENCIDA);
  });
});
