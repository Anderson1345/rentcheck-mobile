// Mantenimiento del inquilino (E8-A), lógica sin pantallas: borrador idempotente genérico, adjuntos
// (foto y video), reglas, API, mensajes de error y tipos del portal.
import {
  ErrorApi,
  ErrorArchivo,
  ErrorCancelado,
  ErrorSinConexion,
  ErrorTimeout,
} from '../../api/cliente';
import {
  esConflictoDeEstado,
  MENSAJE_GENERICO,
  mensajeDeError,
  mensajeDeErrorFoto,
  mensajeDeErrorPago,
  mensajeDeErrorSolicitud,
} from '../../api/errores';
import type { ContratoInquilinoDetalle, ContratoInquilinoResumen } from '../../api/inquilino';
import { BorradorIdempotente as BorradorDePagos } from '../../pagos/reglas';
import {
  describirDuracion,
  DURACION_MAXIMA_VIDEO_SEGUNDOS,
  elegirVideo,
  mensajeDeResultadoVideo,
  prepararAdjuntoFoto,
  TAMANO_MAXIMO_ADJUNTO_BYTES,
} from '../../utilidades/adjuntoSolicitud';
import { BorradorIdempotente } from '../../utilidades/borradorIdempotente';
import {
  contarSegmentos,
  FRASE_ESTADO,
  filtrarSegmento,
  MAXIMO_DESCRIPCION,
  OPCIONES_URGENCIA,
  puedeCrearSolicitud,
  segmentoDeEstado,
  textoSinCrear,
  URGENCIA_POR_DEFECTO,
  validarDescripcion,
} from '../reglas';

const mockPermiso = jest.fn();
const mockCamara = jest.fn();
const mockGaleria = jest.fn();
const mockPrepararFoto = jest.fn();
const mockGet = jest.fn();
const mockSubir = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPermiso(...a),
  launchCameraAsync: (...a: unknown[]) => mockCamara(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockGaleria(...a),
}));
jest.mock('../../utilidades/comprobante', () => ({
  ...jest.requireActual('../../utilidades/comprobante'),
  prepararFoto: (...a: unknown[]) => mockPrepararFoto(...a),
}));
jest.mock('../../api/cliente', () => ({
  ...jest.requireActual('../../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn() }));

const MB = 1024 * 1024;

beforeEach(() => {
  for (const m of [mockPermiso, mockCamara, mockGaleria, mockPrepararFoto, mockGet, mockSubir]) {
    m.mockReset();
  }
});

// ---------------------------------------------------------------------------------------------

describe('BorradorIdempotente genérico', () => {
  const nuevo = () => {
    let n = 0;
    return new BorradorIdempotente(() => `clave-${(n += 1)}`);
  };

  it('conserva la clave mientras el contenido no cambie, aunque se pida varias veces', () => {
    const b = nuevo();
    const primera = b.claveParaEnvio(['u1', 'La llave gotea', 'MEDIO'], 'file:///a.jpg');
    expect(b.claveParaEnvio(['u1', 'La llave gotea', 'MEDIO'], 'file:///a.jpg')).toBe(primera);
    expect(b.claveParaEnvio(['u1', 'La llave gotea', 'MEDIO'], 'file:///a.jpg')).toBe(primera);
  });

  it('cambia al cambiar cualquier campo o el adjunto (y al quitarlo)', () => {
    const b = nuevo();
    const base = b.claveParaEnvio(['u1', 'texto', 'MEDIO'], 'file:///a.jpg');
    const claves = new Set([
      base,
      b.claveParaEnvio(['u2', 'texto', 'MEDIO'], 'file:///a.jpg'),
      b.claveParaEnvio(['u2', 'otro texto', 'MEDIO'], 'file:///a.jpg'),
      b.claveParaEnvio(['u2', 'otro texto', 'ALTO'], 'file:///a.jpg'),
      b.claveParaEnvio(['u2', 'otro texto', 'ALTO'], 'file:///b.mp4'),
      b.claveParaEnvio(['u2', 'otro texto', 'ALTO'], null),
    ]);
    expect(claves.size).toBe(6);
  });

  it('volver a un contenido anterior NO recupera la clave vieja (es un borrador distinto)', () => {
    const b = nuevo();
    const primera = b.claveParaEnvio(['a'], null);
    b.claveParaEnvio(['b'], null);
    expect(b.claveParaEnvio(['a'], null)).not.toBe(primera);
  });

  it('tras un envío exitoso (reiniciar) el mismo contenido recibe una clave nueva', () => {
    const b = nuevo();
    const primera = b.claveParaEnvio(['a'], 'file:///a.jpg');
    b.reiniciar();
    expect(b.claveParaEnvio(['a'], 'file:///a.jpg')).not.toBe(primera);
  });

  it('un campo nulo no se confunde con uno vacío ni con otro valor', () => {
    const b = nuevo();
    const a = b.claveParaEnvio(['x', null], null);
    const c = b.claveParaEnvio(['x', ''], null);
    expect(a).not.toBe(c);
  });

  it('sin generador usa claves válidas para el servidor (32 a 64 caracteres)', () => {
    const clave = new BorradorIdempotente().claveParaEnvio(['a'], null);
    expect(clave).toMatch(/^[A-Za-z0-9_-]{32,64}$/);
  });

  it('el borrador de pagos sigue funcionando igual (usa este módulo por dentro)', () => {
    let n = 0;
    const pagos = new BorradorDePagos(() => `p-${(n += 1)}`);
    const contenido = {
      periodo: '2026-10-01',
      montoCentavos: 150_000_000,
      fechaReportada: '2026-10-06',
      archivoUri: 'file:///c.jpg',
    };
    const primera = pagos.claveParaEnvio(contenido);
    expect(pagos.claveParaEnvio({ ...contenido })).toBe(primera);
    expect(pagos.claveParaEnvio({ ...contenido, montoCentavos: 1 })).not.toBe(primera);
    pagos.reiniciar();
    expect(pagos.claveParaEnvio(contenido)).not.toBe(primera);
  });
});

// ---------------------------------------------------------------------------------------------

describe('adjuntos de la solicitud: foto', () => {
  it('prepararAdjuntoFoto reduce UNA vez y devuelve la foto reducida lista para subir', async () => {
    mockPrepararFoto.mockResolvedValue({
      uri: 'file:///cache/reducida.jpg',
      name: 'comprobante.jpg',
      type: 'image/jpeg',
      nombreVisible: 'comprobante.jpg',
    });
    const adjunto = await prepararAdjuntoFoto({
      uri: 'file:///cache/original.png',
      name: 'portada.png',
      type: 'image/png',
    });
    expect(mockPrepararFoto).toHaveBeenCalledTimes(1);
    expect(adjunto).toEqual({
      uri: 'file:///cache/reducida.jpg',
      name: 'foto.jpg',
      type: 'image/jpeg',
      tipo: 'IMAGEN',
      nombreVisible: 'foto.jpg',
    });
  });
});

describe('adjuntos de la solicitud: video', () => {
  const asset = (extra: Record<string, unknown> = {}) => ({
    uri: 'file:///cache/ImagePicker/clip.mp4',
    type: 'video',
    mimeType: 'video/mp4',
    fileName: 'clip.mp4',
    fileSize: 8 * MB,
    duration: 12_000,
    ...extra,
  });
  const elegido = (a: Record<string, unknown>) => ({ canceled: false, assets: [a] });

  it('los límites son los del servidor: 20 MB y clips de 30 s', () => {
    expect(TAMANO_MAXIMO_ADJUNTO_BYTES).toBe(20 * MB);
    expect(DURACION_MAXIMA_VIDEO_SEGUNDOS).toBe(30);
  });

  it('cámara: pide permiso, abre solo videos con tope de 30 s y devuelve uri, tamaño, duración y tipo', async () => {
    mockPermiso.mockResolvedValue({ granted: true, canAskAgain: true });
    mockCamara.mockResolvedValue(elegido(asset()));
    const resultado = await elegirVideo('camara');

    expect(mockPermiso).toHaveBeenCalledTimes(1);
    expect(mockCamara).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['videos'], videoMaxDuration: 30 }),
    );
    expect(resultado).toEqual({
      tipo: 'elegido',
      adjunto: {
        uri: 'file:///cache/ImagePicker/clip.mp4',
        name: 'video.mp4',
        type: 'video/mp4',
        tipo: 'VIDEO',
        nombreVisible: 'clip.mp4',
        tamanoBytes: 8 * MB,
        duracionMs: 12_000,
      },
    });
  });

  it('galería: no pide permiso y abre solo videos', async () => {
    mockGaleria.mockResolvedValue(elegido(asset()));
    const resultado = await elegirVideo('galeria');
    expect(mockPermiso).not.toHaveBeenCalled();
    expect(mockGaleria).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['videos'] }));
    expect(resultado.tipo).toBe('elegido');
  });

  it('permiso de cámara denegado: avisa (y distingue si se negó para siempre)', async () => {
    mockPermiso.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await elegirVideo('camara')).toEqual({ tipo: 'denegado', definitivo: false });
    mockPermiso.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await elegirVideo('camara')).toEqual({ tipo: 'denegado', definitivo: true });
    expect(mockCamara).not.toHaveBeenCalled();
  });

  it('cancelar el selector no es un error', async () => {
    mockGaleria.mockResolvedValue({ canceled: true, assets: null });
    expect(await elegirVideo('galeria')).toEqual({ tipo: 'cancelado' });
  });

  it('otro formato que no sea MP4 se rechaza: "Solo se admiten videos MP4."', async () => {
    mockGaleria.mockResolvedValue(
      elegido(asset({ mimeType: 'video/quicktime', fileName: 'a.mov' })),
    );
    const resultado = await elegirVideo('galeria');
    expect(resultado).toEqual({ tipo: 'formato' });
    expect(mensajeDeResultadoVideo(resultado)).toBe('Solo se admiten videos MP4.');
  });

  it('sin mimeType se decide por la extensión (.mp4 sí, .mov no)', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ mimeType: undefined, fileName: 'VIDEO.MP4' })));
    expect((await elegirVideo('galeria')).tipo).toBe('elegido');
    mockGaleria.mockResolvedValue(
      elegido(asset({ mimeType: undefined, fileName: undefined, uri: 'file:///cache/clip.mov' })),
    );
    expect((await elegirVideo('galeria')).tipo).toBe('formato');
  });

  it('más de 20 MB se BLOQUEA mostrando el tamaño real; justo 20 MB pasa', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ fileSize: 20 * MB + 1 })));
    const resultado = await elegirVideo('galeria');
    expect(resultado).toEqual({ tipo: 'grande', tamanoBytes: 20 * MB + 1 });
    const mensaje = mensajeDeResultadoVideo(resultado) ?? '';
    expect(mensaje).toContain('20,0 MB');
    expect(mensaje).toContain('máximo es 20 MB');
    expect(mensaje).toContain('más corto');

    mockGaleria.mockResolvedValue(elegido(asset({ fileSize: 20 * MB })));
    expect((await elegirVideo('galeria')).tipo).toBe('elegido');
  });

  it('si fileSize viene undefined lee el tamaño con el sistema de archivos', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ fileSize: undefined })));
    const leer = jest.fn().mockResolvedValue(25 * MB);
    expect(await elegirVideo('galeria', leer)).toEqual({ tipo: 'grande', tamanoBytes: 25 * MB });
    expect(leer).toHaveBeenCalledWith('file:///cache/ImagePicker/clip.mp4');

    leer.mockResolvedValue(3 * MB);
    const ok = await elegirVideo('galeria', leer);
    expect(ok).toMatchObject({ tipo: 'elegido', adjunto: { tamanoBytes: 3 * MB } });
  });

  it('si no se puede saber el tamaño no bloquea: el servidor decide', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ fileSize: undefined })));
    const resultado = await elegirVideo('galeria', jest.fn().mockResolvedValue(null));
    expect(resultado.tipo).toBe('elegido');
    expect(
      (resultado as { adjunto: { tamanoBytes?: number } }).adjunto.tamanoBytes,
    ).toBeUndefined();
  });

  it('un video vacío se rechaza y un fallo del selector no lanza', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ fileSize: 0 })));
    expect(await elegirVideo('galeria')).toEqual({ tipo: 'vacio' });
    mockGaleria.mockRejectedValue(new Error('boom'));
    expect(await elegirVideo('galeria')).toEqual({ tipo: 'error' });
  });

  it('el tipo declarado al servidor es siempre video/mp4 y nunca se re-codifica (la uri es la original)', async () => {
    mockGaleria.mockResolvedValue(elegido(asset({ mimeType: undefined, fileName: 'a.mp4' })));
    const resultado = await elegirVideo('galeria');
    expect(resultado).toMatchObject({
      adjunto: { type: 'video/mp4', uri: 'file:///cache/ImagePicker/clip.mp4' },
    });
  });

  it('duración legible', () => {
    expect(describirDuracion(12_000)).toBe('0:12');
    expect(describirDuracion(65_000)).toBe('1:05');
    expect(describirDuracion(undefined)).toBe('');
  });

  it('mensajes del selector: permiso, vacío y error', () => {
    expect(mensajeDeResultadoVideo({ tipo: 'denegado', definitivo: false })).toContain('permiso');
    expect(mensajeDeResultadoVideo({ tipo: 'denegado', definitivo: true })).toContain('ajustes');
    expect(mensajeDeResultadoVideo({ tipo: 'vacio' })).toContain('vacío');
    expect(mensajeDeResultadoVideo({ tipo: 'error' })).toContain('Inténtalo de nuevo');
    expect(mensajeDeResultadoVideo({ tipo: 'cancelado' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------

describe('reglas de la solicitud', () => {
  it('descripción: obligatoria, recortada y con tope', () => {
    expect(validarDescripcion('   ')).toEqual({ error: 'Describe el problema.' });
    expect(validarDescripcion('')).toEqual({ error: 'Describe el problema.' });
    expect(validarDescripcion('  La llave gotea  ')).toEqual({ valor: 'La llave gotea' });
    expect(validarDescripcion('a'.repeat(MAXIMO_DESCRIPCION))).toEqual({
      valor: 'a'.repeat(MAXIMO_DESCRIPCION),
    });
    expect(validarDescripcion('a'.repeat(MAXIMO_DESCRIPCION + 1))).toEqual({
      error: `La descripción puede tener hasta ${MAXIMO_DESCRIPCION} caracteres.`,
    });
    // El tope se cuenta después de recortar.
    expect(validarDescripcion(`  ${'a'.repeat(MAXIMO_DESCRIPCION)}  `)).toEqual({
      valor: 'a'.repeat(MAXIMO_DESCRIPCION),
    });
  });

  it('urgencia: tres niveles con una frase corta cada uno y MEDIO por defecto', () => {
    expect(OPCIONES_URGENCIA.map((o) => o.valor)).toEqual(['BAJO', 'MEDIO', 'ALTO']);
    expect(OPCIONES_URGENCIA.map((o) => o.etiqueta)).toEqual(['Baja', 'Media', 'Alta']);
    for (const o of OPCIONES_URGENCIA) expect(o.ayuda.length).toBeGreaterThan(5);
    expect(URGENCIA_POR_DEFECTO).toBe('MEDIO');
  });

  it('una frase por estado', () => {
    expect(FRASE_ESTADO).toEqual({
      PENDIENTE: 'El arrendador aún no la ha atendido',
      EN_PROCESO: 'El arrendador la está atendiendo',
      RESUELTO: 'El arrendador la marcó como resuelta',
    });
  });

  it('segmentos: abiertas (pendiente y en proceso) y resueltas, con contadores', () => {
    const lista = [
      { id: '1', estado: 'PENDIENTE' },
      { id: '2', estado: 'EN_PROCESO' },
      { id: '3', estado: 'RESUELTO' },
      { id: '4', estado: 'PENDIENTE' },
    ] as const;
    expect(segmentoDeEstado('PENDIENTE')).toBe('abiertas');
    expect(segmentoDeEstado('EN_PROCESO')).toBe('abiertas');
    expect(segmentoDeEstado('RESUELTO')).toBe('resueltas');
    expect(contarSegmentos(lista)).toEqual({ abiertas: 3, resueltas: 1 });
    expect(filtrarSegmento(lista, 'abiertas').map((s) => s.id)).toEqual(['1', '2', '4']);
    expect(filtrarSegmento(lista, 'resueltas').map((s) => s.id)).toEqual(['3']);
  });

  it('crear solo con contrato ACTIVO; con los demás, un texto que lo explica', () => {
    expect(puedeCrearSolicitud('ACTIVO')).toBe(true);
    for (const estado of [
      'PROGRAMADO',
      'VENCIDO',
      'TERMINADO_ANTICIPADAMENTE',
      'CANCELADO',
    ] as const) {
      expect(puedeCrearSolicitud(estado)).toBe(false);
    }
    expect(textoSinCrear('ACTIVO')).toBeNull();
    expect(textoSinCrear('PROGRAMADO')).toBe(
      'Podrás crear solicitudes cuando tu contrato esté activo.',
    );
    expect(textoSinCrear('VENCIDO')).toBe(
      'Tu contrato finalizó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.',
    );
    expect(textoSinCrear('TERMINADO_ANTICIPADAMENTE')).toBe(
      'Tu contrato terminó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.',
    );
  });
});

// ---------------------------------------------------------------------------------------------

describe('API de mantenimiento del inquilino', () => {
  // Importación diferida: el módulo usa el `api` simulado de arriba.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = () => require('../../api/mantenimiento') as typeof import('../../api/mantenimiento');

  it('listar usa /inquilino/solicitudes?contratoId= (nunca el alias /mias) y obtener, la ruta por id', async () => {
    mockGet.mockResolvedValue([]);
    await api().listarMisSolicitudes('c 1');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/solicitudes?contratoId=c%201');
    await api().obtenerMiSolicitud('s/1');
    expect(mockGet).toHaveBeenLastCalledWith('/inquilino/solicitudes/s%2F1');
    expect(JSON.stringify(mockGet.mock.calls)).not.toContain('mias');
  });

  const datos = (extra: Record<string, unknown> = {}) => ({
    unidadId: 'u1',
    descripcion: 'La llave gotea',
    urgencia: 'ALTO' as const,
    adjunto: null,
    claveIdempotencia: 'k'.repeat(32),
    ...extra,
  });

  it('crear manda multipart con los campos del DTO, la Idempotency-Key, 20 MB y el adjunto en "adjunto"', async () => {
    mockSubir.mockResolvedValue({ id: 's1' });
    const alProgreso = jest.fn();
    const senal = new AbortController().signal;
    const adjunto = {
      uri: 'file:///c.jpg',
      name: 'foto.jpg',
      type: 'image/jpeg',
      tipo: 'IMAGEN' as const,
      nombreVisible: 'foto.jpg',
    };
    await api().crearSolicitud(datos({ adjunto, alProgreso, senal }));
    expect(mockSubir).toHaveBeenCalledWith(
      '/solicitudes-mantenimiento',
      'adjunto',
      adjunto,
      { unidadId: 'u1', descripcion: 'La llave gotea', urgencia: 'ALTO' },
      expect.objectContaining({
        encabezados: { 'Idempotency-Key': 'k'.repeat(32) },
        tamanoMaximo: 20 * MB,
        alProgreso,
        senal,
      }),
    );
  });

  it('sin adjunto manda null; el plazo es el de siempre para fotos y de 180 s solo para video', async () => {
    mockSubir.mockResolvedValue({ id: 's1' });
    await api().crearSolicitud(datos());
    expect(mockSubir.mock.calls[0][2]).toBeNull();
    expect(mockSubir.mock.calls[0][4].tiempo).toBeUndefined();

    await api().crearSolicitud(
      datos({
        adjunto: {
          uri: 'f',
          name: 'foto.jpg',
          type: 'image/jpeg',
          tipo: 'IMAGEN',
          nombreVisible: 'f',
        },
      }),
    );
    expect(mockSubir.mock.calls[1][4].tiempo).toBeUndefined();

    await api().crearSolicitud(
      datos({
        adjunto: {
          uri: 'f',
          name: 'video.mp4',
          type: 'video/mp4',
          tipo: 'VIDEO',
          nombreVisible: 'f',
        },
      }),
    );
    expect(mockSubir.mock.calls[2][4].tiempo).toBe(180_000);
  });

  it('los errores de archivo de la llamada hablan de archivo y de 20 MB, no de "foto" y 10 MB', async () => {
    mockSubir.mockResolvedValue({ id: 's1' });
    await api().crearSolicitud(datos());
    const { mensajes } = mockSubir.mock.calls[0][4] as {
      mensajes: { grande: string; ilegible: string };
    };
    expect(mensajes.grande).toBe('El archivo es demasiado grande (máximo 20 MB).');
    expect(mensajes.ilegible).toContain('archivo');
  });
});

// ---------------------------------------------------------------------------------------------

describe('mensajes de error de mantenimiento', () => {
  const api = (status: number, codigo: string | null) =>
    new ErrorApi({ status, codigo, mensaje: 'x' });

  it.each([
    [api(409, 'CONTRATO_NO_ACTIVO'), 'Solo puedes crear solicitudes con un contrato activo.'],
    [api(413, 'CARGA_DEMASIADO_GRANDE'), 'El archivo es demasiado grande (máximo 20 MB).'],
    [api(413, null), 'El archivo es demasiado grande (máximo 20 MB).'],
    [api(415, 'ERROR_415'), 'Ese archivo no es válido. Usa una foto JPG o PNG, o un video MP4.'],
    [
      api(415, 'ARCHIVO_CONTENIDO_INVALIDO'),
      'Ese archivo no es válido. Usa una foto JPG o PNG, o un video MP4.',
    ],
    [api(404, 'NO_ENCONTRADO'), 'No encontramos esa unidad entre tus contratos.'],
    [api(500, 'ERROR_INTERNO'), mensajeDeError(api(500, 'ERROR_INTERNO'))],
    [api(500, null), MENSAJE_GENERICO],
    [new ErrorCancelado(), 'Envío cancelado.'],
    [
      new ErrorSinConexion(),
      'No sabemos si tu solicitud llegó. Puedes volver a enviarla: no se duplicará.',
    ],
    [
      new ErrorTimeout(),
      'No sabemos si tu solicitud llegó. Puedes volver a enviarla: no se duplicará.',
    ],
    [new ErrorArchivo('grande', 'Pesa demasiado.'), 'Pesa demasiado.'],
  ])('%#: mensaje en español', (error, esperado) => {
    expect(mensajeDeErrorSolicitud(error)).toBe(esperado);
  });

  it('409 SOLICITUD_EN_PROCESO y 422 IDEMPOTENCY_KEY_REUTILIZADA tienen su texto', () => {
    expect(mensajeDeErrorSolicitud(api(409, 'SOLICITUD_EN_PROCESO'))).toContain(
      'ya se está enviando',
    );
    expect(mensajeDeErrorSolicitud(api(422, 'IDEMPOTENCY_KEY_REUTILIZADA'))).toContain(
      'cambiaron mientras se enviaba',
    );
  });

  it('TRANSICION_INVALIDA cuenta como conflicto de estado (lo usará E8-B)', () => {
    expect(esConflictoDeEstado(api(409, 'TRANSICION_INVALIDA'))).toBe(true);
    expect(esConflictoDeEstado(api(409, 'OTRO_CODIGO'))).toBe(false);
  });

  it('los mensajes de foto, comprobante y contrato de otras pantallas NO cambiaron', () => {
    expect(mensajeDeErrorFoto(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
    expect(mensajeDeErrorFoto(api(415, 'ERROR_415'))).toBe(
      'Esa foto no es válida. Usa una imagen JPG o PNG.',
    );
    expect(mensajeDeErrorPago(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(
      'El archivo es demasiado grande (máximo 10 MB).',
    );
    expect(mensajeDeErrorPago(api(415, 'ERROR_415'))).toBe(
      'Ese archivo no es válido. Usa una foto JPG o PNG, o un PDF.',
    );
    expect(mensajeDeError(api(409, 'CONTRATO_NO_ACTIVO'))).toBe('El contrato no está activo.');
    expect(mensajeDeError(api(409, 'SOLICITUD_EN_PROCESO'))).toBe(
      'Ya hay una solicitud en proceso.',
    );
  });
});

// ---------------------------------------------------------------------------------------------

describe('tipos del portal con unidad.id', () => {
  it('el resumen y el detalle de contrato traen el id de la unidad', () => {
    const resumen: ContratoInquilinoResumen = {
      id: 'c1',
      estado: 'ACTIVO',
      fecha_inicio: '2026-01-01T00:00:00.000Z',
      fecha_fin: '2027-12-31T00:00:00.000Z',
      unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
      inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
      estado_pago: 'al_dia',
    };
    expect(resumen.unidad.id).toBe('u1');
    const detalle: Pick<ContratoInquilinoDetalle, 'unidad'> = { unidad: { id: 'u1' } };
    expect(detalle.unidad.id).toBe('u1');
  });
});
