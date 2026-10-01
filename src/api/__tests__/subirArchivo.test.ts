import {
  crearClienteApi,
  ErrorApi,
  ErrorSinConexion,
  ErrorTimeout,
  TIMEOUT_SUBIDA_MS,
} from '../cliente';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

const BASE = 'https://api.prueba.test';
const ARCHIVO = { uri: 'file:///cache/foto.jpg', name: 'portada.jpg', type: 'image/jpeg' };

function respuesta(status: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? '' : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchColgado(): FetchMock {
  return jest.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolver, rechazar) => {
      init?.signal?.addEventListener('abort', () => {
        rechazar(new DOMException('Aborted', 'AbortError'));
      });
    });
  });
}

function crear(fetchImpl: FetchMock, extra: Partial<Parameters<typeof crearClienteApi>[0]> = {}) {
  return crearClienteApi({ baseUrl: BASE, fetchImpl, ...extra });
}

/**
 * Lo que se añade al FormData. En Jest el FormData es el de Node (no el de React Native, que acepta
 * { uri, name, type } como archivo), así que se espía FormData.append y se comprueba el valor que recibe.
 */
let anexados: [string, unknown][] = [];
beforeEach(() => {
  anexados = [];
  jest.spyOn(FormData.prototype, 'append').mockImplementation(((nombre: string, valor: unknown) => {
    anexados.push([nombre, valor]);
  }) as typeof FormData.prototype.append);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('subirArchivo (multipart)', () => {
  it('hace POST a la ruta con un FormData que lleva el archivo en el campo indicado', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, { id: 'i1' }));
    const cliente = crear(fetchImpl);

    await expect(
      cliente.subirArchivo('/inmuebles/i1/foto-portada', 'foto', ARCHIVO),
    ).resolves.toEqual({ id: 'i1' });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}/inmuebles/i1/foto-portada`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
    expect(anexados).toEqual([['foto', ARCHIVO]]);
  });

  it('NO fija Content-Type (fetch calcula el boundary) y sí manda Accept y el token', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, {}));
    const cliente = crear(fetchImpl, { obtenerToken: () => 'token-de-prueba' });

    await cliente.subirArchivo('/x', 'foto', ARCHIVO);

    const encabezados = new Headers(fetchImpl.mock.calls[0][1]?.headers);
    expect(encabezados.get('Content-Type')).toBeNull();
    expect(encabezados.get('Accept')).toBe('application/json');
    expect(encabezados.get('Authorization')).toBe('Bearer token-de-prueba');
  });

  it('agrega los campos extra como texto', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, {}));
    const cliente = crear(fetchImpl);

    await cliente.subirArchivo('/x', 'foto', ARCHIVO, { nota: 'hola' });

    expect(anexados).toEqual([
      ['nota', 'hola'],
      ['foto', ARCHIVO],
    ]);
  });

  it('espera 60 s aunque el servidor ya esté despierto, y luego es ErrorTimeout', async () => {
    jest.useFakeTimers();
    const fetchImpl: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(respuesta(200, {}))
      .mockImplementation(fetchColgado());
    const cliente = crear(fetchImpl);
    await cliente.get('/despierta');

    expect(TIMEOUT_SUBIDA_MS).toBe(60_000);
    const resultado = cliente.subirArchivo('/x', 'foto', ARCHIVO).then(
      () => 'resuelta',
      (e: unknown) => e,
    );
    await jest.advanceTimersByTimeAsync(59_999);
    let pendiente = true;
    void resultado.then(() => {
      pendiente = false;
    });
    await Promise.resolve();
    expect(pendiente).toBe(true);

    await jest.advanceTimersByTimeAsync(1);
    await expect(resultado).resolves.toBeInstanceOf(ErrorTimeout);
  });

  it('un fallo de red es ErrorSinConexion', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    await expect(crear(fetchImpl).subirArchivo('/x', 'foto', ARCHIVO)).rejects.toBeInstanceOf(
      ErrorSinConexion,
    );
  });

  it('los errores del servidor son ErrorApi con status y código', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockResolvedValue(
        respuesta(415, { statusCode: 415, codigo: 'ARCHIVO_CONTENIDO_INVALIDO', mensaje: 'no' }),
      );
    const error = await crear(fetchImpl)
      .subirArchivo('/x', 'foto', ARCHIVO)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(415);
    expect((error as ErrorApi).codigo).toBe('ARCHIVO_CONTENIDO_INVALIDO');
  });

  it('un 401 con token avisa al manejador global con el token enviado; sin token no', async () => {
    const alRecibir401 = jest.fn();
    const fetchImpl: FetchMock = jest
      .fn()
      .mockResolvedValue(respuesta(401, { codigo: 'NO_AUTENTICADO', mensaje: 'x' }));

    await crear(fetchImpl, { obtenerToken: () => 'tok', alRecibir401 })
      .subirArchivo('/inmuebles/i1/foto-portada', 'foto', ARCHIVO)
      .catch(() => undefined);
    expect(alRecibir401).toHaveBeenCalledWith('tok');

    alRecibir401.mockClear();
    await crear(fetchImpl, { obtenerToken: () => null, alRecibir401 })
      .subirArchivo('/inmuebles/i1/foto-portada', 'foto', ARCHIVO)
      .catch(() => undefined);
    expect(alRecibir401).not.toHaveBeenCalled();
  });
});
