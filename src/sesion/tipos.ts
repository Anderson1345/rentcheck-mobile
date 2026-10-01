export type RolSesion = 'arrendador' | 'inquilino';
export type EstadoSesion = 'cargando' | 'anonimo' | RolSesion;

/** Lo único que se guarda del usuario: lo mínimo para saludar. */
export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string | null;
}

export interface DatosSesion {
  token: string;
  rol: RolSesion;
  usuario: UsuarioSesion;
}

/** Aviso que la pantalla de acceso muestra al volver a anónimo. */
export type AvisoSesion = 'SESION_VENCIDA' | null;

export interface InstantaneaSesion {
  estado: EstadoSesion;
  usuario: UsuarioSesion | null;
  aviso: AvisoSesion;
}
