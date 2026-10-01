import {
  crearClienteApi,
  ErrorApi,
  ErrorSinConexion,
  ErrorTimeout,
  TIMEOUT_PETICION_MS,
  TIMEOUT_PRIMERA_PETICION_MS,
} from '../cliente';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function respuesta(status: number, cuerpo?: unknown, textoCrudo?: string): Response {
  const texto = textoCrudo ?? (cuerpo === undefined ? '' : JSON.stringify(cuerpo));
  return new Response(status === 204 ? null : texto, {
    status,
    headers: { 'Content-Type': textoCrudo === undefined ? 'application/json' : 'text/html' },
  });
}

/** Un fetch que nunca responde y se cancela cuando se aborta la señal, como el real. */
function fetchColgado(): FetchMock {
  return jest.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolver, rechazar) => {
      init?.signal?.addEventListener('abort', () => {
        rechazar(new DOMException('Aborted', 'AbortError'));
      });
    });
  });
}

const BASE = 'https://api.prueba.test';

function crear(fetchImpl: FetchMock, extra: Partial<Parameters<typeof crearClienteApi>[0]> = {}) {
  return crearClienteApi({ baseUrl: BASE, fetchImpl, ...extra });
}

describe('cliente de API', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('peticiones correctas', () => {
    it('hace GET contra la URL base y devuelve el JSON', async () => {
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, { ok: true }));
      const cliente = crear(fetchImpl);

      await expect(cliente.get('/auth/capacidades')).resolves.toEqual({ ok: true });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe(`${BASE}/auth/capacidades`);
      expect(init?.method).toBe('GET');
      expect(new Headers(init?.headers).get('Authorization')).toBeNull();
    });

    it('envía el token que devuelve la función inyectada', async () => {
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, {}));
      const cliente = crear(fetchImpl, { obtenerToken: () => 'token-de-prueba' });

      await cliente.get('/contratos');

      const [, init] = fetchImpl.mock.calls[0];
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-de-prueba');
    });

    it('acepta una función de token asíncrona', async () => {
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(200, {}));
      const cliente = crear(fetchImpl, { obtenerToken: async () => 'abc' });

      await cliente.get('/contratos');

      const [, init] = fetchImpl.mock.calls[0];
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer abc');
    });

    it('envía el cuerpo como JSON en un POST', async () => {
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(201, { id: '1' }));
      const cliente = crear(fetchImpl);

      await expect(cliente.post('/pagos', { monto_centavos: 125_000_000 })).resolves.toEqual({
        id: '1',
      });

      const [, init] = fetchImpl.mock.calls[0];
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ monto_centavos: 125_000_000 }));
      expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    });

    it('devuelve undefined en un 204', async () => {
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(204));
      await expect(crear(fetchImpl).get('/algo')).resolves.toBeUndefined();
    });

    it('devuelve el texto cuando la respuesta correcta no es JSON', async () => {
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValue(respuesta(200, undefined, 'Hello World!'));
      await expect(crear(fetchImpl).get('/')).resolves.toBe('Hello World!');
    });
  });

  describe('errores de la API', () => {
    it('error con código: ErrorApi con status, codigo y mensaje del cuerpo', async () => {
      const cuerpo = {
        statusCode: 409,
        codigo: 'CONTRATO_NO_ACTIVO',
        mensaje: 'El contrato no está activo.',
        message: 'El contrato no está activo.',
      };
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(409, cuerpo));

      const error = await crear(fetchImpl)
        .get('/contratos/1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorApi);
      const errorApi = error as ErrorApi;
      expect(errorApi.status).toBe(409);
      expect(errorApi.codigo).toBe('CONTRATO_NO_ACTIVO');
      expect(errorApi.mensaje).toBe('El contrato no está activo.');
      expect(errorApi.detalles).toBeUndefined();
    });

    it('conserva los detalles de validación', async () => {
      const cuerpo = {
        statusCode: 400,
        codigo: 'VALIDACION',
        mensaje: 'Los datos enviados no son válidos.',
        detalles: ['El código debe tener 6 dígitos.'],
        message: 'Los datos enviados no son válidos.',
      };
      const fetchImpl: FetchMock = jest.fn().mockResolvedValue(respuesta(400, cuerpo));

      const error = (await crear(fetchImpl)
        .post('/auth/verificar-correo', {})
        .catch((e: unknown) => e)) as ErrorApi;

      expect(error.codigo).toBe('VALIDACION');
      expect(error.detalles).toEqual(['El código debe tener 6 dígitos.']);
    });

    it('error sin código (JSON sin "codigo"): codigo null y mensaje de "message"', async () => {
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValue(respuesta(500, { statusCode: 500, message: 'Algo falló' }));

      const error = (await crear(fetchImpl)
        .get('/x')
        .catch((e: unknown) => e)) as ErrorApi;

      expect(error).toBeInstanceOf(ErrorApi);
      expect(error.status).toBe(500);
      expect(error.codigo).toBeNull();
      expect(error.mensaje).toBe('Algo falló');
    });

    it('error sin código (cuerpo que no es JSON, como un 502 del proxy)', async () => {
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValue(respuesta(502, undefined, '<html>Bad gateway</html>'));

      const error = (await crear(fetchImpl)
        .get('/x')
        .catch((e: unknown) => e)) as ErrorApi;

      expect(error).toBeInstanceOf(ErrorApi);
      expect(error.status).toBe(502);
      expect(error.codigo).toBeNull();
      expect(error.mensaje).toBe('');
    });

    it('no reintenta un 401 (el reintento llega en E2)', async () => {
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValue(
          respuesta(401, { statusCode: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Unauthorized' }),
        );

      const error = (await crear(fetchImpl)
        .get('/contratos')
        .catch((e: unknown) => e)) as ErrorApi;

      expect(error.status).toBe(401);
      expect(error.codigo).toBe('NO_AUTENTICADO');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });

  describe('sin conexión', () => {
    it('un fallo de red es ErrorSinConexion', async () => {
      const fetchImpl: FetchMock = jest
        .fn()
        .mockRejectedValue(new TypeError('Network request failed'));

      await expect(crear(fetchImpl).get('/x')).rejects.toBeInstanceOf(ErrorSinConexion);
    });
  });

  describe('tiempo de espera', () => {
    it('usa 60 s en la primera petición y 20 s en las siguientes', () => {
      expect(TIMEOUT_PRIMERA_PETICION_MS).toBe(60_000);
      expect(TIMEOUT_PETICION_MS).toBe(20_000);
    });

    it('la primera petición espera 60 s y luego es ErrorTimeout', async () => {
      jest.useFakeTimers();
      const fetchImpl = fetchColgado();
      const cliente = crear(fetchImpl);

      const resultado = cliente.get('/x').then(
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

    it('tras una respuesta, la siguiente petición espera solo 20 s', async () => {
      jest.useFakeTimers();
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValueOnce(respuesta(200, {}))
        .mockImplementation(fetchColgado());
      const cliente = crear(fetchImpl);

      await cliente.get('/primera');

      const segunda = cliente.get('/segunda').then(
        () => 'resuelta',
        (e: unknown) => e,
      );
      await jest.advanceTimersByTimeAsync(19_999);
      let pendiente = true;
      void segunda.then(() => {
        pendiente = false;
      });
      await Promise.resolve();
      expect(pendiente).toBe(true);

      await jest.advanceTimersByTimeAsync(1);
      await expect(segunda).resolves.toBeInstanceOf(ErrorTimeout);
    });

    it('un error de la API también cuenta como servidor despierto (20 s después)', async () => {
      jest.useFakeTimers();
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValueOnce(respuesta(404, { codigo: 'NO_ENCONTRADO', mensaje: 'x' }))
        .mockImplementation(fetchColgado());
      const cliente = crear(fetchImpl);

      await cliente.get('/nada').catch(() => undefined);

      const segunda = cliente.get('/otra').then(
        () => 'resuelta',
        (e: unknown) => e,
      );
      await jest.advanceTimersByTimeAsync(20_000);
      await expect(segunda).resolves.toBeInstanceOf(ErrorTimeout);
    });

    it('si el primer intento agota el tiempo, el siguiente sigue siendo "primera" (60 s)', async () => {
      jest.useFakeTimers();
      const fetchImpl = fetchColgado();
      const cliente = crear(fetchImpl);

      const primera = cliente.get('/x').catch((e: unknown) => e);
      await jest.advanceTimersByTimeAsync(60_000);
      await expect(primera).resolves.toBeInstanceOf(ErrorTimeout);

      const segunda = cliente.get('/x').then(
        () => 'resuelta',
        (e: unknown) => e,
      );
      await jest.advanceTimersByTimeAsync(20_000);
      let pendiente = true;
      void segunda.then(() => {
        pendiente = false;
      });
      await Promise.resolve();
      expect(pendiente).toBe(true);

      await jest.advanceTimersByTimeAsync(40_000);
      await expect(segunda).resolves.toBeInstanceOf(ErrorTimeout);
    });

    it('tras más de 10 minutos sin respuestas vuelve a esperar 60 s (Render durmió)', async () => {
      jest.useFakeTimers();
      let ahora = 1_000_000;
      const fetchImpl: FetchMock = jest
        .fn()
        .mockResolvedValueOnce(respuesta(200, {}))
        .mockImplementation(fetchColgado());
      const cliente = crear(fetchImpl, { ahora: () => ahora });

      await cliente.get('/primera');
      ahora += 10 * 60_000 + 1;

      const siguiente = cliente.get('/despues').then(
        () => 'resuelta',
        (e: unknown) => e,
      );
      await jest.advanceTimersByTimeAsync(20_000);
      let pendiente = true;
      void siguiente.then(() => {
        pendiente = false;
      });
      await Promise.resolve();
      expect(pendiente).toBe(true);

      await jest.advanceTimersByTimeAsync(40_000);
      await expect(siguiente).resolves.toBeInstanceOf(ErrorTimeout);
    });
  });

  it('los errores propios se pueden distinguir por clase', () => {
    expect(new ErrorTimeout()).toBeInstanceOf(Error);
    expect(new ErrorSinConexion()).toBeInstanceOf(Error);
    expect(new ErrorTimeout()).not.toBeInstanceOf(ErrorSinConexion);
    expect(new ErrorApi({ status: 400, codigo: null, mensaje: '' })).toBeInstanceOf(Error);
  });
});
