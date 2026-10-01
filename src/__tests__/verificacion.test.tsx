// Verificación de correo con el código de 6 dígitos y reenvío con cuenta regresiva de 60 s.
import { act } from 'react-test-renderer';

import VerificaCorreo from '../../app/(auth)/verifica-correo';
import { ErrorApi } from '../api/cliente';
import {
  botonDe,
  campoDe,
  escribirEn,
  pulsar,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
const mockVerificar = jest.fn();
const mockReenviar = jest.fn();
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  verificarCorreo: (...a: unknown[]) => mockVerificar(...a),
  reenviarVerificacion: (...a: unknown[]) => mockReenviar(...a),
}));

const error = (status: number, codigo: string) =>
  new ErrorApi({ status, codigo, mensaje: 'técnico' });
const textoBotonReenvio = (raiz: Parameters<typeof textosDe>[0]) =>
  textosDe(raiz).find((t) => t.startsWith('Reenviar código')) ?? '';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockParams = { correo: 'camilo@ejemplo.com', rol: 'inquilino' };
});
afterEach(() => jest.useRealTimers());

describe('verificación: el código', () => {
  it('campo de 6 dígitos con teclado numérico y autofill de código de un solo uso', async () => {
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    expect(campoDe(raiz, 'Código de verificación')?.props).toMatchObject({
      keyboardType: 'number-pad',
      maxLength: 6,
      autoComplete: 'one-time-code',
      textContentType: 'oneTimeCode',
    });
    expect(textosDe(raiz).join(' ')).toContain('camilo@ejemplo.com');
  });

  it('solo deja escribir dígitos', async () => {
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '12a3 45-6789');
    expect(campoDe(raiz, 'Código de verificación')?.props.value).toBe('123456');
  });

  it('un código incompleto no se envía', async () => {
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '123');
    await pulsar(raiz, 'Verificar');
    expect(mockVerificar).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('El código tiene 6 dígitos.');
  });

  it('éxito: mensaje y navegación al login del rol con el correo ya escrito', async () => {
    mockVerificar.mockResolvedValueOnce({ correo_verificado: true });
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '123456');
    await pulsar(raiz, 'Verificar');
    expect(mockVerificar).toHaveBeenCalledWith('camilo@ejemplo.com', '123456');
    expect(textosDe(raiz).join(' ')).toContain('Correo verificado');
    await pulsar(raiz, 'Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login-inquilino',
      params: { correo: 'camilo@ejemplo.com' },
    });
  });

  it('con rol arrendador va al login del arrendador', async () => {
    mockParams = { correo: 'marta@ejemplo.com', rol: 'arrendador' };
    mockVerificar.mockResolvedValueOnce({ correo_verificado: true });
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '654321');
    await pulsar(raiz, 'Verificar');
    await pulsar(raiz, 'Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login-arrendador',
      params: { correo: 'marta@ejemplo.com' },
    });
  });

  it('sin rol en los parámetros se asume arrendador (el registro libre)', async () => {
    mockParams = { correo: 'marta@ejemplo.com' };
    mockVerificar.mockResolvedValueOnce({ correo_verificado: true });
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '654321');
    await pulsar(raiz, 'Verificar');
    await pulsar(raiz, 'Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login-arrendador',
      params: { correo: 'marta@ejemplo.com' },
    });
  });

  it.each([
    [400, 'CODIGO_INVALIDO', 'Código incorrecto o vencido.'],
    [
      429,
      'DEMASIADOS_INTENTOS',
      'Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo.',
    ],
    [503, 'CORREO_NO_DISPONIBLE', 'Esta función no está disponible por ahora.'],
  ])('%i %s se muestra en español', async (status, codigo, mensaje) => {
    mockVerificar.mockRejectedValueOnce(error(status, codigo));
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '123456');
    await pulsar(raiz, 'Verificar');
    expect(textosDe(raiz)).toContain(mensaje);
    // Se puede volver a intentar: el botón no queda bloqueado.
    expect(botonDe(raiz, 'Verificar').props.disabled).toBe(false);
  });

  it('mientras envía, el botón queda bloqueado y no hay segundo envío', async () => {
    let terminar!: (v: unknown) => void;
    mockVerificar.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await escribirEn(raiz, 'Código de verificación', '123456');
    await pulsar(raiz, 'Verificar');
    expect(botonDe(raiz, 'Verificando…').props.disabled).toBe(true);
    expect(mockVerificar).toHaveBeenCalledTimes(1);
    await act(async () => terminar({ correo_verificado: true }));
  });
});

describe('verificación: reenviar código con cuenta regresiva de 60 s', () => {
  it('empieza bloqueado y muestra los segundos que faltan', async () => {
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    expect(textoBotonReenvio(raiz)).toBe('Reenviar código (60 s)');
    expect(botonDe(raiz, 'Reenviar código (60 s)').props.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(15_000));
    expect(textoBotonReenvio(raiz)).toBe('Reenviar código (45 s)');
  });

  it('a los 60 s se habilita; al reenviar pide el código otra vez y reinicia la cuenta', async () => {
    mockReenviar.mockResolvedValueOnce({});
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(textoBotonReenvio(raiz)).toBe('Reenviar código');
    expect(botonDe(raiz, 'Reenviar código').props.disabled).toBe(false);

    await pulsar(raiz, 'Reenviar código');
    expect(mockReenviar).toHaveBeenCalledTimes(1);
    expect(mockReenviar).toHaveBeenCalledWith('camilo@ejemplo.com');
    expect(textoBotonReenvio(raiz)).toBe('Reenviar código (60 s)');
    expect(textosDe(raiz).join(' ')).toMatch(/enviamos un código nuevo/i);
  });

  it('un reenvío que falla (503) muestra el error y deja volver a intentar', async () => {
    mockReenviar.mockRejectedValueOnce(error(503, 'CORREO_NO_DISPONIBLE'));
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    await act(async () => jest.advanceTimersByTime(60_000));
    await pulsar(raiz, 'Reenviar código');
    expect(textosDe(raiz)).toContain('Esta función no está disponible por ahora.');
  });

  it('no pide el reenvío al entrar si el código acaba de enviarse (registro)', async () => {
    await renderizarPantalla(<VerificaCorreo />);
    expect(mockReenviar).not.toHaveBeenCalled();
  });

  it('desde el login (403) pide el reenvío UNA sola vez al entrar', async () => {
    mockParams = { correo: 'camilo@ejemplo.com', rol: 'inquilino', reenviar: '1' };
    mockReenviar.mockResolvedValue({});
    const { raiz } = await renderizarPantalla(<VerificaCorreo />);
    expect(mockReenviar).toHaveBeenCalledTimes(1);
    expect(mockReenviar).toHaveBeenCalledWith('camilo@ejemplo.com');
    // Y la cuenta regresiva ya corre desde ese envío.
    expect(botonDe(raiz, 'Reenviar código (60 s)').props.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(30_000));
    expect(mockReenviar).toHaveBeenCalledTimes(1);
  });
});
