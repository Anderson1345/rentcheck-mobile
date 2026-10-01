// Funciones de src/api/auth.ts con fetch simulado: rutas, métodos, cuerpos, encabezados y los tipos
// de respuesta 200 / 201 / 202. Se usa el cliente real (con timeouts y errores tipados).
import {
  completarRegistroInquilino,
  obtenerCapacidades,
  recuperarContrasena,
  reenviarVerificacion,
  requiereVerificacion,
  restablecerContrasena,
  validarCodigoAcceso,
  verificarCorreo,
  vincularContrato,
} from '../auth';
import { ErrorApi, establecerProveedorToken } from '../cliente';

const fetchSimulado = jest.fn();
const BASE = 'https://api.prueba.test';

function responder(status: number, cuerpo: unknown) {
  fetchSimulado.mockResolvedValueOnce(
    new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const ultima = () => {
  const [url, init] = fetchSimulado.mock.calls[fetchSimulado.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit };
};

beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  globalThis.fetch = fetchSimulado as unknown as typeof fetch;
});
beforeEach(() => {
  fetchSimulado.mockReset();
  establecerProveedorToken(() => null);
});
afterAll(() => establecerProveedorToken(() => null));

describe('capacidades', () => {
  it('GET /auth/capacidades devuelve las dos banderas', async () => {
    responder(200, { verificacion_correo: false, recuperacion_contrasena: true });
    await expect(obtenerCapacidades()).resolves.toEqual({
      verificacion_correo: false,
      recuperacion_contrasena: true,
    });
    expect(ultima().url).toBe(`${BASE}/auth/capacidades`);
    expect(ultima().init.method).toBe('GET');
  });
});

describe('activación del inquilino', () => {
  it('POST /auth/inquilino/validar-codigo con { codigo }; sin cuenta devuelve los datos del contrato', async () => {
    responder(200, {
      requiere_inicio_sesion: false,
      mensaje: 'Puede continuar completando su registro.',
      nombreInquilino: 'Camilo Pardo',
      nombreUnidad: 'Apto 302',
      direccionInmueble: 'Calle 45 # 12-30',
    });
    const r = await validarCodigoAcceso('RC-AB3D-9KPX');
    expect(r.nombreInquilino).toBe('Camilo Pardo');
    expect(ultima().url).toBe(`${BASE}/auth/inquilino/validar-codigo`);
    expect(ultima().init.method).toBe('POST');
    expect(JSON.parse(ultima().init.body as string)).toEqual({ codigo: 'RC-AB3D-9KPX' });
  });

  it('validar-codigo con cuenta: requiere_inicio_sesion sin nombre', async () => {
    responder(200, {
      requiere_inicio_sesion: true,
      mensaje: 'Inicia sesión y agrega este código desde la app.',
    });
    const r = await validarCodigoAcceso('RC-AB3D-9KPX');
    expect(r.requiere_inicio_sesion).toBe(true);
    expect(r.nombreInquilino).toBeUndefined();
  });

  it('un código inexistente es un ErrorApi 404 NO_ENCONTRADO', async () => {
    responder(404, {
      statusCode: 404,
      codigo: 'NO_ENCONTRADO',
      mensaje: 'Código de acceso no válido',
    });
    const error = (await validarCodigoAcceso('RC-AB3D-9KPX').catch((e: unknown) => e)) as ErrorApi;
    expect(error).toBeInstanceOf(ErrorApi);
    expect([error.status, error.codigo]).toEqual([404, 'NO_ENCONTRADO']);
  });

  it('completar-registro: 200 con token', async () => {
    responder(200, {
      access_token: 't',
      inquilino: { id: 'i1', nombre: 'C', correo: 'c@x.co', telefono: '3', creado_en: 'x' },
    });
    const r = await completarRegistroInquilino({
      codigo: 'RC-AB3D-9KPX',
      correo: 'c@x.co',
      contrasena: 'Clave2026',
    });
    expect(requiereVerificacion(r)).toBe(false);
    expect(ultima().url).toBe(`${BASE}/auth/inquilino/completar-registro`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({
      codigo: 'RC-AB3D-9KPX',
      correo: 'c@x.co',
      contrasena: 'Clave2026',
    });
  });

  it('completar-registro: 201 requiere_verificacion sin token', async () => {
    responder(201, { requiere_verificacion: true, correo: 'c@x.co' });
    const r = await completarRegistroInquilino({
      codigo: 'RC-AB3D-9KPX',
      correo: 'c@x.co',
      contrasena: 'Clave2026',
    });
    expect(requiereVerificacion(r)).toBe(true);
    expect('access_token' in r).toBe(false);
  });

  it('completar-registro: 409 REQUIERE_INICIO_SESION y 409 genérico llegan como ErrorApi distintos', async () => {
    responder(409, { statusCode: 409, codigo: 'REQUIERE_INICIO_SESION', mensaje: 'Inicia sesión' });
    responder(409, {
      statusCode: 409,
      codigo: 'CONFLICTO',
      mensaje: 'No fue posible completar el registro con esos datos.',
    });
    const datos = { codigo: 'RC-AB3D-9KPX', correo: 'c@x.co', contrasena: 'Clave2026' };
    const a = (await completarRegistroInquilino(datos).catch((e: unknown) => e)) as ErrorApi;
    const b = (await completarRegistroInquilino(datos).catch((e: unknown) => e)) as ErrorApi;
    expect(a.codigo).toBe('REQUIERE_INICIO_SESION');
    expect(b.codigo).toBe('CONFLICTO');
  });
});

describe('verificación de correo', () => {
  it('POST /auth/verificar-correo con correo y código; 200 { correo_verificado: true }', async () => {
    responder(200, { correo_verificado: true });
    await expect(verificarCorreo('c@x.co', '123456')).resolves.toEqual({ correo_verificado: true });
    expect(ultima().url).toBe(`${BASE}/auth/verificar-correo`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({
      correo: 'c@x.co',
      codigo: '123456',
    });
  });

  it('CODIGO_INVALIDO llega como ErrorApi 400', async () => {
    responder(400, { statusCode: 400, codigo: 'CODIGO_INVALIDO', mensaje: 'x' });
    const error = (await verificarCorreo('c@x.co', '000000').catch((e: unknown) => e)) as ErrorApi;
    expect([error.status, error.codigo]).toEqual([400, 'CODIGO_INVALIDO']);
  });

  it('POST /auth/reenviar-verificacion: 202', async () => {
    responder(202, { mensaje: 'Si el correo corresponde a una cuenta...' });
    await reenviarVerificacion('c@x.co');
    expect(ultima().url).toBe(`${BASE}/auth/reenviar-verificacion`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({ correo: 'c@x.co' });
  });

  it('503 CORREO_NO_DISPONIBLE llega como ErrorApi', async () => {
    responder(503, { statusCode: 503, codigo: 'CORREO_NO_DISPONIBLE', mensaje: 'x' });
    const error = (await reenviarVerificacion('c@x.co').catch((e: unknown) => e)) as ErrorApi;
    expect([error.status, error.codigo]).toEqual([503, 'CORREO_NO_DISPONIBLE']);
  });
});

describe('recuperación de contraseña', () => {
  it('POST /auth/recuperar-contrasena: 202', async () => {
    responder(202, { mensaje: 'ok' });
    await recuperarContrasena('c@x.co');
    expect(ultima().url).toBe(`${BASE}/auth/recuperar-contrasena`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({ correo: 'c@x.co' });
  });

  it('POST /auth/restablecer-contrasena con correo, código y nueva_contrasena; 200', async () => {
    responder(200, { contrasena_actualizada: true });
    await expect(
      restablecerContrasena({ correo: 'c@x.co', codigo: '123456', nueva_contrasena: 'Clave2027' }),
    ).resolves.toEqual({ contrasena_actualizada: true });
    expect(ultima().url).toBe(`${BASE}/auth/restablecer-contrasena`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({
      correo: 'c@x.co',
      codigo: '123456',
      nueva_contrasena: 'Clave2027',
    });
  });
});

describe('vincular contrato (con sesión de inquilino)', () => {
  it('POST /inquilino/contratos/vincular con el token de la sesión', async () => {
    establecerProveedorToken(() => 'token-inquilino');
    responder(200, {
      id: 'c1',
      estado: 'ACTIVO',
      fecha_inicio: '2026-09-01T00:00:00.000Z',
      fecha_fin: '2027-08-31T00:00:00.000Z',
      vinculado_en: '2026-10-01T10:00:00.000Z',
      datos_recaudo: null,
      unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
      inmueble: { id: 'm1', direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
    });
    const contrato = await vincularContrato('RC-AB3D-9KPX');
    expect(contrato.unidad.nombre).toBe('Apto 302');
    expect(contrato.inmueble.direccion).toBe('Calle 45 # 12-30');
    expect(ultima().url).toBe(`${BASE}/inquilino/contratos/vincular`);
    expect(JSON.parse(ultima().init.body as string)).toEqual({ codigo: 'RC-AB3D-9KPX' });
    expect((ultima().init.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-inquilino',
    );
  });

  it('un código ajeno o inválido es 404 NO_ENCONTRADO', async () => {
    establecerProveedorToken(() => 'token-inquilino');
    responder(404, { statusCode: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    const error = (await vincularContrato('RC-AB3D-9KPX').catch((e: unknown) => e)) as ErrorApi;
    expect(error.status).toBe(404);
  });
});
