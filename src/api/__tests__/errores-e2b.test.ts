import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../cliente';
import {
  MENSAJE_GENERICO,
  MENSAJE_SIN_CONEXION,
  MENSAJE_TIMEOUT,
  MENSAJES_ERROR,
  mensajeDeError,
  mensajeDeErrorActivacion,
  mensajeDeErrorRegistro,
  mensajeDeErrorVinculacion,
} from '../errores';

const api = (status: number, codigo: string | null) =>
  new ErrorApi({ status, codigo, mensaje: 'mensaje técnico del servidor' });

describe('diccionario: códigos de E2-B', () => {
  it('CODIGO_INVALIDO, REQUIERE_INICIO_SESION y CORREO_NO_DISPONIBLE', () => {
    expect(MENSAJES_ERROR.CODIGO_INVALIDO).toBe('Código incorrecto o vencido.');
    expect(MENSAJES_ERROR.REQUIERE_INICIO_SESION).toMatch(/Inicia sesión/);
    expect(MENSAJES_ERROR.CORREO_NO_DISPONIBLE).toBe('Esta función no está disponible por ahora.');
  });

  it('DEMASIADOS_INTENTOS habla de códigos inválidos y de esperar 15 minutos', () => {
    expect(MENSAJES_ERROR.DEMASIADOS_INTENTOS).toBe(
      'Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo.',
    );
  });

  it('VALIDACION (400) no muestra detalles técnicos', () => {
    expect(mensajeDeError(api(400, 'VALIDACION'))).toBe(MENSAJES_ERROR.VALIDACION);
  });
});

describe('mensajeDeErrorActivacion', () => {
  it('404 NO_ENCONTRADO: "Código de acceso no válido."', () => {
    expect(mensajeDeErrorActivacion(api(404, 'NO_ENCONTRADO'))).toBe('Código de acceso no válido.');
  });

  it('429 DEMASIADOS_INTENTOS: bloqueo de 15 minutos', () => {
    expect(mensajeDeErrorActivacion(api(429, 'DEMASIADOS_INTENTOS'))).toMatch(
      /Demasiados intentos con códigos inválidos\. Espera 15 minutos/,
    );
  });

  it('429 del límite de peticiones (sin bloqueo de código) dice que espere un momento', () => {
    const m = mensajeDeErrorActivacion(api(429, 'DEMASIADAS_SOLICITUDES'));
    expect(m).toMatch(/Demasiados intentos seguidos/);
    expect(m).not.toMatch(/15 minutos/);
  });

  it('409 genérico del registro no revela si el correo existe', () => {
    const m = mensajeDeErrorActivacion(api(409, 'CONFLICTO'));
    expect(m).toBe(mensajeDeErrorRegistro(api(409, 'CONFLICTO')));
    expect(m).not.toMatch(/ya existe|ya está registrado/i);
  });

  it('red y tiempo agotado usan sus mensajes', () => {
    expect(mensajeDeErrorActivacion(new ErrorSinConexion())).toBe(MENSAJE_SIN_CONEXION);
    expect(mensajeDeErrorActivacion(new ErrorTimeout())).toBe(MENSAJE_TIMEOUT);
  });

  it('un error inesperado es el genérico, sin datos técnicos', () => {
    expect(mensajeDeErrorActivacion(api(500, null))).toBe(MENSAJE_GENERICO);
    expect(mensajeDeErrorActivacion(new Error('boom'))).toBe(MENSAJE_GENERICO);
  });
});

describe('mensajeDeErrorVinculacion', () => {
  it('404: el mismo texto genérico del servidor que la activación (no inventa causas)', () => {
    expect(mensajeDeErrorVinculacion(api(404, 'NO_ENCONTRADO'))).toBe(
      'Código de acceso no válido.',
    );
    expect(mensajeDeErrorVinculacion(api(404, 'NO_ENCONTRADO'))).toBe(
      mensajeDeErrorActivacion(api(404, 'NO_ENCONTRADO')),
    );
  });

  it('429 y demás errores reutilizan el mapeo general', () => {
    expect(mensajeDeErrorVinculacion(api(429, 'DEMASIADOS_INTENTOS'))).toBe(
      MENSAJES_ERROR.DEMASIADOS_INTENTOS,
    );
    expect(mensajeDeErrorVinculacion(new ErrorSinConexion())).toBe(MENSAJE_SIN_CONEXION);
  });
});

describe('verificación y recuperación (por código y por estado)', () => {
  it.each([
    [400, 'CODIGO_INVALIDO', 'Código incorrecto o vencido.'],
    [429, 'DEMASIADOS_INTENTOS', MENSAJES_ERROR.DEMASIADOS_INTENTOS],
    [503, 'CORREO_NO_DISPONIBLE', 'Esta función no está disponible por ahora.'],
  ])('%i %s', (status, codigo, esperado) => {
    expect(mensajeDeError(api(status, codigo))).toBe(esperado);
  });
});
