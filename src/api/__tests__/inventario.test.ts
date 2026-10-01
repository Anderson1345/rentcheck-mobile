import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../cliente';
import { mensajeDeErrorFoto } from '../errores';
import { listarFotosInventario, subirFotoInventario } from '../inventario';
import { ZONA_MAXIMO, ZONAS, validarZona } from '../../contratos/zonas';

const mockGet = jest.fn();
const mockSubir = jest.fn();
jest.mock('../cliente', () => ({
  ...jest.requireActual('../cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));

const FOTO = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue([]);
  mockSubir.mockReset().mockResolvedValue({});
});

describe('contratos de /contratos/:id/fotos-inventario', () => {
  it('subir: multipart con la foto y los campos momento y zona', async () => {
    await subirFotoInventario('c1', FOTO, 'ENTREGA', 'Cocina');
    expect(mockSubir).toHaveBeenCalledWith('/contratos/c1/fotos-inventario', 'foto', FOTO, {
      momento: 'ENTREGA',
      zona: 'Cocina',
    });
  });

  it('listar: GET filtrado por momento; el id se codifica', async () => {
    await listarFotosInventario('a/b', 'DEVOLUCION');
    expect(mockGet).toHaveBeenCalledWith('/contratos/a%2Fb/fotos-inventario?momento=DEVOLUCION');
  });
});

describe('zonas', () => {
  it('chips: Sala, Cocina, Baño, Habitación, Fachada y Otra', () => {
    expect(ZONAS).toEqual(['Sala', 'Cocina', 'Baño', 'Habitación', 'Fachada', 'Otra']);
  });

  it('un chip fijo es la zona; sin elegir es un error', () => {
    expect(validarZona('Sala', '')).toEqual({ zona: 'Sala' });
    expect(validarZona(null, '')).toEqual({ error: 'Elige la zona de la foto.' });
  });

  it('"Otra": texto libre recortado, no vacío y de hasta el máximo (el DTO solo exige no vacío)', () => {
    expect(validarZona('Otra', '  Terraza ')).toEqual({ zona: 'Terraza' });
    expect(validarZona('Otra', '   ')).toEqual({ error: 'Escribe cuál es la zona.' });
    expect(validarZona('Otra', 'x'.repeat(ZONA_MAXIMO))).toEqual({ zona: 'x'.repeat(ZONA_MAXIMO) });
    expect(validarZona('Otra', 'x'.repeat(ZONA_MAXIMO + 1)).error).toBe(
      `La zona puede tener hasta ${ZONA_MAXIMO} caracteres.`,
    );
  });
});

describe('errores de la foto de inventario', () => {
  const api = (status: number, codigo: string | null) =>
    new ErrorApi({ status, codigo, mensaje: 'texto técnico RC-AB3D-9KPX' });

  it('415 ARCHIVO_CONTENIDO_INVALIDO: foto no válida', () => {
    expect(mensajeDeErrorFoto(api(415, 'ARCHIVO_CONTENIDO_INVALIDO'))).toBe(
      'Esa foto no es válida. Usa una imagen JPG o PNG.',
    );
  });

  it('413: demasiado grande', () => {
    expect(mensajeDeErrorFoto(api(413, 'CARGA_DEMASIADO_GRANDE'))).toContain('demasiado grande');
  });

  it('404: no encontrado, en español', () => {
    expect(mensajeDeErrorFoto(api(404, 'NO_ENCONTRADO'))).toBe(
      'No encontrado. Puede que ya no exista o que no tengas acceso.',
    );
  });

  it('ningún mensaje deja pasar textos técnicos ni el código de acceso', () => {
    for (const e of [
      api(415, 'ERROR_415'),
      api(413, null),
      api(404, 'NO_ENCONTRADO'),
      api(500, 'ERROR_INTERNO'),
      new ErrorSinConexion(),
      new ErrorTimeout(),
    ]) {
      expect(mensajeDeErrorFoto(e)).not.toMatch(/RC-|texto técnico/);
    }
  });
});
