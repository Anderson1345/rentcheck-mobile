import {
  actualizarInmueble,
  crearInmueble,
  crearInmuebleConFoto,
  listarInmuebles,
  obtenerInmueble,
  subirFotoPortada,
} from '../inmuebles';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockSubir = jest.fn();
jest.mock('../cliente', () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
  mockPost.mockReset().mockResolvedValue({});
  mockPatch.mockReset().mockResolvedValue({});
  mockSubir.mockReset().mockResolvedValue({});
});

describe('contratos de /inmuebles (rutas reales del OpenAPI)', () => {
  it('lista: GET /inmuebles', async () => {
    await listarInmuebles();
    expect(mockGet).toHaveBeenCalledWith('/inmuebles');
  });

  it('detalle: GET /inmuebles/:id', async () => {
    await obtenerInmueble('abc');
    expect(mockGet).toHaveBeenCalledWith('/inmuebles/abc');
  });

  it('crear: POST /inmuebles con el cuerpo tal cual (sin foto_portada_ruta)', async () => {
    const datos = {
      direccion: 'Calle 45 # 12-30',
      ciudad: 'Bogotá',
      matricula_inmobiliaria: '50C-1',
      estrato: 4,
      uso_unidad_principal: 'RESIDENCIAL' as const,
    };
    await crearInmueble(datos);
    expect(mockPost).toHaveBeenCalledWith('/inmuebles', datos);
    expect(JSON.stringify(mockPost.mock.calls[0][1])).not.toContain('foto_portada_ruta');
  });

  it('editar: PATCH /inmuebles/:id solo con los campos recibidos', async () => {
    await actualizarInmueble('abc', { ciudad: 'Cali' });
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/abc', { ciudad: 'Cali' });
  });

  it('foto de portada: multipart a /inmuebles/:id/foto-portada, campo "foto"', async () => {
    const archivo = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
    await subirFotoPortada('abc', archivo);
    expect(mockSubir).toHaveBeenCalledWith('/inmuebles/abc/foto-portada', 'foto', archivo);
  });

  it('el id se codifica en la ruta', async () => {
    await obtenerInmueble('a/b');
    expect(mockGet).toHaveBeenCalledWith('/inmuebles/a%2Fb');
  });
});

describe('crearInmuebleConFoto (dos pasos, nunca en el mismo)', () => {
  const datos = {
    direccion: 'Calle 1',
    ciudad: 'Bogotá',
    matricula_inmobiliaria: 'M-1',
    uso_unidad_principal: 'COMERCIAL' as const,
  };
  const foto = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };

  it('sin foto: solo POST /inmuebles', async () => {
    mockPost.mockResolvedValue({ id: 'nuevo' });
    const r = await crearInmuebleConFoto(datos);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockSubir).not.toHaveBeenCalled();
    expect(r).toEqual({ inmueble: { id: 'nuevo' }, fotoSubida: true });
  });

  it('con foto: primero el POST y después la foto, con el id que devolvió el servidor', async () => {
    const orden: string[] = [];
    mockPost.mockImplementation(async () => {
      orden.push('crear');
      return { id: 'nuevo' };
    });
    mockSubir.mockImplementation(async () => {
      orden.push('foto');
      return { id: 'nuevo', foto_portada_url: 'https://firmada' };
    });

    const r = await crearInmuebleConFoto(datos, foto);

    expect(orden).toEqual(['crear', 'foto']);
    expect(mockSubir).toHaveBeenCalledWith('/inmuebles/nuevo/foto-portada', 'foto', foto);
    expect(r.fotoSubida).toBe(true);
    expect(r.inmueble).toMatchObject({ id: 'nuevo' });
  });

  it('si la foto falla, el inmueble ya existe: no lanza, avisa y deja el error de la foto', async () => {
    const falla = new Error('415');
    mockPost.mockResolvedValue({ id: 'nuevo' });
    mockSubir.mockRejectedValue(falla);

    const r = await crearInmuebleConFoto(datos, foto);

    expect(r).toEqual({ inmueble: { id: 'nuevo' }, fotoSubida: false, errorFoto: falla });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('si crear falla, no se intenta subir la foto y el error se propaga', async () => {
    mockPost.mockRejectedValue(new Error('400'));
    await expect(crearInmuebleConFoto(datos, foto)).rejects.toThrow('400');
    expect(mockSubir).not.toHaveBeenCalled();
  });
});
