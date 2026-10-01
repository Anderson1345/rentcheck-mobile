// Estado de la sesión, sin React: así se prueba sin renderizar. SesionProvider lo expone a las
// pantallas con useSyncExternalStore.

import type { RespuestaAutenticacion } from '../api/auth';
import type { AlmacenSesion } from './almacen';
import { decodificarToken, estaVencido } from './jwt';
import type { AvisoSesion, DatosSesion, InstantaneaSesion, UsuarioSesion } from './tipos';

export interface OpcionesControlador {
  almacen: AlmacenSesion;
  /** Vacía la caché de TanStack Query al cerrar sesión (no debe quedar nada del usuario anterior). */
  limpiarCache: () => void;
  /** Reloj en milisegundos; se inyecta en las pruebas. */
  ahora?: () => number;
}

export interface ControladorSesion {
  obtener(): InstantaneaSesion;
  suscribir(oyente: () => void): () => void;
  /** Proveedor del token para el cliente de API. */
  obtenerToken(): string | null;
  /** Lee el almacén y decide el estado inicial. Hasta entonces el estado es "cargando". */
  arrancar(): Promise<void>;
  iniciarSesion(respuesta: RespuestaAutenticacion): Promise<void>;
  cerrarSesion(aviso?: AvisoSesion): Promise<void>;
  /** Un endpoint no público respondió 401 con ese token. */
  alRecibir401(tokenEnviado: string): void;
}

/** La respuesta del servidor no sirve para abrir una sesión (token ilegible, vencido o incoherente). */
export class ErrorRespuestaSesion extends Error {
  constructor() {
    super('La respuesta de acceso no es válida.');
    this.name = 'ErrorRespuestaSesion';
  }
}

function datosDeRespuesta(respuesta: RespuestaAutenticacion, ahoraMs: number): DatosSesion {
  const payload = decodificarToken(respuesta.access_token);
  if (!payload || estaVencido(payload.exp, ahoraMs)) throw new ErrorRespuestaSesion();

  // El rol sale del token. La respuesta debe traer el objeto que corresponde a ese rol.
  let usuario: UsuarioSesion;
  if (payload.rol === 'arrendador' && 'arrendador' in respuesta) {
    const { id, nombre, correo } = respuesta.arrendador;
    usuario = { id, nombre, correo };
  } else if (payload.rol === 'inquilino' && 'inquilino' in respuesta) {
    const { id, nombre, correo } = respuesta.inquilino;
    usuario = { id, nombre, correo };
  } else {
    throw new ErrorRespuestaSesion();
  }
  return { token: respuesta.access_token, rol: payload.rol, usuario };
}

export function crearControladorSesion({
  almacen,
  limpiarCache,
  ahora = () => Date.now(),
}: OpcionesControlador): ControladorSesion {
  let token: string | null = null;
  let instantanea: InstantaneaSesion = { estado: 'cargando', usuario: null, aviso: null };
  const oyentes = new Set<() => void>();

  function publicar(nueva: InstantaneaSesion) {
    instantanea = nueva;
    oyentes.forEach((oyente) => oyente());
  }

  async function intentar(accion: () => Promise<void>) {
    try {
      await accion();
    } catch {
      // El llavero puede fallar: la sesión sigue funcionando en memoria. No se registra nada
      // (el error podría traer datos de la sesión).
    }
  }

  async function cerrar(aviso: AvisoSesion) {
    token = null;
    publicar({ estado: 'anonimo', usuario: null, aviso });
    await intentar(() => almacen.borrar());
    limpiarCache();
  }

  return {
    obtener: () => instantanea,

    suscribir(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },

    obtenerToken: () => token,

    async arrancar() {
      const guardada = await almacen.leer();
      if (!guardada) {
        publicar({ estado: 'anonimo', usuario: null, aviso: null });
        return;
      }
      const payload = decodificarToken(guardada.token);
      if (!payload || payload.rol !== guardada.rol) {
        await cerrar(null);
        return;
      }
      if (estaVencido(payload.exp, ahora())) {
        await cerrar('SESION_VENCIDA');
        return;
      }
      token = guardada.token;
      publicar({ estado: payload.rol, usuario: guardada.usuario, aviso: null });
    },

    async iniciarSesion(respuesta) {
      const datos = datosDeRespuesta(respuesta, ahora());
      token = datos.token;
      publicar({ estado: datos.rol, usuario: datos.usuario, aviso: null });
      await intentar(() => almacen.guardar(datos));
    },

    cerrarSesion: (aviso = null) => cerrar(aviso),

    alRecibir401(tokenEnviado) {
      // Un 401 de un token que ya no es el actual (otra sesión, ya cerrada) no debe cerrar la nueva.
      if (token === null || tokenEnviado !== token) return;
      void cerrar('SESION_VENCIDA');
    },
  };
}
