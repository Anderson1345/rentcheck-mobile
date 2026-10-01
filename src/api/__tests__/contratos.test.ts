import { crearClienteApi, ErrorApi, ErrorSinConexion, ErrorTimeout } from '../cliente';
import {
  crearContrato,
  listarContratos,
  listarInquilinos,
  obtenerContrato,
  TIMEOUT_CREAR_CONTRATO_MS,
} from '../contratos';
import { mensajeDeErrorContrato, pasoDeErrorContrato, detallesDeErrorContrato } from '../errores';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../cliente', () => ({
  ...jest.requireActual('../cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
  mockPost.mockReset().mockResolvedValue({});
});

describe('contratos de /contratos e /inquilinos', () => {
  it('crear: POST /contratos con tiempo de espera de 60 s y SIN Idempotency-Key', async () => {
    const cuerpo = { unidad_id: 'u1' } as never;
    await crearContrato(cuerpo);
    expect(mockPost).toHaveBeenCalledWith('/contratos', cuerpo, { tiempo: 60_000 });
    expect(TIMEOUT_CREAR_CONTRATO_MS).toBe(60_000);
    expect(JSON.stringify(mockPost.mock.calls[0])).not.toMatch(/idempotency/i);
  });

  it('lista, detalle e inquilinos', async () => {
    await listarContratos();
    expect(mockGet).toHaveBeenLastCalledWith('/contratos');
    await obtenerContrato('a/b');
    expect(mockGet).toHaveBeenLastCalledWith('/contratos/a%2Fb');
    await listarInquilinos();
    expect(mockGet).toHaveBeenLastCalledWith('/inquilinos');
  });
});

describe('cliente: opciones de tiempo en post', () => {
  const respuesta = () =>
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });

  afterEach(() => jest.useRealTimers());

  it('sin opciones, post funciona como siempre', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(respuesta());
    const { crearClienteApi: crear } = jest.requireActual('../cliente');
    const cliente = crear({ baseUrl: 'https://a.test', fetchImpl });
    await expect(cliente.post('/x', { a: 1 })).resolves.toEqual({});
    expect(fetchImpl.mock.calls[0][1].body).toBe('{"a":1}');
  });

  it('con { tiempo } espera ese plazo (aunque el servidor ya esté despierto)', async () => {
    const real = jest.requireActual('../cliente') as { crearClienteApi: typeof crearClienteApi };
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(respuesta())
      .mockImplementation(
        (_u: string, init?: RequestInit) =>
          new Promise((_r, rechazar) =>
            init?.signal?.addEventListener('abort', () => rechazar(new Error('abort'))),
          ),
      );
    const cliente = real.crearClienteApi({ baseUrl: 'https://a.test', fetchImpl });
    await cliente.get('/despierta');
    jest.useFakeTimers();
    const promesa = cliente.post('/x', {}, { tiempo: 60_000 }).then(
      () => 'ok',
      (e: unknown) => e,
    );
    await jest.advanceTimersByTimeAsync(59_999);
    let pendiente = true;
    void promesa.then(() => (pendiente = false));
    await Promise.resolve();
    expect(pendiente).toBe(true);
    await jest.advanceTimersByTimeAsync(1);
    await expect(promesa).resolves.toBeInstanceOf(ErrorTimeout);
  });
});

const api = (status: number, codigo: string | null, mensaje = '', detalles?: unknown) =>
  new ErrorApi({ status, codigo, mensaje, detalles });

describe('mensajeDeErrorContrato', () => {
  it('por código (diccionario)', () => {
    expect(mensajeDeErrorContrato(api(400, 'FECHA_FIN_PASADA'))).toBe(
      'La fecha de fin del contrato debe ser posterior a hoy.',
    );
    expect(mensajeDeErrorContrato(api(409, 'CEDULA_ARRENDADOR_REQUERIDA'))).toContain('cédula');
  });

  it('TRASLAPE_DE_CONTRATOS muestra las fechas del contrato con el que choca', () => {
    expect(
      mensajeDeErrorContrato(
        api(409, 'TRASLAPE_DE_CONTRATOS', 'x', {
          fecha_inicio: '2026-10-01T00:00:00.000Z',
          fecha_fin: '2027-09-30T00:00:00.000Z',
        }),
      ),
    ).toBe('Choca con el contrato del 01/10/2026 al 30/09/2027.');
  });

  it('TRASLAPE sin detalles: el mensaje del diccionario', () => {
    expect(mensajeDeErrorContrato(api(409, 'TRASLAPE_DE_CONTRATOS'))).toBe(
      'Las fechas se cruzan con otro contrato de esta unidad.',
    );
  });

  it('CONFLICTO y SOLICITUD_INVALIDA con texto: muestra el del servidor', () => {
    expect(
      mensajeDeErrorContrato(api(409, 'CONFLICTO', 'Esta unidad ya tiene un contrato activo')),
    ).toBe('Esta unidad ya tiene un contrato activo');
    expect(
      mensajeDeErrorContrato(
        api(
          400,
          'SOLICITUD_INVALIDA',
          'La cédula debe tener entre 5 y 20 caracteres alfanuméricos.',
        ),
      ),
    ).toBe('La cédula debe tener entre 5 y 20 caracteres alfanuméricos.');
  });

  it('CONFLICTO sin texto: el genérico de conflicto', () => {
    expect(mensajeDeErrorContrato(api(409, 'CONFLICTO'))).toContain('choca');
  });

  it('sin conexión y tiempo agotado: los mensajes generales', () => {
    expect(mensajeDeErrorContrato(new ErrorSinConexion())).toContain('conexión');
    expect(mensajeDeErrorContrato(new ErrorTimeout())).toContain('tardó');
  });

  it('detallesDeErrorContrato: lista de textos de VALIDACION', () => {
    expect(
      detallesDeErrorContrato(api(400, 'VALIDACION', '', ['dia_pago debe ser >= 1', 3])),
    ).toEqual(['dia_pago debe ser >= 1']);
    expect(detallesDeErrorContrato(api(400, 'VALIDACION'))).toEqual([]);
    expect(detallesDeErrorContrato(new Error('x'))).toEqual([]);
  });
});

describe('pasoDeErrorContrato: a qué paso lleva cada error', () => {
  it.each([
    [api(400, 'FECHA_FIN_PASADA'), 'fechas'],
    [api(409, 'TRASLAPE_DE_CONTRATOS'), 'fechas'],
    [api(409, 'CONFLICTO', 'Esta unidad ya tiene un contrato activo'), 'fechas'],
    [api(400, 'DEPOSITO_NO_PERMITIDO_VIVIENDA'), 'pago'],
    [api(400, 'INQUILINO_AMBIGUO'), 'inquilino'],
    [api(400, 'INQUILINO_REQUERIDO'), 'inquilino'],
    [api(400, 'INQUILINO_DATOS_INVALIDOS'), 'inquilino'],
    [api(400, 'SOLICITUD_INVALIDA', 'La cédula debe tener…'), 'inquilino'],
    [api(400, 'PLANTILLA_NO_CORRESPONDE_A_UNIDAD'), 'unidad'],
    [api(404, 'NO_ENCONTRADO'), 'unidad'],
    [api(409, 'CEDULA_ARRENDADOR_REQUERIDA'), 'cedula'],
    [api(400, 'VALIDACION'), null],
    [new ErrorSinConexion(), null],
  ])('%#', (error, paso) => {
    expect(pasoDeErrorContrato(error)).toBe(paso);
  });
});
