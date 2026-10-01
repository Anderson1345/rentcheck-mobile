import {
  CALIDAD_FOTO,
  elegirFoto,
  mensajeDeResultadoFoto,
  TAMANO_MAXIMO_FOTO_BYTES,
} from '../foto';

const mockPermisoCamara = jest.fn();
const mockCamara = jest.fn();
const mockGaleria = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPermisoCamara(...a),
  launchCameraAsync: (...a: unknown[]) => mockCamara(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockGaleria(...a),
}));

const activo = (extra: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [
    {
      uri: 'file:///cache/ImagePicker/abc-123.jpg',
      mimeType: 'image/jpeg',
      fileName: 'IMG_2043.JPG',
      fileSize: 1_200_000,
      width: 3000,
      height: 2000,
      ...extra,
    },
  ],
});

beforeEach(() => {
  mockPermisoCamara.mockReset().mockResolvedValue({ granted: true, canAskAgain: true });
  mockCamara.mockReset().mockResolvedValue(activo());
  mockGaleria.mockReset().mockResolvedValue(activo());
});

describe('elegirFoto: cámara', () => {
  it('pide el permiso de la cámara y abre la cámara con calidad ≈ 0,7 solo de imágenes', async () => {
    const r = await elegirFoto('camara');

    expect(mockPermisoCamara).toHaveBeenCalledTimes(1);
    expect(mockCamara).toHaveBeenCalledTimes(1);
    const opciones = mockCamara.mock.calls[0][0];
    expect(opciones.quality).toBe(CALIDAD_FOTO);
    expect(CALIDAD_FOTO).toBeGreaterThanOrEqual(0.6);
    expect(CALIDAD_FOTO).toBeLessThanOrEqual(0.8);
    expect(opciones.mediaTypes).toEqual(['images']);
    expect(r).toEqual({
      tipo: 'elegida',
      archivo: {
        uri: 'file:///cache/ImagePicker/abc-123.jpg',
        name: 'portada.jpg',
        type: 'image/jpeg',
      },
    });
  });

  it('permiso denegado (se puede volver a preguntar): no abre la cámara', async () => {
    mockPermisoCamara.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await elegirFoto('camara')).toEqual({ tipo: 'denegado', definitivo: false });
    expect(mockCamara).not.toHaveBeenCalled();
  });

  it('permiso denegado para siempre: lo marca como definitivo', async () => {
    mockPermisoCamara.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await elegirFoto('camara')).toEqual({ tipo: 'denegado', definitivo: true });
  });

  it('cancelada: no hay foto y no es un error', async () => {
    mockCamara.mockResolvedValue({ canceled: true, assets: null });
    expect(await elegirFoto('camara')).toEqual({ tipo: 'cancelada' });
  });

  it('si el sistema falla al abrir la cámara: error (no se rompe)', async () => {
    mockCamara.mockRejectedValue(new Error('Camera not available'));
    expect(await elegirFoto('camara')).toEqual({ tipo: 'error' });
  });
});

describe('elegirFoto: galería', () => {
  it('abre el selector del sistema (que no necesita permiso) con la misma calidad', async () => {
    const r = await elegirFoto('galeria');

    expect(mockPermisoCamara).not.toHaveBeenCalled();
    expect(mockGaleria).toHaveBeenCalledTimes(1);
    expect(mockGaleria.mock.calls[0][0]).toMatchObject({
      quality: CALIDAD_FOTO,
      mediaTypes: ['images'],
    });
    expect(r.tipo).toBe('elegida');
  });

  it('una imagen PNG se envía como PNG con nombre .png', async () => {
    mockGaleria.mockResolvedValue(
      activo({ uri: 'file:///cache/x.png', mimeType: 'image/png', fileName: 'captura.png' }),
    );
    expect(await elegirFoto('galeria')).toEqual({
      tipo: 'elegida',
      archivo: { uri: 'file:///cache/x.png', name: 'portada.png', type: 'image/png' },
    });
  });

  it('sin mimeType: deduce el tipo de la extensión del archivo', async () => {
    mockGaleria.mockResolvedValue(
      activo({ uri: 'file:///cache/x.jpeg', mimeType: undefined, fileName: undefined }),
    );
    const r = await elegirFoto('galeria');
    expect(r).toMatchObject({ tipo: 'elegida', archivo: { type: 'image/jpeg' } });
  });

  it.each(['image/webp', 'image/heic', 'image/gif'])('%s no es JPG ni PNG: avisa', async (tipo) => {
    mockGaleria.mockResolvedValue(activo({ mimeType: tipo, uri: 'file:///cache/x.bin' }));
    expect(await elegirFoto('galeria')).toEqual({ tipo: 'formato' });
  });

  it('sin mimeType ni extensión conocida: avisa en vez de adivinar', async () => {
    mockGaleria.mockResolvedValue(activo({ mimeType: undefined, uri: 'content://media/42' }));
    expect(await elegirFoto('galeria')).toEqual({ tipo: 'formato' });
  });

  it('una foto de más de 10 MB se rechaza sin subirla', async () => {
    mockGaleria.mockResolvedValue(activo({ fileSize: TAMANO_MAXIMO_FOTO_BYTES + 1 }));
    expect(await elegirFoto('galeria')).toEqual({ tipo: 'grande' });
  });

  it('cancelada', async () => {
    mockGaleria.mockResolvedValue({ canceled: true, assets: null });
    expect(await elegirFoto('galeria')).toEqual({ tipo: 'cancelada' });
  });

  it('si el selector falla: error', async () => {
    mockGaleria.mockRejectedValue(new Error('x'));
    expect(await elegirFoto('galeria')).toEqual({ tipo: 'error' });
  });
});

describe('mensajeDeResultadoFoto', () => {
  it('no dice nada de una foto elegida ni de una cancelada', () => {
    expect(mensajeDeResultadoFoto({ tipo: 'cancelada' })).toBeNull();
    expect(
      mensajeDeResultadoFoto({
        tipo: 'elegida',
        archivo: { uri: 'u', name: 'portada.jpg', type: 'image/jpeg' },
      }),
    ).toBeNull();
  });

  it('permiso denegado: explica cómo activarlo', () => {
    expect(mensajeDeResultadoFoto({ tipo: 'denegado', definitivo: false })).toBe(
      'Para tomar la foto, RentCheck necesita permiso para usar la cámara. También puedes elegir una foto de la galería.',
    );
    expect(mensajeDeResultadoFoto({ tipo: 'denegado', definitivo: true })).toBe(
      'El permiso de la cámara está desactivado. Actívalo en los ajustes del teléfono para tomar fotos, o elige una de la galería.',
    );
  });

  it('formato, tamaño y error', () => {
    expect(mensajeDeResultadoFoto({ tipo: 'formato' })).toBe(
      'Esa imagen no es JPG ni PNG. Elige otra foto o tómala con la cámara.',
    );
    expect(mensajeDeResultadoFoto({ tipo: 'grande' })).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
    expect(mensajeDeResultadoFoto({ tipo: 'error' })).toBe(
      'No pudimos abrir la cámara o la galería. Inténtalo de nuevo.',
    );
  });
});
