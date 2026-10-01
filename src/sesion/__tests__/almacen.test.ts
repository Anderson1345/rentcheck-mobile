import * as SecureStore from 'expo-secure-store';

import { almacenSeguro } from '../almacen';
import type { DatosSesion } from '../tipos';

// Almacén en mockMemoria en lugar del llavero del teléfono.
const mockMemoria = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (clave: string, valor: string) => {
    mockMemoria.set(clave, valor);
  }),
  getItemAsync: jest.fn(async (clave: string) => mockMemoria.get(clave) ?? null),
  deleteItemAsync: jest.fn(async (clave: string) => {
    mockMemoria.delete(clave);
  }),
}));

const datos: DatosSesion = {
  token: 'token-de-prueba',
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
};

beforeEach(() => {
  mockMemoria.clear();
  jest.clearAllMocks();
});

describe('almacén seguro de la sesión', () => {
  it('guarda y lee token, rol y datos mínimos del usuario', async () => {
    await almacenSeguro.guardar(datos);
    expect(await almacenSeguro.leer()).toEqual(datos);
  });

  it('solo escribe en expo-secure-store', async () => {
    await almacenSeguro.guardar(datos);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(mockMemoria.size).toBe(1);
  });

  it('no guarda nada más que token, rol y (id, nombre, correo): descarta campos extra', async () => {
    const conExtras = {
      ...datos,
      usuario: { ...datos.usuario, telefono: '3001234567', foto_cedula_nit_url: 'https://x' },
    } as unknown as DatosSesion;
    await almacenSeguro.guardar(conExtras);
    const guardado = JSON.parse([...mockMemoria.values()][0]);
    expect(Object.keys(guardado).sort()).toEqual(['rol', 'token', 'usuario']);
    expect(Object.keys(guardado.usuario).sort()).toEqual(['correo', 'id', 'nombre']);
  });

  it('borrar deja el almacén vacío', async () => {
    await almacenSeguro.guardar(datos);
    await almacenSeguro.borrar();
    expect(await almacenSeguro.leer()).toBeNull();
    expect(mockMemoria.size).toBe(0);
  });

  it('sin nada guardado, leer devuelve null', async () => {
    expect(await almacenSeguro.leer()).toBeNull();
  });

  it('un valor guardado corrupto o incompleto se lee como null', async () => {
    const clave = (await almacenSeguro.guardar(datos), [...mockMemoria.keys()][0]);
    for (const valor of [
      'no es json',
      '{}',
      '[1]',
      '{"token":"t","rol":"admin","usuario":{"id":"1","nombre":"n","correo":null}}',
      '{"token":"t","rol":"arrendador"}',
    ]) {
      mockMemoria.set(clave, valor);
      expect(await almacenSeguro.leer()).toBeNull();
    }
  });

  it('si el llavero falla al leer, se lee como null (no rompe el arranque)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('llavero no disponible'),
    );
    expect(await almacenSeguro.leer()).toBeNull();
  });
});
