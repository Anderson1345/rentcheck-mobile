// Activación del inquilino con código: pasos 1 y 2, enlace rentcheck://activar/<codigo> y las
// ramas "ya tiene cuenta", verificación pendiente y errores. Todo con respuestas simuladas.
import { act } from 'react-test-renderer';

import Activar from '../../app/(auth)/activar';
import ActivarConEnlace from '../../app/(auth)/activar/[codigo]';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { consumirCodigoPendiente, limpiarCodigoPendiente } from '../sesion/codigoPendiente';
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
const mockValidar = jest.fn();
const mockCompletar = jest.fn();
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  validarCodigoAcceso: (...a: unknown[]) => mockValidar(...a),
  completarRegistroInquilino: (...a: unknown[]) => mockCompletar(...a),
}));

const SIN_CUENTA = {
  requiere_inicio_sesion: false,
  mensaje: 'Puede continuar completando su registro.',
  nombreInquilino: 'Camilo Pardo',
  nombreUnidad: 'Apto 302',
  direccionInmueble: 'Calle 45 # 12-30',
};
const CON_CUENTA = {
  requiere_inicio_sesion: true,
  mensaje: 'Inicia sesión y agrega este código desde la app.',
};
const SESION_INQUILINO = () => ({
  access_token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  inquilino: {
    id: 'i1',
    nombre: 'Camilo Pardo',
    correo: 'camilo@ejemplo.com',
    telefono: '3',
    creado_en: 'x',
  },
});
const error = (status: number, codigo: string) =>
  new ErrorApi({ status, codigo, mensaje: 'técnico' });

async function irAlPaso2(raiz: Awaited<ReturnType<typeof renderizarPantalla>>['raiz']) {
  mockValidar.mockResolvedValueOnce(SIN_CUENTA);
  await escribirEn(raiz, 'Código de activación', 'rc ab3d 9kpx');
  await pulsar(raiz, 'Continuar');
}

async function llenarPaso2(
  raiz: Awaited<ReturnType<typeof renderizarPantalla>>['raiz'],
  confirmacion = 'Clave2026',
) {
  await escribirEn(raiz, 'Correo', ' Camilo@Ejemplo.com ');
  await escribirEn(raiz, 'Contraseña', 'Clave2026');
  await escribirEn(raiz, 'Confirmar contraseña', confirmacion);
}

let consola: jest.SpyInstance[];
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  limpiarCodigoPendiente();
  consola = (['log', 'warn', 'error', 'info', 'debug'] as const).map((m) =>
    jest.spyOn(console, m).mockImplementation(() => undefined),
  );
});
afterEach(() => {
  // Ningún console.* con el código, la contraseña o el token.
  for (const espia of consola) expect(espia).not.toHaveBeenCalled();
  consola.forEach((e) => e.mockRestore());
});

describe('activar: paso 1 (el código)', () => {
  it('campo con el autofill y el teclado correctos y botón "Continuar"', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    expect(campoDe(raiz, 'Código de activación')?.props).toMatchObject({
      autoCapitalize: 'characters',
      autoCorrect: false,
    });
    expect(hayBoton(raiz, 'Continuar')).toBe(true);
  });

  it('mientras se escribe, muestra el valor como RC-XXXX-XXXX', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'rcab3d9kpx');
    expect(campoDe(raiz, 'Código de activación')?.props.value).toBe('RC-AB3D-9KPX');
    await escribirEn(raiz, 'Código de activación', 'rc ab3d');
    expect(campoDe(raiz, 'Código de activación')?.props.value).toBe('RC-AB3D');
  });

  it.each(['', '   ', 'hola', 'RC-AB3D', 'RC-AB3D-9KP0', 'RC-AB3D-9KPXZ', '12345678'])(
    'un código mal formado (%j) NO se envía al servidor',
    async (malo) => {
      const { raiz } = await renderizarPantalla(<Activar />);
      await escribirEn(raiz, 'Código de activación', malo);
      await pulsar(raiz, 'Continuar');
      expect(mockValidar).not.toHaveBeenCalled();
      expect(textosDe(raiz).join(' ')).toContain(
        'Revisa el código: tiene el formato RC-XXXX-XXXX.',
      );
    },
  );

  it('un código bien escrito (aunque venga en minúsculas y con espacios) se envía en formato canónico', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    expect(mockValidar).toHaveBeenCalledTimes(1);
    expect(mockValidar).toHaveBeenCalledWith('RC-AB3D-9KPX');
  });

  it('un código inexistente (404) muestra "Código de acceso no válido." y se queda en el paso 1', async () => {
    mockValidar.mockRejectedValueOnce(error(404, 'NO_ENCONTRADO'));
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Continuar');
    expect(textosDe(raiz)).toContain('Código de acceso no válido.');
    expect(hayBoton(raiz, 'Continuar')).toBe(true);
    expect(campoDe(raiz, 'Contraseña')).toBeUndefined();
  });

  it('429: "Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo."', async () => {
    mockValidar.mockRejectedValueOnce(error(429, 'DEMASIADOS_INTENTOS'));
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Continuar');
    expect(textosDe(raiz)).toContain(
      'Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo.',
    );
  });

  it('sin conexión muestra su mensaje y no reintenta solo', async () => {
    mockValidar.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Continuar');
    expect(textosDe(raiz).join(' ')).toMatch(/conexión a internet/);
    expect(mockValidar).toHaveBeenCalledTimes(1);
  });

  it('mientras envía, el botón queda bloqueado y un segundo toque no vuelve a enviar', async () => {
    let terminar!: (v: unknown) => void;
    mockValidar.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Continuar');
    const bloqueado = botonDe(raiz, 'Validando…');
    expect(bloqueado.props.disabled).toBe(true);
    expect(bloqueado.props.accessibilityState).toMatchObject({ busy: true });
    expect(mockValidar).toHaveBeenCalledTimes(1);
    await act(async () => terminar(SIN_CUENTA));
  });
});

describe('activar: paso 2 (crear la cuenta)', () => {
  it('saluda con el nombre, la unidad y la dirección del contrato', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    const visibles = textosDe(raiz).join(' | ');
    expect(visibles).toContain('Hola, Camilo Pardo');
    expect(visibles).toContain('Apto 302');
    expect(visibles).toContain('Calle 45 # 12-30');
  });

  it('campos con autofill: correo, contraseña nueva y confirmación nueva', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    expect(campoDe(raiz, 'Correo')?.props).toMatchObject({
      keyboardType: 'email-address',
      autoComplete: 'email',
      textContentType: 'emailAddress',
    });
    for (const etiqueta of ['Contraseña', 'Confirmar contraseña']) {
      expect(campoDe(raiz, etiqueta)?.props).toMatchObject({
        secureTextEntry: true,
        autoComplete: 'new-password',
        textContentType: 'newPassword',
      });
    }
  });

  it('valida antes de enviar: contraseña corta y confirmación distinta', async () => {
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await escribirEn(raiz, 'Correo', 'camilo@ejemplo.com');
    await escribirEn(raiz, 'Contraseña', 'corta');
    await escribirEn(raiz, 'Confirmar contraseña', 'otra');
    await pulsar(raiz, 'Crear mi cuenta');
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toEqual(
      expect.arrayContaining([
        'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
        'Las contraseñas no coinciden.',
      ]),
    );
  });

  it('200 → inicia sesión como inquilino (queda vinculado) con el código en formato canónico', async () => {
    mockCompletar.mockResolvedValueOnce(SESION_INQUILINO());
    const { raiz, controlador } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(mockCompletar).toHaveBeenCalledWith({
      codigo: 'RC-AB3D-9KPX',
      correo: 'camilo@ejemplo.com',
      contrasena: 'Clave2026',
    });
    expect(controlador.obtener().estado).toBe('inquilino');
  });

  it('201 requiere_verificacion → pantalla de verificación con rol inquilino y sin sesión', async () => {
    mockCompletar.mockResolvedValueOnce({
      requiere_verificacion: true,
      correo: 'camilo@ejemplo.com',
    });
    const { raiz, controlador } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(controlador.obtenerToken()).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/verifica-correo',
      params: { correo: 'camilo@ejemplo.com', rol: 'inquilino' },
    });
  });

  it('409 REQUIERE_INICIO_SESION → paso "ya tengo cuenta" con el mensaje y el botón "Iniciar sesión"', async () => {
    mockCompletar.mockRejectedValueOnce(error(409, 'REQUIERE_INICIO_SESION'));
    const { raiz, controlador } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(textosDe(raiz).join(' ')).toMatch(/Ya tienes una cuenta/);
    await pulsar(raiz, 'Iniciar sesión');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/login-inquilino',
      params: { codigo: 'RC-AB3D-9KPX' },
    });
    expect(consumirCodigoPendiente()).toBe('RC-AB3D-9KPX');
  });

  it('409 genérico no revela si el correo existe', async () => {
    mockCompletar.mockRejectedValueOnce(error(409, 'CONFLICTO'));
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    const visibles = textosDe(raiz).join(' ');
    expect(visibles).toContain('No pudimos completar el registro con esos datos');
    expect(visibles).not.toMatch(/ya existe|ya está registrado/i);
  });

  it('404 (código vencido o usado entre pasos) vuelve al paso 1 con el mensaje', async () => {
    mockCompletar.mockRejectedValueOnce(error(404, 'NO_ENCONTRADO'));
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(textosDe(raiz)).toContain('Código de acceso no válido.');
    expect(campoDe(raiz, 'Código de activación')).toBeDefined();
  });

  it('429 muestra el mensaje de espera de 15 minutos', async () => {
    mockCompletar.mockRejectedValueOnce(error(429, 'DEMASIADOS_INTENTOS'));
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(textosDe(raiz).join(' ')).toContain('Espera 15 minutos');
  });

  it('mientras envía, el botón se bloquea y no hay segundo envío', async () => {
    let terminar!: (v: unknown) => void;
    mockCompletar.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Activar />);
    await irAlPaso2(raiz);
    await llenarPaso2(raiz);
    await pulsar(raiz, 'Crear mi cuenta');
    expect(botonDe(raiz, 'Creando cuenta…').props.disabled).toBe(true);
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    await act(async () => terminar(SESION_INQUILINO()));
  });
});

describe('activar: la persona ya tiene cuenta (lo dice validar-codigo)', () => {
  it('muestra el mensaje del servidor y "Iniciar sesión" lleva al login con el código pendiente', async () => {
    mockValidar.mockResolvedValueOnce(CON_CUENTA);
    const { raiz } = await renderizarPantalla(<Activar />);
    await escribirEn(raiz, 'Código de activación', 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Continuar');
    expect(textosDe(raiz)).toContain('Inicia sesión y agrega este código desde la app.');
    expect(campoDe(raiz, 'Contraseña')).toBeUndefined();
    await pulsar(raiz, 'Iniciar sesión');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/login-inquilino',
      params: { codigo: 'RC-AB3D-9KPX' },
    });
    expect(consumirCodigoPendiente()).toBe('RC-AB3D-9KPX');
  });
});

describe('activar/[codigo]: el enlace rentcheck://activar/<codigo>', () => {
  it('rellena el código ya escrito y NO llama al servidor por sí sola', async () => {
    mockParams = { codigo: 'rc-ab3d-9kpx' };
    const { raiz } = await renderizarPantalla(<ActivarConEnlace />);
    expect(campoDe(raiz, 'Código de activación')?.props.value).toBe('RC-AB3D-9KPX');
    expect(mockValidar).not.toHaveBeenCalled();
    expect(mockCompletar).not.toHaveBeenCalled();
  });

  it('el usuario toca "Continuar" para enviarlo', async () => {
    mockParams = { codigo: 'RC-AB3D-9KPX' };
    mockValidar.mockResolvedValueOnce(SIN_CUENTA);
    const { raiz } = await renderizarPantalla(<ActivarConEnlace />);
    await pulsar(raiz, 'Continuar');
    expect(mockValidar).toHaveBeenCalledWith('RC-AB3D-9KPX');
    expect(textosDe(raiz).join(' ')).toContain('Hola, Camilo Pardo');
  });

  it.each(['xyz', 'RC-AB3D', 'RC-AB3D-9KP0', ''])(
    'un enlace con el código mal formado (%j) muestra "El enlace no es válido. Escribe tu código." y no envía',
    async (malo) => {
      mockParams = { codigo: malo };
      const { raiz } = await renderizarPantalla(<ActivarConEnlace />);
      expect(textosDe(raiz)).toContain('El enlace no es válido. Escribe tu código.');
      expect(campoDe(raiz, 'Código de activación')?.props.value).toBe('');
      expect(mockValidar).not.toHaveBeenCalled();
    },
  );

  it('sin parámetro (enlace vacío) también muestra el aviso', async () => {
    mockParams = {};
    const { raiz } = await renderizarPantalla(<ActivarConEnlace />);
    expect(textosDe(raiz)).toContain('El enlace no es válido. Escribe tu código.');
  });
});
