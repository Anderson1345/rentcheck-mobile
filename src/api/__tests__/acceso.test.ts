import {
  crearClienteApi,
  ErrorApi,
  ErrorSinConexion,
  ErrorTimeout,
  esRutaDeAcceso,
} from '../cliente';
import {
  MENSAJE_GENERICO,
  MENSAJE_SESION_VENCIDA,
  MENSAJE_SIN_CONEXION,
  MENSAJE_TIMEOUT,
  MENSAJES_ERROR,
  mensajeDeError,
  mensajeDeErrorRegistro,
} from '../errores';

const BASE = 'https://api.prueba.test';

function respuestaConEstado(status: number) {
  return new Response(
    JSON.stringify({ statusCode: status, codigo: 'NO_AUTENTICADO', mensaje: 'x' }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function clienteCon(token: string | null, alRecibir401: jest.Mock, status = 401) {
  const fetchImpl = jest.fn(async () => respuestaConEstado(status));
  return crearClienteApi({ baseUrl: BASE, fetchImpl, obtenerToken: () => token, alRecibir401 });
}

describe('manejador global de 401', () => {
  it('se activa ante un 401 fuera de los endpoints de acceso, con el token enviado', async () => {
    const manejador = jest.fn();
    const cliente = clienteCon('token-vigente', manejador);
    await expect(cliente.get('/contratos')).rejects.toBeInstanceOf(ErrorApi);
    await expect(cliente.get('/inquilino/contratos')).rejects.toBeInstanceOf(ErrorApi);
    expect(manejador).toHaveBeenCalledTimes(2);
    expect(manejador).toHaveBeenCalledWith('token-vigente');
  });

  it.each([
    '/auth/arrendador/login',
    '/auth/arrendador/registro',
    '/auth/inquilino/login',
    '/auth/inquilino/completar-registro',
  ])('NO se activa en %s (ahí un 401 es "credenciales inválidas")', async (ruta) => {
    const manejador = jest.fn();
    const cliente = clienteCon('token-vigente', manejador);
    await expect(cliente.post(ruta, {})).rejects.toBeInstanceOf(ErrorApi);
    expect(manejador).not.toHaveBeenCalled();
  });

  it('NO se activa si la petición no llevaba token (no había sesión que cerrar)', async () => {
    const manejador = jest.fn();
    const cliente = clienteCon(null, manejador);
    await expect(cliente.get('/contratos')).rejects.toBeInstanceOf(ErrorApi);
    expect(manejador).not.toHaveBeenCalled();
  });

  it('NO se activa con otros errores (403, 404, 500)', async () => {
    for (const status of [403, 404, 500]) {
      const manejador = jest.fn();
      const cliente = clienteCon('token', manejador, status);
      await expect(cliente.get('/contratos')).rejects.toBeInstanceOf(ErrorApi);
      expect(manejador).not.toHaveBeenCalled();
    }
  });

  it('el error del 401 sigue llegando a quien llamó', async () => {
    const cliente = clienteCon('token', jest.fn());
    const error = (await cliente.get('/contratos').catch((e: unknown) => e)) as ErrorApi;
    expect(error.status).toBe(401);
    expect(error.codigo).toBe('NO_AUTENTICADO');
  });

  it('esRutaDeAcceso reconoce solo los endpoints públicos /auth/*', () => {
    expect(esRutaDeAcceso('/auth/arrendador/login')).toBe(true);
    expect(esRutaDeAcceso('/auth/inquilino/login')).toBe(true);
    expect(esRutaDeAcceso('/contratos')).toBe(false);
    expect(esRutaDeAcceso('/inquilino/auth')).toBe(false);
  });
});

describe('mensajes de acceso en español', () => {
  it('sesión vencida', () => {
    expect(MENSAJE_SESION_VENCIDA).toBe('Tu sesión venció. Inicia sesión de nuevo.');
  });

  it('401 en el login es "Credenciales inválidas"', () => {
    const error = new ErrorApi({
      status: 401,
      codigo: 'NO_AUTENTICADO',
      mensaje: 'Credenciales inválidas.',
    });
    expect(mensajeDeError(error)).toMatch(/^Credenciales inválidas/);
  });

  it('403 CORREO_NO_VERIFICADO, 429 y los dos errores de red tienen su propio mensaje', () => {
    const mensajes = [
      mensajeDeError(new ErrorApi({ status: 403, codigo: 'CORREO_NO_VERIFICADO', mensaje: '' })),
      mensajeDeError(new ErrorApi({ status: 429, codigo: 'DEMASIADAS_SOLICITUDES', mensaje: '' })),
      mensajeDeError(new ErrorApi({ status: 429, codigo: 'DEMASIADOS_INTENTOS', mensaje: '' })),
      mensajeDeError(new ErrorSinConexion()),
      mensajeDeError(new ErrorTimeout()),
    ];
    expect(new Set(mensajes).size).toBe(5);
    expect(mensajes).not.toContain(MENSAJE_GENERICO);
    expect(mensajes[3]).toBe(MENSAJE_SIN_CONEXION);
    expect(mensajes[4]).toBe(MENSAJE_TIMEOUT);
    expect(MENSAJES_ERROR.CORREO_NO_VERIFICADO).toMatch(/correo/i);
  });

  it('un 429 sin código propio (límite de peticiones) también tiene mensaje propio', () => {
    const error = new ErrorApi({ status: 429, codigo: null, mensaje: '' });
    expect(mensajeDeError(error)).not.toBe(MENSAJE_GENERICO);
  });

  it('el registro con 409 no revela si el correo existe: mensaje genérico de "no se pudo registrar"', () => {
    const error = new ErrorApi({ status: 409, codigo: 'CONFLICTO', mensaje: 'x' });
    const mensaje = mensajeDeErrorRegistro(error);
    expect(mensaje).toMatch(/registro/i);
    expect(mensaje).toMatch(/inicia sesión/i);
    expect(mensajeDeErrorRegistro(new ErrorSinConexion())).toBe(MENSAJE_SIN_CONEXION);
  });

  it('nunca muestra mensajes técnicos ni el cuerpo del servidor', () => {
    const error = new ErrorApi({
      status: 500,
      codigo: null,
      mensaje: 'PrismaClientKnownRequestError P2002',
    });
    expect(mensajeDeError(error)).toBe(MENSAJE_GENERICO);
    expect(mensajeDeErrorRegistro(error)).toBe(MENSAJE_GENERICO);
  });
});
