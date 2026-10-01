import {
  iniciarSesionArrendador,
  iniciarSesionInquilino,
  registrarArrendador,
  requiereVerificacion,
} from '../auth';

const mockPost = jest.fn();
jest.mock('../cliente', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

beforeEach(() => mockPost.mockReset().mockResolvedValue({}));

describe('contratos de /auth (rutas reales del OpenAPI)', () => {
  it('login del arrendador: POST /auth/arrendador/login con correo y contraseña', async () => {
    await iniciarSesionArrendador('a@b.co', 'Clave2026');
    expect(mockPost).toHaveBeenCalledWith('/auth/arrendador/login', {
      correo: 'a@b.co',
      contrasena: 'Clave2026',
    });
  });

  it('registro: POST /auth/arrendador/registro con nombre, correo, teléfono y contraseña', async () => {
    const datos = {
      nombre: 'Marta',
      correo: 'a@b.co',
      telefono: '3001234567',
      contrasena: 'Clave2026',
    };
    await registrarArrendador(datos);
    expect(mockPost).toHaveBeenCalledWith('/auth/arrendador/registro', datos);
  });

  it('login del inquilino: POST /auth/inquilino/login', async () => {
    await iniciarSesionInquilino('i@b.co', 'Clave2026');
    expect(mockPost).toHaveBeenCalledWith('/auth/inquilino/login', {
      correo: 'i@b.co',
      contrasena: 'Clave2026',
    });
  });
});

describe('requiereVerificacion', () => {
  it('distingue la respuesta sin token de la que trae sesión', () => {
    expect(requiereVerificacion({ requiere_verificacion: true, correo: 'a@b.co' })).toBe(true);
    expect(
      requiereVerificacion({
        access_token: 't',
        arrendador: {
          id: '1',
          nombre: 'M',
          correo: 'a@b.co',
          telefono: '3',
          foto_cedula_nit_url: null,
          creado_en: 'x',
        },
      }),
    ).toBe(false);
  });
});
