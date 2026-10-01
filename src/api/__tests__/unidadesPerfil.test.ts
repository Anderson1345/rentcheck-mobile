import {
  actualizarUnidad,
  crearUnidad,
  eliminarInmueble,
  eliminarUnidad,
  subirFotoUnidad,
} from '../inmuebles';
import { actualizarPerfil, obtenerPerfil, subirFotoCedula } from '../perfil';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
const mockSubir = jest.fn();
jest.mock('../cliente', () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));

const FOTO = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };

beforeEach(() => {
  for (const m of [mockGet, mockPost, mockPatch, mockDelete, mockSubir]) {
    m.mockReset().mockResolvedValue({});
  }
});

describe('contratos de unidades e inmueble (E3-B)', () => {
  it('crear unidad: POST /inmuebles/:id/unidades', async () => {
    const cuerpo = {
      nombre: 'L1',
      tipo: 'LOCAL' as const,
      uso_permitido: 'COMERCIAL' as const,
      canon_base_centavos: 100,
      acepta_mascotas: false,
    };
    await crearUnidad('i1', cuerpo);
    expect(mockPost).toHaveBeenCalledWith('/inmuebles/i1/unidades', cuerpo);
  });

  it('editar unidad: PATCH solo con los campos recibidos', async () => {
    await actualizarUnidad('i1', 'u1', { nombre: 'X' });
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1', { nombre: 'X' });
  });

  it('eliminar unidad e inmueble: DELETE', async () => {
    await eliminarUnidad('i1', 'u1');
    expect(mockDelete).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1');
    await eliminarInmueble('i1');
    expect(mockDelete).toHaveBeenLastCalledWith('/inmuebles/i1');
  });

  it('foto principal: multipart, campo "foto"', async () => {
    await subirFotoUnidad('i1', 'u1', FOTO);
    expect(mockSubir).toHaveBeenCalledWith(
      '/inmuebles/i1/unidades/u1/foto-principal',
      'foto',
      FOTO,
    );
  });
});

describe('contratos de /arrendadores/perfil', () => {
  it('GET, PATCH y foto de cédula', async () => {
    await obtenerPerfil();
    expect(mockGet).toHaveBeenCalledWith('/arrendadores/perfil');
    await actualizarPerfil({ telefono: '300' });
    expect(mockPatch).toHaveBeenCalledWith('/arrendadores/perfil', { telefono: '300' });
    await subirFotoCedula(FOTO);
    expect(mockSubir).toHaveBeenCalledWith('/arrendadores/perfil/foto-cedula', 'foto', FOTO);
  });
});
