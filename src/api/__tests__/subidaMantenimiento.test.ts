// subirArchivo generalizado (E8-A): límite de tamaño y plazo por llamada, progreso, cancelación por la
// persona y envío sin archivo. Lo que ya hacía por defecto (E3, E4-B, E7-A) no cambia: eso lo cubren
// subidaNativaE3a.test.ts y las pruebas de pagos, que siguen sin tocarse.
import {
  crearClienteApi,
  ErrorApi,
  ErrorArchivo,
  ErrorCancelado,
  ErrorSinConexion,
  ErrorTimeout,
  TIMEOUT_SUBIDA_MS,
  TIMEOUT_SUBIDA_VIDEO_MS,
} from '../cliente';

const mockCrearTarea = jest.fn();
const mockGetInfo = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  createUploadTask: (...a: unknown[]) => mockCrearTarea(...a),
  getInfoAsync: (...a: unknown[]) => mockGetInfo(...a),
}));

const MB = 1024 * 1024;
const video = { uri: 'file:///cache/clip.mp4', name: 'video.mp4', type: 'video/mp4' };
const resultado = (status: number, body: string) => ({ status, body });
const CLAVE = 'k'.repeat(32);

function crear(subir: jest.Mock, tamano = 5 * MB) {
  return crearClienteApi({
    baseUrl: 'https://api.test',
    obtenerToken: () => 'tk',
    subirImpl: subir,
    infoImpl: jest.fn().mockResolvedValue({ exists: true, size: tamano }),
  });
}

afterEach(() => {
  jest.useRealTimers();
  mockCrearTarea.mockReset();
  mockGetInfo.mockReset();
});

describe('el comportamiento por defecto no cambió', () => {
  it('sin opciones nuevas llama al cargador con los cuatro argumentos de siempre (sin progreso)', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(201, '{}'));
    await crear(subir).subirArchivo('/x', 'foto', video);
    expect(subir.mock.calls[0]).toHaveLength(4);
  });

  it('el límite local sigue en 10 MB y el plazo en 60 s', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(201, '{}'));
    const error = await crear(subir, 11 * MB)
      .subirArchivo('/x', 'foto', video)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorArchivo);
    expect(subir).not.toHaveBeenCalled();
    expect(TIMEOUT_SUBIDA_MS).toBe(60_000);
  });
});

describe('límite de tamaño por llamada', () => {
  it('con un límite de 20 MB sube un archivo de 15 MB y bloquea uno de 21 MB', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(201, '{}'));
    await crear(subir, 15 * MB).subirArchivo('/x', 'adjunto', video, undefined, {
      tamanoMaximo: 20 * MB,
    });
    expect(subir).toHaveBeenCalledTimes(1);

    const error = await crear(subir, 21 * MB)
      .subirArchivo('/x', 'adjunto', video, undefined, { tamanoMaximo: 20 * MB })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorArchivo);
    expect(error).toMatchObject({ motivo: 'grande' });
    expect(subir).toHaveBeenCalledTimes(1);
  });

  it('los mensajes del error de archivo pueden ser propios de la llamada', async () => {
    const subir = jest.fn();
    const grande = await crear(subir, 30 * MB)
      .subirArchivo('/x', 'adjunto', video, undefined, {
        tamanoMaximo: 20 * MB,
        mensajes: { grande: 'Pesa demasiado.', ilegible: 'No se lee.' },
      })
      .catch((e: unknown) => e);
    expect((grande as Error).message).toBe('Pesa demasiado.');

    const ilegible = await crearClienteApi({
      baseUrl: 'https://api.test',
      obtenerToken: () => 'tk',
      subirImpl: subir,
      infoImpl: jest.fn().mockResolvedValue({ exists: false }),
    })
      .subirArchivo('/x', 'adjunto', video, undefined, { mensajes: { ilegible: 'No se lee.' } })
      .catch((e: unknown) => e);
    expect((ilegible as Error).message).toBe('No se lee.');
    expect(subir).not.toHaveBeenCalled();
  });
});

describe('plazo por llamada', () => {
  it('con 180 s de plazo, a los 60 s sigue esperando y a los 180 s cancela y lanza ErrorTimeout', async () => {
    jest.useFakeTimers();
    const cancelar = jest.fn().mockResolvedValue(undefined);
    const colgada = jest.fn(
      (_u: string, _i: string, _o: unknown, registrar?: (c: () => Promise<void>) => void) => {
        registrar?.(cancelar);
        return new Promise(() => undefined);
      },
    );
    const promesa = crear(colgada)
      .subirArchivo('/x', 'adjunto', video, undefined, { tiempo: TIMEOUT_SUBIDA_VIDEO_MS })
      .then(
        () => 'resuelta',
        (e: unknown) => e,
      );
    await jest.advanceTimersByTimeAsync(TIMEOUT_SUBIDA_MS + 1);
    expect(cancelar).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(TIMEOUT_SUBIDA_VIDEO_MS - TIMEOUT_SUBIDA_MS);

    expect(TIMEOUT_SUBIDA_VIDEO_MS).toBe(180_000);
    expect(cancelar).toHaveBeenCalledTimes(1);
    await expect(promesa).resolves.toBeInstanceOf(ErrorTimeout);
  });
});

describe('progreso de la subida', () => {
  it('se lo pasa al cargador y, con el cargador nativo, convierte los bytes enviados y totales', async () => {
    const alProgreso = jest.fn();
    const subir = jest.fn().mockResolvedValue(resultado(201, '{}'));
    await crear(subir).subirArchivo('/x', 'adjunto', video, undefined, { alProgreso });
    expect(subir.mock.calls[0][4]).toBe(alProgreso);

    mockGetInfo.mockResolvedValue({ exists: true, size: 500 });
    mockCrearTarea.mockImplementation(
      (
        _url: string,
        _uri: string,
        _opciones: unknown,
        callback?: (p: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void,
      ) => ({
        uploadAsync: async () => {
          callback?.({ totalBytesSent: 250, totalBytesExpectedToSend: 1000 });
          callback?.({ totalBytesSent: 1000, totalBytesExpectedToSend: 1000 });
          return { status: 201, body: '{"id":"s1"}', mimeType: null };
        },
        cancelAsync: jest.fn(),
      }),
    );
    const nativo = crearClienteApi({ baseUrl: 'https://api.test', obtenerToken: () => 'tk' });
    await expect(
      nativo.subirArchivo('/x', 'adjunto', video, undefined, { alProgreso }),
    ).resolves.toEqual({ id: 's1' });
    expect(alProgreso.mock.calls).toEqual([
      [250, 1000],
      [1000, 1000],
    ]);
  });

  it('sin progreso, el cargador nativo se crea sin callback (como antes)', async () => {
    mockGetInfo.mockResolvedValue({ exists: true, size: 500 });
    mockCrearTarea.mockReturnValue({
      uploadAsync: () => Promise.resolve({ status: 200, body: '{}', mimeType: null }),
      cancelAsync: jest.fn(),
    });
    await crearClienteApi({ baseUrl: 'https://api.test', obtenerToken: () => 'tk' }).subirArchivo(
      '/x',
      'foto',
      video,
    );
    expect(mockCrearTarea.mock.calls[0]).toHaveLength(3);
  });
});

describe('cancelación por la persona', () => {
  it('al cancelar aborta la subida nativa y lanza ErrorCancelado ("Envío cancelado"), no un error de red', async () => {
    const cancelar = jest.fn().mockResolvedValue(undefined);
    const colgada = jest.fn(
      (_u: string, _i: string, _o: unknown, registrar?: (c: () => Promise<void>) => void) => {
        registrar?.(cancelar);
        return new Promise(() => undefined);
      },
    );
    const controlador = new AbortController();
    const promesa = crear(colgada)
      .subirArchivo('/x', 'adjunto', video, undefined, { senal: controlador.signal })
      .then(
        () => 'resuelta',
        (e: unknown) => e,
      );
    await Promise.resolve();
    await new Promise<void>((r) => setTimeout(r, 0));
    controlador.abort();

    const error = await promesa;
    expect(error).toBeInstanceOf(ErrorCancelado);
    expect(error).not.toBeInstanceOf(ErrorSinConexion);
    expect(error).not.toBeInstanceOf(ErrorTimeout);
    expect((error as Error).message).toBe('Envío cancelado');
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('una señal ya cancelada no llega a subir nada', async () => {
    const subir = jest.fn();
    const controlador = new AbortController();
    controlador.abort();
    const error = await crear(subir)
      .subirArchivo('/x', 'adjunto', video, undefined, { senal: controlador.signal })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorCancelado);
    expect(subir).not.toHaveBeenCalled();
  });

  it('cancelar después de terminar no hace nada', async () => {
    const subir = jest.fn().mockResolvedValue(resultado(201, '{"id":"s1"}'));
    const controlador = new AbortController();
    await expect(
      crear(subir).subirArchivo('/x', 'adjunto', video, undefined, { senal: controlador.signal }),
    ).resolves.toEqual({ id: 's1' });
    expect(() => controlador.abort()).not.toThrow();
  });
});

describe('envío sin archivo (solo campos de texto, multipart)', () => {
  const campos = { unidadId: 'u1', descripcion: 'La llave gotea', urgencia: 'MEDIO' };

  function conFetch(respuesta: () => Promise<unknown>) {
    const fetchImpl = jest.fn(respuesta);
    const subir = jest.fn();
    const cliente = crearClienteApi({
      baseUrl: 'https://api.test',
      obtenerToken: () => 'tk',
      fetchImpl: fetchImpl as never,
      subirImpl: subir,
    });
    return { cliente, fetchImpl, subir };
  }
  const ok = (status: number, cuerpo: unknown) => () =>
    Promise.resolve({ status, text: () => Promise.resolve(JSON.stringify(cuerpo)) });

  it('manda un POST con los campos, Authorization, Accept e Idempotency-Key, sin Content-Type y sin cargador', async () => {
    const { cliente, fetchImpl, subir } = conFetch(ok(201, { id: 's1' }));
    await expect(
      cliente.subirArchivo('/solicitudes-mantenimiento', 'adjunto', null, campos, {
        encabezados: {
          'Idempotency-Key': CLAVE,
          Authorization: 'Bearer falso',
          'Content-Type': 'application/json',
        },
      }),
    ).resolves.toEqual({ id: 's1' });

    expect(subir).not.toHaveBeenCalled();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/solicitudes-mantenimiento');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer tk',
      'Idempotency-Key': CLAVE,
    });
    const cuerpo = init.body as FormData;
    expect(cuerpo.get('unidadId')).toBe('u1');
    expect(cuerpo.get('descripcion')).toBe('La llave gotea');
    expect(cuerpo.get('urgencia')).toBe('MEDIO');
    expect(cuerpo.get('adjunto')).toBeNull();
  });

  it('un error del servidor llega como ErrorApi con su código', async () => {
    const { cliente } = conFetch(
      ok(422, { statusCode: 422, codigo: 'IDEMPOTENCY_KEY_REUTILIZADA', mensaje: 'x' }),
    );
    const error = await cliente
      .subirArchivo('/solicitudes-mantenimiento', 'adjunto', null, campos)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 422, codigo: 'IDEMPOTENCY_KEY_REUTILIZADA' });
  });

  it('sin respuesta del servidor es ErrorSinConexion', async () => {
    const { cliente } = conFetch(() => Promise.reject(new TypeError('Network request failed')));
    const error = await cliente
      .subirArchivo('/solicitudes-mantenimiento', 'adjunto', null, campos)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorSinConexion);
  });

  it('cancelar aborta la petición y lanza ErrorCancelado', async () => {
    const controlador = new AbortController();
    const { cliente } = conFetch(
      () =>
        new Promise((_resolver, rechazar) => {
          controlador.signal.addEventListener('abort', () => rechazar(new Error('abortado')));
        }),
    );
    // la señal que ve el fetch es interna: se cancela por la señal de la persona
    const promesa = cliente
      .subirArchivo('/solicitudes-mantenimiento', 'adjunto', null, campos, {
        senal: controlador.signal,
      })
      .catch((e: unknown) => e);
    await new Promise<void>((r) => setTimeout(r, 0));
    controlador.abort();
    expect(await promesa).toBeInstanceOf(ErrorCancelado);
  });
});
