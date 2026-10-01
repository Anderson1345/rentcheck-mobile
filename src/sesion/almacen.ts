// Único lugar donde vive el token: el llavero del teléfono (expo-secure-store). Nada de AsyncStorage
// ni de estado persistido de TanStack Query. Nunca se escribe en logs.

import * as SecureStore from 'expo-secure-store';

import type { DatosSesion, RolSesion } from './tipos';

// Las claves de SecureStore admiten solo letras, números, ".", "-" y "_".
const CLAVE = 'rentcheck_sesion';

export interface AlmacenSesion {
  guardar(datos: DatosSesion): Promise<void>;
  leer(): Promise<DatosSesion | null>;
  borrar(): Promise<void>;
}

const esRol = (valor: unknown): valor is RolSesion =>
  valor === 'arrendador' || valor === 'inquilino';

/** Valida la forma de lo leído y descarta cualquier campo que no sea de los mínimos. */
function aDatosSesion(valor: unknown): DatosSesion | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const { token, rol, usuario } = valor as Record<string, unknown>;
  if (typeof token !== 'string' || token === '' || !esRol(rol)) return null;
  if (typeof usuario !== 'object' || usuario === null) return null;
  const { id, nombre, correo } = usuario as Record<string, unknown>;
  if (typeof id !== 'string' || typeof nombre !== 'string') return null;
  if (correo !== null && typeof correo !== 'string') return null;
  return { token, rol, usuario: { id, nombre, correo } };
}

export const almacenSeguro: AlmacenSesion = {
  async guardar({ token, rol, usuario }) {
    // Solo token, rol y los datos mínimos del usuario.
    const minimo: DatosSesion = {
      token,
      rol,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
    };
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(minimo));
  },

  async leer() {
    try {
      const texto = await SecureStore.getItemAsync(CLAVE);
      if (texto === null) return null;
      return aDatosSesion(JSON.parse(texto));
    } catch {
      // Llavero no disponible o contenido corrupto: se arranca sin sesión.
      return null;
    }
  },

  async borrar() {
    await SecureStore.deleteItemAsync(CLAVE);
  },
};
