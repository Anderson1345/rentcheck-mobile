// Pagos del inquilino (E7-A): idempotencia, reglas de período y monto, motivo de rechazo, API, preparación
// del comprobante (reducción de imágenes y PDF) y mensajes de error de archivo.
import { ErrorApi, ErrorArchivo, ErrorSinConexion, ErrorTimeout } from '../../api/cliente';
import { mensajeDeErrorFoto, mensajeDeErrorPago, MENSAJES_ERROR } from '../../api/errores';
import type { PeriodoCuenta } from '../../api/contratos';
import { listarMisPagos, reportarPago } from '../../api/pagos';
import {
  MENSAJE_ARCHIVO_GRANDE,
  MENSAJE_COMPROBANTE_NO_VALIDO,
  MENSAJE_FOTO_GRANDE,
} from '../../api/mensajesArchivo';
import { describirTamano, elegirPdf, prepararFoto } from '../../utilidades/comprobante';
import {
  FORMATO_CLAVE_IDEMPOTENCIA,
  generarClaveIdempotencia,
} from '../../utilidades/idempotencia';
import {
  AVISO_MAYOR,
  AVISO_PARCIAL,
  avisoDeMonto,
  BorradorIdempotente,
  montoSugerido,
  periodoInicial,
  periodosReportables,
  textoMotivoRechazo,
} from '../reglas';

const mockGet = jest.fn();
const mockSubir = jest.fn();
jest.mock('../../api/cliente', () => ({
  ...jest.requireActual('../../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));

const mockManipular = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...a: unknown[]) => mockManipular(...a) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));
const mockDocumento = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...a: unknown[]) => mockDocumento(...a),
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue([]);
  mockSubir.mockReset().mockResolvedValue({});
  mockManipular.mockReset();
  mockDocumento.mockReset();
});

// ---------------------------------------------------------------------------------------------
describe('generarClaveIdempotencia', () => {
  it('con crypto.randomUUID: es un UUID (36 caracteres) con el formato del servidor', () => {
    const clave = generarClaveIdempotencia({
      randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
    });
    expect(clave).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(clave).toMatch(FORMATO_CLAVE_IDEMPOTENCIA);
  });

  it('con getRandomValues: 32 caracteres [A-Za-z0-9_-]', () => {
    const clave = generarClaveIdempotencia({
      getRandomValues: <T extends ArrayBufferView>(arreglo: T): T => {
        const bytes = arreglo as unknown as Uint8Array;
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 37 + 11) % 256;
        return arreglo;
      },
    });
    expect(clave).toMatch(FORMATO_CLAVE_IDEMPOTENCIA);
    expect(clave).toHaveLength(32);
  });

  it('sin crypto: Date.now + aleatorio, mismo formato y entre 32 y 64 caracteres', () => {
    const clave = generarClaveIdempotencia(null);
    expect(clave).toMatch(FORMATO_CLAVE_IDEMPOTENCIA);
    expect(clave.length).toBeGreaterThanOrEqual(32);
    expect(clave.length).toBeLessThanOrEqual(64);
  });

  it('dos claves seguidas son distintas', () => {
    expect(generarClaveIdempotencia(null)).not.toBe(generarClaveIdempotencia(null));
  });

  it('el formato es el del servidor: 8 a 128 caracteres y nada fuera de [A-Za-z0-9_-]', () => {
    expect('abc 123'.match(FORMATO_CLAVE_IDEMPOTENCIA)).toBeNull();
    expect('a'.repeat(31).match(FORMATO_CLAVE_IDEMPOTENCIA)).toBeNull();
    expect('a'.repeat(65).match(FORMATO_CLAVE_IDEMPOTENCIA)).toBeNull();
  });
});

describe('BorradorIdempotente: una clave por borrador', () => {
  const contenido = {
    periodo: '2026-10-01',
    montoCentavos: 150_000_000,
    fechaReportada: '2026-10-05',
    archivoUri: 'file:///cache/a.pdf',
  };
  let n = 0;
  const generar = () => `clave-${(n += 1)}-${'x'.repeat(32)}`;
  beforeEach(() => {
    n = 0;
  });

  it('mismo contenido: misma clave (reintento tras un error de red o sin respuesta)', () => {
    const b = new BorradorIdempotente(generar);
    const primera = b.claveParaEnvio(contenido);
    expect(b.claveParaEnvio({ ...contenido })).toBe(primera);
    expect(b.claveParaEnvio({ ...contenido })).toBe(primera);
  });

  it.each([
    ['período', { periodo: '2026-11-01' }],
    ['monto', { montoCentavos: 140_000_000 }],
    ['fecha', { fechaReportada: '2026-10-06' }],
    ['archivo', { archivoUri: 'file:///cache/b.pdf' }],
  ])('cambia al cambiar el %s', (_campo, cambio) => {
    const b = new BorradorIdempotente(generar);
    const primera = b.claveParaEnvio(contenido);
    expect(b.claveParaEnvio({ ...contenido, ...cambio })).not.toBe(primera);
  });

  it('tras un envío exitoso (reiniciar) se genera una clave nueva aunque el contenido sea igual', () => {
    const b = new BorradorIdempotente(generar);
    const primera = b.claveParaEnvio(contenido);
    b.reiniciar();
    expect(b.claveParaEnvio(contenido)).not.toBe(primera);
  });
});

// ---------------------------------------------------------------------------------------------
const periodo = (extra: Partial<PeriodoCuenta> & { periodo: string }): PeriodoCuenta => ({
  fechaLimite: '2026-10-05T00:00:00.000Z',
  canonVigenteCentavos: 150_000_000,
  estado: 'VENCIDO',
  montoAprobadoCentavos: 0,
  ...extra,
});
const SEP = periodo({
  periodo: '2026-09-01T00:00:00.000Z',
  estado: 'PAGADO',
  montoAprobadoCentavos: 150_000_000,
});
const OCT = periodo({ periodo: '2026-10-01T00:00:00.000Z', estado: 'VENCIDO' });
const NOV = periodo({ periodo: '2026-11-01T00:00:00.000Z', estado: 'EN_REVISION' });
const DIC = periodo({ periodo: '2026-12-01T00:00:00.000Z', estado: 'PENDIENTE' });
const ENE = periodo({
  periodo: '2027-01-01T00:00:00.000Z',
  estado: 'PARCIAL',
  montoAprobadoCentavos: 50_000_000,
});
const TODOS = [SEP, OCT, NOV, DIC, ENE];

describe('periodosReportables', () => {
  it('contrato ACTIVO: todo período que no esté PAGADO (incluye EN_REVISION)', () => {
    expect(periodosReportables(TODOS, 'ACTIVO').map((p) => p.periodo)).toEqual([
      OCT.periodo,
      NOV.periodo,
      DIC.periodo,
      ENE.periodo,
    ]);
  });

  it.each(['VENCIDO', 'TERMINADO_ANTICIPADAMENTE'] as const)(
    'contrato %s: solo VENCIDO o PARCIAL (el servidor exige período explícito)',
    (estado) => {
      expect(periodosReportables(TODOS, estado).map((p) => p.periodo)).toEqual([
        OCT.periodo,
        ENE.periodo,
      ]);
    },
  );

  it.each(['PROGRAMADO', 'CANCELADO'] as const)('contrato %s: ninguno', (estado) => {
    expect(periodosReportables(TODOS, estado)).toEqual([]);
  });
});

describe('periodoInicial', () => {
  it('el preferido (parámetro) si es reportable; acepta fecha ISO o AAAA-MM-DD', () => {
    expect(periodoInicial(TODOS, 'ACTIVO', ['2026-12-01'])?.periodo).toBe(DIC.periodo);
    expect(periodoInicial(TODOS, 'ACTIVO', ['2026-12-01T00:00:00.000Z'])?.periodo).toBe(
      DIC.periodo,
    );
  });

  it('salta los preferidos que no sirven y usa el siguiente (proximo_periodo del panel)', () => {
    expect(periodoInicial(TODOS, 'ACTIVO', ['2026-09-01', undefined, '2026-11-01'])?.periodo).toBe(
      NOV.periodo,
    );
  });

  it('sin preferido válido: el más antiguo reportable', () => {
    expect(periodoInicial([ENE, DIC, OCT], 'ACTIVO', [])?.periodo).toBe(OCT.periodo);
  });

  it('nada reportable: null', () => {
    expect(periodoInicial(TODOS, 'PROGRAMADO', ['2026-10-01'])).toBeNull();
    expect(periodoInicial([SEP], 'ACTIVO', [])).toBeNull();
  });
});

describe('monto: sugerido y avisos (el servidor no los valida)', () => {
  it('sugerido: canon menos lo ya aprobado', () => {
    expect(montoSugerido(OCT)).toBe(150_000_000);
    expect(montoSugerido(ENE)).toBe(100_000_000);
  });

  it('sin saldo pendiente cae al canon', () => {
    expect(
      montoSugerido(
        periodo({ periodo: '2026-10-01T00:00:00.000Z', montoAprobadoCentavos: 150_000_000 }),
      ),
    ).toBe(150_000_000);
  });

  it('menor al canon: aviso de pago parcial', () => {
    expect(avisoDeMonto(100_000_000, OCT)).toBe('parcial');
    expect(AVISO_PARCIAL).toBe(
      'Este monto es menor al canon: el período quedará como pago parcial al aprobarse.',
    );
  });

  it('mayor al canon: aviso de que no cubre otros meses', () => {
    expect(avisoDeMonto(200_000_000, OCT)).toBe('mayor');
    expect(AVISO_MAYOR).toBe(
      'Un monto mayor no cubre otros meses; cada período se reporta por separado.',
    );
  });

  it('igual al saldo pendiente: sin aviso (también en un período PARCIAL ya con abonos)', () => {
    expect(avisoDeMonto(150_000_000, OCT)).toBeNull();
    expect(avisoDeMonto(100_000_000, ENE)).toBeNull();
    expect(avisoDeMonto(null, OCT)).toBeNull();
  });
});

describe('textoMotivoRechazo', () => {
  it.each([
    ['MONTO_NO_COINCIDE', 'El monto no coincide'],
    ['PAGO_NO_VISIBLE', 'No se ve el pago'],
    ['COMPROBANTE_ILEGIBLE', 'El comprobante no se lee'],
  ] as const)('%s → "%s"', (motivo, texto) => {
    expect(textoMotivoRechazo(motivo, null)).toEqual({ motivo: texto, mensaje: null });
  });

  it('OTRO: solo el mensaje, sin texto de motivo', () => {
    expect(textoMotivoRechazo('OTRO', '  Foto borrosa ')).toEqual({
      motivo: null,
      mensaje: 'Foto borrosa',
    });
  });

  it('motivo y mensaje juntos', () => {
    expect(textoMotivoRechazo('MONTO_NO_COINCIDE', 'Faltan 50.000')).toEqual({
      motivo: 'El monto no coincide',
      mensaje: 'Faltan 50.000',
    });
  });

  it('rechazo anterior a B0.6-A1 (sin motivo ni mensaje): no inventa nada', () => {
    expect(textoMotivoRechazo(null, null)).toEqual({ motivo: null, mensaje: null });
    expect(textoMotivoRechazo(null, '   ')).toEqual({ motivo: null, mensaje: null });
  });
});

// ---------------------------------------------------------------------------------------------
describe('API de pagos del inquilino', () => {
  it('listarMisPagos: GET /pagos/mios?contratoId=', async () => {
    mockGet.mockResolvedValueOnce([{ id: 'p1' }]);
    await expect(listarMisPagos('c1')).resolves.toEqual([{ id: 'p1' }]);
    expect(mockGet).toHaveBeenCalledWith('/pagos/mios?contratoId=c1');
  });

  it('reportarPago: multipart con el campo "comprobante", los campos de texto y la cabecera', async () => {
    const archivo = { uri: 'file:///cache/a.jpg', name: 'comprobante.jpg', type: 'image/jpeg' };
    mockSubir.mockResolvedValueOnce({ id: 'p9' });
    await expect(
      reportarPago({
        contratoId: 'c1',
        periodo: '2026-10-01',
        montoCentavos: 150_000_000,
        fechaReportada: '2026-10-05',
        comprobante: archivo,
        claveIdempotencia: 'k'.repeat(32),
      }),
    ).resolves.toEqual({ id: 'p9' });
    expect(mockSubir).toHaveBeenCalledWith(
      '/pagos',
      'comprobante',
      archivo,
      {
        contratoId: 'c1',
        monto_centavos: '150000000',
        fecha_reportada: '2026-10-05',
        periodo: '2026-10-01',
      },
      { encabezados: { 'Idempotency-Key': 'k'.repeat(32) } },
    );
  });

  it('el período siempre se envía (la app no deja que el servidor elija)', async () => {
    await reportarPago({
      contratoId: 'c1',
      periodo: '2026-10-01',
      montoCentavos: 1,
      fechaReportada: '2026-10-05',
      comprobante: { uri: 'u', name: 'n', type: 'application/pdf' },
      claveIdempotencia: 'k'.repeat(32),
    });
    expect(mockSubir.mock.calls[0][3]).toHaveProperty('periodo', '2026-10-01');
  });
});

// ---------------------------------------------------------------------------------------------
describe('mensajes de error de archivo', () => {
  const api = (status: number, codigo: string | null) =>
    new ErrorApi({ status, codigo, mensaje: 'técnico' });

  it('comprobante: 415 dice que se admite foto JPG o PNG, o PDF', () => {
    const esperado = 'Ese archivo no es válido. Usa una foto JPG o PNG, o un PDF.';
    expect(MENSAJE_COMPROBANTE_NO_VALIDO).toBe(esperado);
    expect(mensajeDeErrorPago(api(415, 'ARCHIVO_CONTENIDO_INVALIDO'))).toBe(esperado);
    expect(mensajeDeErrorPago(api(415, 'ERROR_415'))).toBe(esperado);
  });

  it('comprobante: 413 y archivo demasiado grande', () => {
    expect(MENSAJE_ARCHIVO_GRANDE).toBe('El archivo es demasiado grande (máximo 10 MB).');
    expect(mensajeDeErrorPago(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(MENSAJE_ARCHIVO_GRANDE);
    expect(mensajeDeErrorPago(new ErrorArchivo('grande'))).toBe(MENSAJE_ARCHIVO_GRANDE);
  });

  it('los mensajes de FOTO de las demás pantallas no cambiaron', () => {
    expect(mensajeDeErrorFoto(api(415, 'ARCHIVO_CONTENIDO_INVALIDO'))).toBe(
      'Esa foto no es válida. Usa una imagen JPG o PNG.',
    );
    expect(mensajeDeErrorFoto(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(MENSAJE_FOTO_GRANDE);
    expect(MENSAJE_FOTO_GRANDE).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
    expect(MENSAJES_ERROR.ARCHIVO_CONTENIDO_INVALIDO).toContain('video MP4');
  });
});

describe('mensajeDeErrorPago: por código, en español', () => {
  const api = (status: number, codigo: string | null, detalles?: unknown) =>
    new ErrorApi({ status, codigo, mensaje: 'técnico', detalles });

  it.each([
    ['FECHA_REPORTADA_ANTERIOR_A_INICIO', 400],
    ['PERIODO_INVALIDO', 400],
    ['CONTRATO_NO_ACTIVO', 409],
    ['PERIODO_YA_PAGADO', 409],
    ['SIN_PERIODOS_PENDIENTES', 409],
    ['IDEMPOTENCY_KEY_INVALIDA', 400],
  ])('%s usa el diccionario', (codigo, status) => {
    const mensaje = mensajeDeErrorPago(api(status, codigo));
    expect(mensaje).toBe(MENSAJES_ERROR[codigo]);
    expect(mensaje).not.toMatch(/técnico/);
  });

  it('409 SOLICITUD_EN_PROCESO: se está procesando; espera y revisa Mis pagos', () => {
    expect(mensajeDeErrorPago(api(409, 'SOLICITUD_EN_PROCESO'))).toBe(
      'Tu pago se está procesando. Espera unos segundos y revisa Mis pagos.',
    );
  });

  it('422 IDEMPOTENCY_KEY_REUTILIZADA: revisa los datos y vuelve a enviar', () => {
    expect(mensajeDeErrorPago(api(422, 'IDEMPOTENCY_KEY_REUTILIZADA'))).toBe(
      'Los datos del pago cambiaron mientras se enviaba. Revísalos y vuelve a enviar.',
    );
  });

  it('404: no encontrado', () => {
    expect(mensajeDeErrorPago(api(404, 'NO_ENCONTRADO'))).toBe(MENSAJES_ERROR.NO_ENCONTRADO);
  });

  it('sin respuesta o tiempo agotado: se puede reintentar, no se duplica', () => {
    const texto = 'No sabemos si el pago se envió. Puedes volver a enviarlo: no se duplicará.';
    expect(mensajeDeErrorPago(new ErrorSinConexion())).toBe(texto);
    expect(mensajeDeErrorPago(new ErrorTimeout())).toBe(texto);
  });

  it('archivo ilegible o error desconocido', () => {
    expect(mensajeDeErrorPago(new ErrorArchivo('ilegible'))).toBe(
      'No pudimos leer el archivo. Elígelo de nuevo.',
    );
    expect(mensajeDeErrorPago(new Error('boom'))).toBe(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe('prepararFoto: reduce a 1600 px de ancho y JPEG 0.75', () => {
  function imagen(ancho: number) {
    const salida = jest
      .fn()
      .mockResolvedValue({ uri: 'file:///cache/salida.jpg', width: 1, height: 1 });
    const referencia = { width: ancho, height: 2000, saveAsync: salida };
    const contexto = {
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn().mockResolvedValue(referencia),
    };
    return { contexto, referencia, salida };
  }
  const foto = { uri: 'file:///cache/f.png', name: 'portada.png', type: 'image/png' as const };

  it('más ancha de 1600: redimensiona a 1600 y guarda JPEG con calidad 0.75', async () => {
    const primera = imagen(3000);
    const segunda = imagen(1600);
    mockManipular.mockReturnValueOnce(primera.contexto).mockReturnValueOnce(segunda.contexto);

    const resultado = await prepararFoto(foto);

    expect(mockManipular).toHaveBeenNthCalledWith(1, foto.uri);
    expect(mockManipular).toHaveBeenNthCalledWith(2, primera.referencia);
    expect(segunda.contexto.resize).toHaveBeenCalledWith({ width: 1600 });
    expect(segunda.salida).toHaveBeenCalledWith({ compress: 0.75, format: 'jpeg' });
    expect(resultado).toMatchObject({
      uri: 'file:///cache/salida.jpg',
      type: 'image/jpeg',
      name: 'comprobante.jpg',
    });
  });

  it('de 1600 px o menos: no se redimensiona, pero sí se vuelve a codificar como JPEG 0.75', async () => {
    const unica = imagen(1200);
    mockManipular.mockReturnValueOnce(unica.contexto);
    const resultado = await prepararFoto(foto);
    expect(unica.contexto.resize).not.toHaveBeenCalled();
    expect(unica.salida).toHaveBeenCalledWith({ compress: 0.75, format: 'jpeg' });
    expect(resultado.type).toBe('image/jpeg');
    expect(mockManipular).toHaveBeenCalledTimes(1);
  });
});

describe('elegirPdf', () => {
  const pdf = (extra: object = {}) => ({
    canceled: false,
    assets: [
      {
        name: 'recibo-de-pago.pdf',
        size: 250_000,
        uri: 'file:///cache/DocumentPicker/recibo.pdf',
        mimeType: 'application/pdf',
        lastModified: 1,
        ...extra,
      },
    ],
  });

  it('pide solo PDF y lo copia al caché (necesario para subir desde content:// en Android)', async () => {
    mockDocumento.mockResolvedValueOnce(pdf());
    await elegirPdf();
    expect(mockDocumento).toHaveBeenCalledWith({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
  });

  it('elegido: nombre fijo para el servidor y nombre visible del archivo', async () => {
    mockDocumento.mockResolvedValueOnce(pdf());
    await expect(elegirPdf()).resolves.toEqual({
      tipo: 'elegido',
      comprobante: {
        uri: 'file:///cache/DocumentPicker/recibo.pdf',
        name: 'comprobante.pdf',
        type: 'application/pdf',
        nombreVisible: 'recibo-de-pago.pdf',
        tamanoBytes: 250_000,
      },
    });
  });

  it('cancelado', async () => {
    mockDocumento.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(elegirPdf()).resolves.toEqual({ tipo: 'cancelado' });
  });

  it('archivo vacío', async () => {
    mockDocumento.mockResolvedValueOnce(pdf({ size: 0 }));
    await expect(elegirPdf()).resolves.toEqual({ tipo: 'vacio' });
  });

  it('más de 10 MB', async () => {
    mockDocumento.mockResolvedValueOnce(pdf({ size: 10 * 1024 * 1024 + 1 }));
    await expect(elegirPdf()).resolves.toEqual({ tipo: 'grande' });
  });

  it('tamaño desconocido: lo decide el servidor', async () => {
    mockDocumento.mockResolvedValueOnce(pdf({ size: undefined }));
    const r = await elegirPdf();
    expect(r.tipo).toBe('elegido');
  });

  it('que no sea PDF', async () => {
    mockDocumento.mockResolvedValueOnce(pdf({ mimeType: 'image/gif' }));
    await expect(elegirPdf()).resolves.toEqual({ tipo: 'formato' });
  });

  it('un fallo del selector no lanza', async () => {
    mockDocumento.mockRejectedValueOnce(new Error('boom'));
    await expect(elegirPdf()).resolves.toEqual({ tipo: 'error' });
  });
});

describe('describirTamano', () => {
  it('B, KB y MB con coma decimal', () => {
    expect(describirTamano(800)).toBe('800 B');
    expect(describirTamano(250_000)).toBe('244 KB');
    expect(describirTamano(2_621_440)).toBe('2,5 MB');
  });
});
