// Excepción documentada: faltan esquemas en OpenAPI (B-57). Estos contratos salen de
// rentcheck-backend (auth.service.ts) y de las descripciones de /auth/* en docs/api/openapi.json.
// Cuando el backend publique los esquemas, se reemplazan por los tipos generados.

import { api } from './cliente';

export interface Arrendador {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  /** URL firmada (nunca la ruta interna) o null. No se guarda: expira en 1 hora. */
  foto_cedula_nit_url: string | null;
  creado_en: string;
}

export interface Inquilino {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string;
  creado_en: string;
}

export interface RespuestaAutenticacionArrendador {
  access_token: string;
  arrendador: Arrendador;
}

export interface RespuestaAutenticacionInquilino {
  access_token: string;
  inquilino: Inquilino;
}

export type RespuestaAutenticacion =
  RespuestaAutenticacionArrendador | RespuestaAutenticacionInquilino;

/** Con proveedor de correo activo, el registro responde 201 sin token. */
export interface RespuestaRequiereVerificacion {
  requiere_verificacion: true;
  correo: string;
}

export interface DatosRegistroArrendador {
  nombre: string;
  correo: string;
  telefono: string;
  contrasena: string;
}

export function requiereVerificacion(
  respuesta: RespuestaAutenticacionArrendador | RespuestaRequiereVerificacion,
): respuesta is RespuestaRequiereVerificacion {
  return 'requiere_verificacion' in respuesta && respuesta.requiere_verificacion === true;
}

export function iniciarSesionArrendador(correo: string, contrasena: string) {
  return api.post<RespuestaAutenticacionArrendador>('/auth/arrendador/login', {
    correo,
    contrasena,
  });
}

export function registrarArrendador(datos: DatosRegistroArrendador) {
  return api.post<RespuestaAutenticacionArrendador | RespuestaRequiereVerificacion>(
    '/auth/arrendador/registro',
    datos,
  );
}

export function iniciarSesionInquilino(correo: string, contrasena: string) {
  return api.post<RespuestaAutenticacionInquilino>('/auth/inquilino/login', { correo, contrasena });
}
