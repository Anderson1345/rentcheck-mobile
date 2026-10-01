// Recuperación de contraseña: pedir el código y restablecer. Rutas siempre disponibles.
import RecuperarContrasena from '../../app/(auth)/recuperar-contrasena';
import RestablecerContrasena from '../../app/(auth)/restablecer-contrasena';
import { ErrorApi } from '../api/cliente';
import {
  campoDe,
  escribirEn,
  hayBoton,
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
const mockRecuperar = jest.fn();
const mockRestablecer = jest.fn();
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  recuperarContrasena: (...a: unknown[]) => mockRecuperar(...a),
  restablecerContrasena: (...a: unknown[]) => mockRestablecer(...a),
}));

const error = (status: number, codigo: string) =>
  new ErrorApi({ status, codigo, mensaje: 'técnico' });
const MENSAJE_SIEMPRE_IGUAL = 'Si el correo tiene cuenta, te enviamos un código.';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { rol: 'inquilino' };
});

describe('recuperar-contrasena', () => {
  it('campo de correo con teclado y autofill de correo', async () => {
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    expect(campoDe(raiz, 'Correo')?.props).toMatchObject({
      keyboardType: 'email-address',
      autoComplete: 'email',
      textContentType: 'emailAddress',
    });
  });

  it('un correo inválido no se envía', async () => {
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(raiz, 'Correo', 'no-es-correo');
    await pulsar(raiz, 'Enviar código');
    expect(mockRecuperar).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Escribe un correo válido.');
  });

  it('202: siempre el mismo mensaje y el botón para seguir con el código', async () => {
    mockRecuperar.mockResolvedValueOnce({ mensaje: 'x' });
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(raiz, 'Correo', ' Camilo@Ejemplo.com ');
    await pulsar(raiz, 'Enviar código');
    expect(mockRecuperar).toHaveBeenCalledTimes(1);
    expect(mockRecuperar).toHaveBeenCalledWith('camilo@ejemplo.com');
    expect(textosDe(raiz)).toContain(MENSAJE_SIEMPRE_IGUAL);
    await pulsar(raiz, 'Ya tengo el código');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/restablecer-contrasena',
      params: { correo: 'camilo@ejemplo.com', rol: 'inquilino' },
    });
  });

  it('el mensaje no cambia según el correo (no revela si tiene cuenta)', async () => {
    mockRecuperar.mockResolvedValue({});
    const a = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(a.raiz, 'Correo', 'existe@ejemplo.com');
    await pulsar(a.raiz, 'Enviar código');
    const b = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(b.raiz, 'Correo', 'noexiste@ejemplo.com');
    await pulsar(b.raiz, 'Enviar código');
    expect(textosDe(a.raiz).filter((t) => t.includes('código'))).toEqual(
      textosDe(b.raiz).filter((t) => t.includes('código')),
    );
  });

  it('503 CORREO_NO_DISPONIBLE: mensaje claro y sin romperse', async () => {
    mockRecuperar.mockRejectedValueOnce(error(503, 'CORREO_NO_DISPONIBLE'));
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await pulsar(raiz, 'Enviar código');
    expect(textosDe(raiz)).toContain('Esta función no está disponible por ahora.');
    expect(textosDe(raiz)).not.toContain(MENSAJE_SIEMPRE_IGUAL);
  });

  it('prellena el correo que llega por parámetro y permite ir directo a "Ya tengo un código"', async () => {
    mockParams = { rol: 'arrendador', correo: 'marta@ejemplo.com' };
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    expect(campoDe(raiz, 'Correo')?.props.value).toBe('marta@ejemplo.com');
    expect(hayBoton(raiz, 'Ya tengo un código')).toBe(true);
  });

  it('mientras envía, el botón queda bloqueado y no hay segundo envío', async () => {
    let terminar!: (v: unknown) => void;
    mockRecuperar.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<RecuperarContrasena />);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await pulsar(raiz, 'Enviar código');
    expect(mockRecuperar).toHaveBeenCalledTimes(1);
    expect(hayBoton(raiz, 'Enviando…')).toBe(true);
    terminar({});
  });
});

describe('restablecer-contrasena', () => {
  const llenar = async (
    raiz: Awaited<ReturnType<typeof renderizarPantalla>>['raiz'],
    confirmacion = 'Clave2027',
  ) => {
    await escribirEn(raiz, 'Código de verificación', '123456');
    await escribirEn(raiz, 'Nueva contraseña', 'Clave2027');
    await escribirEn(raiz, 'Confirmar contraseña', confirmacion);
  };

  beforeEach(() => {
    mockParams = { correo: 'camilo@ejemplo.com', rol: 'inquilino' };
  });

  it('código de 6 dígitos (autofill de un solo uso) y contraseñas nuevas', async () => {
    const { raiz } = await renderizarPantalla(<RestablecerContrasena />);
    expect(campoDe(raiz, 'Código de verificación')?.props).toMatchObject({
      keyboardType: 'number-pad',
      maxLength: 6,
      autoComplete: 'one-time-code',
      textContentType: 'oneTimeCode',
    });
    for (const etiqueta of ['Nueva contraseña', 'Confirmar contraseña']) {
      expect(campoDe(raiz, etiqueta)?.props).toMatchObject({
        secureTextEntry: true,
        autoComplete: 'new-password',
        textContentType: 'newPassword',
      });
    }
    expect(campoDe(raiz, 'Correo')?.props.value).toBe('camilo@ejemplo.com');
  });

  it('valida: código corto, contraseña débil y confirmación distinta no se envían', async () => {
    const { raiz } = await renderizarPantalla(<RestablecerContrasena />);
    await escribirEn(raiz, 'Código de verificación', '12');
    await escribirEn(raiz, 'Nueva contraseña', 'corta');
    await escribirEn(raiz, 'Confirmar contraseña', 'otra');
    await pulsar(raiz, 'Cambiar contraseña');
    expect(mockRestablecer).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toEqual(
      expect.arrayContaining([
        'El código tiene 6 dígitos.',
        'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
        'Las contraseñas no coinciden.',
      ]),
    );
  });

  it('éxito: envía correo, código y nueva_contrasena; luego "Ir a iniciar sesión"', async () => {
    mockRestablecer.mockResolvedValueOnce({ contrasena_actualizada: true });
    const { raiz } = await renderizarPantalla(<RestablecerContrasena />);
    await llenar(raiz);
    await pulsar(raiz, 'Cambiar contraseña');
    expect(mockRestablecer).toHaveBeenCalledWith({
      correo: 'camilo@ejemplo.com',
      codigo: '123456',
      nueva_contrasena: 'Clave2027',
    });
    expect(textosDe(raiz).join(' ')).toContain('Contraseña actualizada');
    await pulsar(raiz, 'Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login-inquilino',
      params: { correo: 'camilo@ejemplo.com' },
    });
  });

  it('el rol arrendador lleva al login del arrendador', async () => {
    mockParams = { correo: 'marta@ejemplo.com', rol: 'arrendador' };
    mockRestablecer.mockResolvedValueOnce({ contrasena_actualizada: true });
    const { raiz } = await renderizarPantalla(<RestablecerContrasena />);
    await llenar(raiz);
    await pulsar(raiz, 'Cambiar contraseña');
    await pulsar(raiz, 'Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login-arrendador',
      params: { correo: 'marta@ejemplo.com' },
    });
  });

  it.each([
    [400, 'CODIGO_INVALIDO', 'Código incorrecto o vencido.'],
    [400, 'VALIDACION', 'Revisa los datos: alguno no es válido.'],
    [
      429,
      'DEMASIADOS_INTENTOS',
      'Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo.',
    ],
    [503, 'CORREO_NO_DISPONIBLE', 'Esta función no está disponible por ahora.'],
  ])('%i %s se muestra en español', async (status, codigo, mensaje) => {
    mockRestablecer.mockRejectedValueOnce(error(status, codigo));
    const { raiz } = await renderizarPantalla(<RestablecerContrasena />);
    await llenar(raiz);
    await pulsar(raiz, 'Cambiar contraseña');
    expect(textosDe(raiz)).toContain(mensaje);
  });
});
