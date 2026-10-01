// Subida de la foto por el cargador NATIVO (expo-file-system) y causa visible del fallo. El fetch de
// React Native no logra enviar un FormData con un archivo local en Android; en Jest no se puede ver
// ese fallo (el FormData es el de Node), así que aquí se comprueba lo que se le pide al cargador.
import {
  crearClienteApi,
  ErrorApi,
  ErrorArchivo,
  ErrorSinConexion,
  ErrorTimeout,
  sanearCausa,
  TIMEOUT_SUBIDA_MS,
} from '../cliente';
import { detalleTecnico, mensajeDeErrorFoto } from '../errores';

const mockCrearTarea = jest.fn();
const mockGetInfo = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  createUploadTask: (...a: unknown[]) => mockCrearTarea(...a),
  getInfoAsync: (...a: unknown[]) => mockGetInfo(...a),
}));

const MULTIPART = 1;
const archivo = { uri: 'file:///cache/foto.jpg', name: 'foto.jpg', type: 'image/jpeg' };
const resultado = (status: number, body: string) => ({ status, body });
const DIEZ_MB = 10 * 1024 * 1024;

function crear(
  uploadAsync: jest.Mock,
  info: { exists: boolean; size?: number } = { exists: true, size: 100 },
  token: string | null = 'abc123',
) {
  return crearClienteApi({
    baseUrl: 'https://api.test',
    obtenerToken: () => token,
    subirImpl: uploadAsync,
    infoImpl: jest.fn().mockResolvedValue(info),
  });
}

afterEach(() => {
  jest.useRealTimers();
  mockCrearTarea.mockReset();
  mockGetInfo.mockReset();
});

describe('subirArchivo con el cargador nativo', () => {
  it('pasa el campo, MIME, auth, Accept y extras sin Content-Type', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(201, '{"id":"i1"}'));
    await expect(
      crear(subir).subirArchivo('/foto', 'foto', archivo, { nota: 'x' }),
    ).resolves.toEqual({ id: 'i1' });
    expect(subir).toHaveBeenCalledWith(
      'https://api.test/foto',
      archivo.uri,
      expect.objectContaining({
        httpMethod: 'POST',
        uploadType: MULTIPART,
        fieldName: 'foto',
        mimeType: 'image/jpeg',
        headers: { Authorization: 'Bearer abc123', Accept: 'application/json' },
        parameters: { nota: 'x' },
      }),
      expect.any(Function),
    );
    expect(subir.mock.calls[0][2].headers['Content-Type']).toBeUndefined();
  });

  it('el tipo de subida es MULTIPART (el predeterminado, BINARY_CONTENT, no enviaría el campo)', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(200, '{}'));
    await crear(subir).subirArchivo('/foto', 'foto', archivo);
    expect(subir.mock.calls[0][2].uploadType).toBe(1);
    expect(subir.mock.calls[0][2].uploadType).not.toBe(0);
  });

  it('sin extras no manda parameters y sin sesión no manda Authorization', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(200, '{}'));
    await crear(subir, undefined, null).subirArchivo('/foto', 'foto', archivo);
    const opciones = subir.mock.calls[0][2];
    expect('parameters' in opciones).toBe(false);
    expect(opciones.headers).toEqual({ Accept: 'application/json' });
  });

  it('convierte respuestas 4xx en ErrorApi con status, código y mensaje', async () => {
    const subir = jest
      .fn()
      .mockResolvedValue(
        resultado(415, '{"statusCode":415,"codigo":"ERROR_415","mensaje":"Tipo no permitido"}'),
      );
    const error = await crear(subir)
      .subirArchivo('/foto', 'foto', archivo)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 415, codigo: 'ERROR_415', mensaje: 'Tipo no permitido' });
  });

  it('un 413 llega como ErrorApi CARGA_DEMASIADO_GRANDE', async () => {
    const subir = jest
      .fn()
      .mockResolvedValue(resultado(413, '{"codigo":"CARGA_DEMASIADO_GRANDE","mensaje":"grande"}'));
    await expect(crear(subir).subirArchivo('/foto', 'foto', archivo)).rejects.toMatchObject({
      status: 413,
      codigo: 'CARGA_DEMASIADO_GRANDE',
    });
  });

  it('un 401 con token avisa al manejador global; sin token no', async () => {
    const alRecibir401 = jest.fn();
    const construir = (token: string | null) =>
      crearClienteApi({
        baseUrl: 'https://api.test',
        obtenerToken: () => token,
        alRecibir401,
        subirImpl: jest.fn().mockResolvedValue(resultado(401, '{}')),
        infoImpl: jest.fn().mockResolvedValue({ exists: true, size: 1 }),
      });

    await expect(construir('abc123').subirArchivo('/foto', 'foto', archivo)).rejects.toBeInstanceOf(
      ErrorApi,
    );
    expect(alRecibir401).toHaveBeenCalledWith('abc123');

    alRecibir401.mockClear();
    await construir(null)
      .subirArchivo('/foto', 'foto', archivo)
      .catch(() => undefined);
    expect(alRecibir401).not.toHaveBeenCalled();
  });

  it('un fallo del cargador es ErrorSinConexion con la causa saneada (sin URL, token ni ruta)', async () => {
    const red = crear(
      jest
        .fn()
        .mockRejectedValue(
          new Error('failed https://api.test/a Bearer abc123 /data/user/0/x/f.jpg'),
        ),
    );
    const error = await red.subirArchivo('/foto', 'foto', archivo).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorSinConexion);
    expect((error as ErrorSinConexion).name).toBe('ErrorSinConexion');
    const causa = (error as ErrorSinConexion).causa ?? '';
    expect(causa).toMatch(/^Error: failed /);
    expect(causa).not.toMatch(/https?:|api\.test|Bearer|abc123|\/data\/user/);
  });

  it('al agotarse los 60 s cancela la subida nativa y lanza ErrorTimeout', async () => {
    jest.useFakeTimers();
    const cancelar = jest.fn().mockResolvedValue(undefined);
    const colgada = jest.fn(
      (
        _url: string,
        _uri: string,
        _opciones: unknown,
        registrar?: (c: () => Promise<void>) => void,
      ) => {
        registrar?.(cancelar);
        return new Promise(() => undefined);
      },
    );
    const promesa = crear(colgada)
      .subirArchivo('/foto', 'foto', archivo)
      .then(
        () => 'resuelta',
        (e: unknown) => e,
      );

    await jest.advanceTimersByTimeAsync(TIMEOUT_SUBIDA_MS - 1);
    expect(cancelar).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    expect(TIMEOUT_SUBIDA_MS).toBe(60_000);
    expect(cancelar).toHaveBeenCalledTimes(1);
    await expect(promesa).resolves.toBeInstanceOf(ErrorTimeout);
  });

  it('si cancelar también falla, igual lanza ErrorTimeout', async () => {
    jest.useFakeTimers();
    const colgada = jest.fn(
      (_u: string, _i: string, _o: unknown, registrar?: (c: () => Promise<void>) => void) => {
        registrar?.(() => Promise.reject(new Error('sin tarea')));
        return new Promise(() => undefined);
      },
    );
    const promesa = crear(colgada)
      .subirArchivo('/foto', 'foto', archivo)
      .then(
        () => 'resuelta',
        (e: unknown) => e,
      );
    await jest.advanceTimersByTimeAsync(TIMEOUT_SUBIDA_MS);
    await expect(promesa).resolves.toBeInstanceOf(ErrorTimeout);
  });

  it.each([{ exists: false }, { exists: true, size: 0 }])(
    'archivo inexistente o de 0 bytes (%j): no sube y pide elegir de nuevo',
    async (info) => {
      const subir = jest.fn();
      const error = await crear(subir, info)
        .subirArchivo('/foto', 'foto', archivo)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ErrorArchivo);
      expect((error as Error).message).toBe('No pudimos leer la foto. Elígela de nuevo.');
      expect(subir).not.toHaveBeenCalled();
    },
  );

  it('de más de 10 MB: no sube y dice que es demasiado grande; justo 10 MB sí sube', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(200, '{}'));
    const error = await crear(subir, { exists: true, size: DIEZ_MB + 1 })
      .subirArchivo('/foto', 'foto', archivo)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorArchivo);
    expect((error as Error).message).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
    expect(subir).not.toHaveBeenCalled();

    await crear(subir, { exists: true, size: DIEZ_MB }).subirArchivo('/foto', 'foto', archivo);
    expect(subir).toHaveBeenCalledTimes(1);
  });

  it('si no se puede leer la información del archivo, no bloquea: deja que el servidor decida', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(200, '{}'));
    const cliente = crearClienteApi({
      baseUrl: 'https://api.test',
      obtenerToken: () => 't',
      subirImpl: subir,
      infoImpl: jest.fn().mockRejectedValue(new Error('content:// no soportado')),
    });
    await cliente.subirArchivo('/foto', 'foto', archivo);
    expect(subir).toHaveBeenCalledTimes(1);
  });

  it('por defecto usa createUploadTask de expo-file-system y su cancelAsync al agotarse el tiempo', async () => {
    jest.useFakeTimers();
    const cancelAsync = jest.fn().mockResolvedValue(undefined);
    mockGetInfo.mockResolvedValue({ exists: true, size: 500 });
    mockCrearTarea.mockReturnValue({
      uploadAsync: () => new Promise(() => undefined),
      cancelAsync,
    });
    const cliente = crearClienteApi({ baseUrl: 'https://api.test', obtenerToken: () => 'tk' });

    const promesa = cliente.subirArchivo('/inmuebles/i1/foto-portada', 'foto', archivo).then(
      () => 'resuelta',
      (e: unknown) => e,
    );
    await jest.advanceTimersByTimeAsync(TIMEOUT_SUBIDA_MS);

    expect(mockCrearTarea).toHaveBeenCalledWith(
      'https://api.test/inmuebles/i1/foto-portada',
      archivo.uri,
      expect.objectContaining({ uploadType: MULTIPART, fieldName: 'foto' }),
    );
    expect(cancelAsync).toHaveBeenCalledTimes(1);
    await expect(promesa).resolves.toBeInstanceOf(ErrorTimeout);
  });

  it('por defecto devuelve el JSON de la respuesta del cargador nativo', async () => {
    mockGetInfo.mockResolvedValue({ exists: true, size: 500 });
    mockCrearTarea.mockReturnValue({
      uploadAsync: () => Promise.resolve({ status: 200, body: '{"id":"i1"}', mimeType: null }),
      cancelAsync: jest.fn(),
    });
    const cliente = crearClienteApi({ baseUrl: 'https://api.test', obtenerToken: () => null });
    await expect(cliente.subirArchivo('/x', 'foto', archivo)).resolves.toEqual({ id: 'i1' });
  });
});

describe('causa del fallo (sanearCausa) en las peticiones normales', () => {
  it('un fetch que falla deja nombre y mensaje del error original', async () => {
    const cliente = crearClienteApi({
      baseUrl: 'https://api.test',
      fetchImpl: jest.fn().mockRejectedValue(new TypeError('Network request failed')),
    });
    const error = await cliente.get('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorSinConexion);
    expect((error as ErrorSinConexion).causa).toBe('TypeError: Network request failed');
  });
});

describe('sanearCausa', () => {
  it('quita URLs de cualquier esquema', () => {
    const causa = sanearCausa(
      'fallo en https://api.rentcheck.app/inmuebles/1 y file:///data/user/0/app/cache/f.jpg y content://media/1',
    );
    expect(causa).not.toMatch(/https?:|file:|content:|rentcheck\.app|media\/1/);
  });

  it('quita tokens Bearer y JWT sueltos', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.firma-secreta_123';
    const causa = sanearCausa(`Authorization: Bearer abc.def-ghi y ${jwt}`);
    expect(causa).not.toMatch(/Bearer|abc\.def|eyJ|firma-secreta/);
  });

  it('quita rutas del teléfono y de Windows', () => {
    const causa = sanearCausa(
      'no se pudo abrir /data/user/0/host.exp.exponent/cache/ImagePicker/x.jpg o C:\\Users\\jesus\\foto.jpg',
    );
    expect(causa).not.toMatch(/\/data\/user|ImagePicker|C:\\|jesus/);
  });

  it('conserva el texto útil y recorta a 120 caracteres', () => {
    expect(sanearCausa(new Error('Network request failed'))).toBe('Error: Network request failed');
    expect(sanearCausa('x'.repeat(500))?.length).toBe(120);
  });

  it('sin causa útil devuelve undefined', () => {
    expect(sanearCausa(undefined)).toBeUndefined();
    expect(sanearCausa(42)).toBeUndefined();
    expect(sanearCausa('   ')).toBeUndefined();
  });

  it('ErrorSinConexion y ErrorTimeout guardan la causa ya saneada', () => {
    const sinConexion = new ErrorSinConexion(
      'https://api.test Bearer secreta C:\\Users\\me\\foto.jpg',
    );
    expect(sinConexion.causa).not.toMatch(/https?:|Bearer|secreta|C:\\Users/);
    expect(new ErrorTimeout('se cortó en /data/user/0/x/y').causa).not.toMatch(/\/data\/user/);
    expect(new ErrorSinConexion().causa).toBeUndefined();
  });
});

describe('detalleTecnico', () => {
  const api = (status: number, codigo: string | null) =>
    new ErrorApi({ status, codigo, mensaje: 'texto del servidor' });

  it('errores del servidor: estado y código', () => {
    expect(detalleTecnico(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(
      'HTTP 413 · CARGA_DEMASIADO_GRANDE',
    );
    expect(detalleTecnico(api(415, 'ERROR_415'))).toBe('HTTP 415 · ERROR_415');
    expect(detalleTecnico(api(502, null))).toBe('HTTP 502');
  });

  it('tiempo agotado y sin respuesta', () => {
    expect(detalleTecnico(new ErrorTimeout())).toBe('Tiempo agotado');
    expect(detalleTecnico(new ErrorSinConexion())).toBe('Sin respuesta');
    expect(detalleTecnico(new ErrorSinConexion(new Error('Network request failed')))).toBe(
      'Sin respuesta · Error: Network request failed',
    );
  });

  it('foto ilegible o demasiado grande', () => {
    expect(detalleTecnico(new ErrorArchivo('ilegible'))).toBe('Archivo no legible');
    expect(detalleTecnico(new ErrorArchivo('grande'))).toBe('Archivo demasiado grande');
  });

  it('un error desconocido no aporta detalle', () => {
    expect(detalleTecnico(new Error('boom'))).toBeNull();
    expect(detalleTecnico('x')).toBeNull();
  });

  it('nunca incluye URLs, tokens ni rutas', () => {
    const detalle = detalleTecnico(
      new ErrorSinConexion('https://api.test/x Bearer abc /data/user/0/a/b C:\\Users\\me\\f.jpg'),
    );
    expect(detalle).not.toMatch(/https?:|Bearer|abc|\/data\/user|C:\\/);
  });
});

describe('mensajeDeErrorFoto', () => {
  it('sin respuesta al subir: no afirma que falte internet', () => {
    expect(mensajeDeErrorFoto(new ErrorSinConexion())).toBe(
      'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(mensajeDeErrorFoto(new ErrorSinConexion())).not.toContain('No hay conexión a internet');
  });

  it('foto ilegible o demasiado grande: el texto que se detectó antes de subir', () => {
    expect(mensajeDeErrorFoto(new ErrorArchivo('ilegible'))).toBe(
      'No pudimos leer la foto. Elígela de nuevo.',
    );
    expect(mensajeDeErrorFoto(new ErrorArchivo('grande'))).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
  });

  it('los demás mensajes no cambian (415, 413, 401, tiempo agotado)', () => {
    const api = (status: number, codigo: string) => new ErrorApi({ status, codigo, mensaje: '' });
    expect(mensajeDeErrorFoto(api(415, 'ERROR_415'))).toBe(
      'Esa foto no es válida. Usa una imagen JPG o PNG.',
    );
    expect(mensajeDeErrorFoto(api(413, 'CARGA_DEMASIADO_GRANDE'))).toContain('demasiado grande');
    expect(mensajeDeErrorFoto(api(401, 'NO_AUTENTICADO'))).toBe(
      'Credenciales inválidas. Revisa tu correo y tu contraseña.',
    );
    expect(mensajeDeErrorFoto(new ErrorTimeout())).toBe(
      'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
    );
  });
});
