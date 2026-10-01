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

export function requiereVerificacion<T extends object>(
  respuesta: T | RespuestaRequiereVerificacion,
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

export interface Capacidades {
  verificacion_correo: boolean;
  recuperacion_contrasena: boolean;
}

export interface RespuestaValidarCodigo {
  requiere_inicio_sesion: boolean;
  mensaje: string;
  nombreInquilino?: string;
  nombreUnidad?: string;
  direccionInmueble?: string;
}

export interface DatosActivacion {
  codigo: string;
  correo: string;
  contrasena: string;
}

export interface ContratoVinculado {
  id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  vinculado_en: string;
  datos_recaudo: unknown;
  unidad: { id: string; nombre: string; tipo: string };
  inmueble: { id: string; direccion: string; ciudad: string };
}

export interface DatosRestablecer {
  correo: string;
  codigo: string;
  nueva_contrasena: string;
}

export interface RespuestaCorreoVerificado {
  correo_verificado: true;
}

export interface RespuestaContrasenaActualizada {
  contrasena_actualizada: true;
}

/** GET /auth/capacidades: qué funciones dependen del proveedor de correo (apagado en producción). */
export function obtenerCapacidades() {
  return api.get<Capacidades>('/auth/capacidades');
}

/** El código se envía siempre en formato canónico RC-XXXX-XXXX (ver sesion/codigo.ts). */
export function validarCodigoAcceso(codigo: string) {
  return api.post<RespuestaValidarCodigo>('/auth/inquilino/validar-codigo', { codigo });
}

/** 200 { access_token, inquilino } sin proveedor de correo; 201 { requiere_verificacion, correo } con proveedor. */
export function completarRegistroInquilino(datos: DatosActivacion) {
  return api.post<RespuestaAutenticacionInquilino | RespuestaRequiereVerificacion>(
    '/auth/inquilino/completar-registro',
    datos,
  );
}

export function verificarCorreo(correo: string, codigo: string) {
  return api.post<RespuestaCorreoVerificado>('/auth/verificar-correo', { correo, codigo });
}

/** 202 siempre igual (60 s entre envíos, máximo 5 por hora). */
export function reenviarVerificacion(correo: string) {
  return api.post<unknown>('/auth/reenviar-verificacion', { correo });
}

/** 202 siempre igual: no revela si el correo tiene cuenta. */
export function recuperarContrasena(correo: string) {
  return api.post<unknown>('/auth/recuperar-contrasena', { correo });
}

export function restablecerContrasena(datos: DatosRestablecer) {
  return api.post<RespuestaContrasenaActualizada>('/auth/restablecer-contrasena', datos);
}

/** Con sesión de inquilino. Idempotente para la misma cuenta; 404 si el código no es válido para ella. */
export function vincularContrato(codigo: string) {
  return api.post<ContratoVinculado>('/inquilino/contratos/vincular', { codigo });
}
