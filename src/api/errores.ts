import { formatearFechaCorta } from '../utilidades/fechas';
import { ErrorApi, ErrorArchivo, ErrorSinConexion, ErrorTimeout } from './cliente';
import { MENSAJE_FOTO_GRANDE } from './mensajesArchivo';

export const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
export const MENSAJE_SIN_CONEXION =
  'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.';
export const MENSAJE_TIMEOUT = 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';

/**
 * Código de la API (`error.codigo`) → mensaje en español de Colombia.
 * Los códigos salen de docs/api/openapi.json, del filtro global de errores del backend
 * y de respuestas reales de producción. Si el backend agrega uno nuevo, se agrega aquí;
 * mientras tanto se muestra el mensaje genérico.
 */
export const MENSAJES_ERROR: Record<string, string> = {
  // Genéricos del filtro global (por estado HTTP)
  SOLICITUD_INVALIDA: 'La solicitud no es válida.',
  VALIDACION: 'Revisa los datos: alguno no es válido.',
  // Fuera del acceso, un 401 cierra la sesión (MENSAJE_SESION_VENCIDA); aquí se ve en el login.
  NO_AUTENTICADO: 'Credenciales inválidas. Revisa tu correo y tu contraseña.',
  PROHIBIDO: 'No tienes permiso para hacer esto.',
  NO_ENCONTRADO: 'No encontrado. Puede que ya no exista o que no tengas acceso.',
  CONFLICTO: 'Esto choca con información que ya existe. Revisa e inténtalo de nuevo.',
  CARGA_DEMASIADO_GRANDE: 'El archivo es demasiado grande.',
  DEMASIADAS_SOLICITUDES: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
  ERROR_INTERNO: 'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.',

  // Cuenta, correo y códigos de acceso
  CODIGO_INVALIDO: 'Código incorrecto o vencido.',
  DEMASIADOS_INTENTOS:
    'Demasiados intentos con códigos inválidos. Espera 15 minutos e inténtalo de nuevo.',
  CORREO_NO_DISPONIBLE: 'Esta función no está disponible por ahora.',
  CORREO_NO_VERIFICADO: 'Debes verificar tu correo antes de iniciar sesión.',
  REQUIERE_INICIO_SESION: 'Ya tienes una cuenta. Inicia sesión para agregar este contrato.',
  CAMPO_NO_EDITABLE: 'Alguno de los datos que intentas cambiar no se puede editar.',
  SIN_CAMPOS: 'No enviaste ningún dato para cambiar.',

  // Archivos
  // 415 por tipo declarado (el filtro global lo nombra por su estado, sin código propio).
  ERROR_415: 'Ese tipo de archivo no está permitido.',
  ARCHIVO_CONTENIDO_INVALIDO:
    'El contenido del archivo no coincide con su tipo. Usa una foto (JPG o PNG), un PDF o un video MP4 válido.',
  DOCUMENTO_NO_GENERADO: 'No se pudo generar el documento del contrato. Inténtalo de nuevo.',

  // Inmuebles y unidades
  ESTRATO_REQUERIDO: 'Debes indicar el estrato del inmueble.',
  CAMPOS_RESIDENCIALES_REQUERIDOS:
    'Para una unidad residencial debes indicar área, habitaciones, baños y ocupantes.',
  INMUEBLE_CON_DOCUMENTOS: 'Este inmueble tiene documentos y no se puede eliminar.',
  UNIDAD_CON_CONTRATO_ACTIVO: 'La unidad tiene un contrato activo y esta acción no se puede hacer.',

  // Contratos
  CEDULA_ARRENDADOR_REQUERIDA:
    'Antes de crear un contrato debes registrar tu cédula o NIT en tu perfil.',
  INQUILINO_REQUERIDO: 'Debes indicar el inquilino del contrato.',
  INQUILINO_AMBIGUO: 'Indica un inquilino existente o uno nuevo, no los dos.',
  INQUILINO_DATOS_INVALIDOS: 'Los datos del inquilino no son válidos.',
  PLANTILLA_NO_CORRESPONDE_A_UNIDAD: 'La plantilla elegida no corresponde a esta unidad.',
  FECHA_FIN_PASADA: 'La fecha de fin del contrato debe ser posterior a hoy.',
  TRASLAPE_DE_CONTRATOS: 'Las fechas se cruzan con otro contrato de esta unidad.',
  DEPOSITO_NO_PERMITIDO_VIVIENDA:
    'En vivienda urbana no se puede exigir depósito (Ley 820 de 2003).',
  CONTRATO_NO_ACTIVO: 'El contrato no está activo.',
  CONTRATO_NO_PROGRAMADO: 'El contrato no está programado.',
  CONTRATO_NO_EDITABLE: 'Este contrato ya no se puede corregir.',
  CONTRATO_YA_VINCULADO:
    'El inquilino ya vinculó este contrato, por lo que ya no se puede corregir.',
  TRANSICION_INVALIDA: 'Ese cambio de estado no está permitido.',

  // Incrementos, prórrogas y avisos
  INCREMENTO_ANTES_DE_12_MESES:
    'El incremento solo se puede aplicar cuando pasen 12 meses desde el inicio o desde el último incremento.',
  INCREMENTO_YA_APLICADO: 'El incremento ya se aplicó.',
  IPC_NO_CONFIGURADO: 'No hay un IPC configurado para el año que se necesita.',
  PORCENTAJE_SUPERIOR_AL_IPC: 'En vivienda el incremento no puede superar el IPC del año anterior.',
  PRORROGA_FUERA_DE_VENTANA:
    'La prórroga solo se puede hacer dentro de los 90 días anteriores al vencimiento.',
  PRORROGA_YA_APLICADA: 'La prórroga ya se aplicó.',
  AVISO_YA_DADO: 'Ya hay un aviso de no renovación para este contrato.',
  AVISO_NO_DADO: 'No hay un aviso de no renovación para cancelar.',
  AVISO_FUERA_DE_PLAZO: 'El aviso de no renovación está fuera del plazo permitido.',
  NO_PUEDE_CANCELAR_AVISO_AJENO: 'Solo quien dio el aviso de no renovación puede cancelarlo.',

  // Terminación anticipada
  TERMINACION_YA_SOLICITADA: 'Ya hay una solicitud de terminación pendiente.',
  TERMINACION_NO_SOLICITADA: 'No hay una solicitud de terminación pendiente.',
  TERMINACION_YA_CONFIRMADA: 'La terminación ya fue confirmada.',
  NO_PUEDE_CONFIRMAR_SU_PROPIA_SOLICITUD: 'La otra parte es quien debe confirmar la solicitud.',
  NO_PUEDE_CANCELAR_SOLICITUD_AJENA: 'Solo quien hizo la solicitud puede cancelarla.',
  FECHA_EFECTIVA_INVALIDA: 'La fecha efectiva no es válida.',

  // Pagos
  PERIODO_INVALIDO: 'El período elegido no es válido.',
  PERIODO_YA_PAGADO: 'Ese período ya está pagado.',
  SIN_PERIODOS_PENDIENTES: 'No hay períodos pendientes de pago.',
  FECHA_REPORTADA_ANTERIOR_A_INICIO:
    'La fecha del pago no puede ser anterior al inicio del contrato.',
  PAGO_YA_PROCESADO: 'Este pago ya fue aprobado o rechazado.',

  // Solicitudes y envíos repetidos
  SOLICITUD_EN_PROCESO: 'Ya hay una solicitud en proceso.',
  IDEMPOTENCY_KEY_INVALIDA: 'No se pudo identificar el envío. Inténtalo de nuevo.',
  IDEMPOTENCY_KEY_REUTILIZADA: 'Este envío ya se había hecho con otros datos. Inténtalo de nuevo.',
};

export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión de nuevo.';
const MENSAJE_CODIGO_NO_VALIDO = 'Código de acceso no válido.';
const MENSAJE_CODIGO_NO_VALIDO_CUENTA =
  'Este código no es válido para tu cuenta. Revisa que sea el que te dio tu arrendador.';
const MENSAJE_REGISTRO_NO_COMPLETADO =
  'No pudimos completar el registro con esos datos. Si ya tienes una cuenta, inicia sesión.';

/** Mensaje en español para mostrar al usuario ante cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorSinConexion) return MENSAJE_SIN_CONEXION;
  if (error instanceof ErrorTimeout) return MENSAJE_TIMEOUT;
  if (error instanceof ErrorApi) {
    if (error.codigo !== null) return MENSAJES_ERROR[error.codigo] ?? MENSAJE_GENERICO;
    // El límite de peticiones puede responder sin código propio.
    if (error.status === 429) return MENSAJES_ERROR.DEMASIADAS_SOLICITUDES;
  }
  return MENSAJE_GENERICO;
}

/**
 * Igual que mensajeDeError, pero un 409 del registro dice "no se pudo completar" sin revelar si
 * el correo ya existe (el backend responde lo mismo a propósito).
 */
export function mensajeDeErrorRegistro(error: unknown): string {
  if (error instanceof ErrorApi && error.status === 409) return MENSAJE_REGISTRO_NO_COMPLETADO;
  return mensajeDeError(error);
}

/** Activación con código: un 404 dice "Código de acceso no válido." (el servidor no distingue la causa). */
export function mensajeDeErrorActivacion(error: unknown): string {
  if (error instanceof ErrorApi && error.status === 404) return MENSAJE_CODIGO_NO_VALIDO;
  return mensajeDeErrorRegistro(error);
}

/** Vincular un contrato con sesión abierta: el 404 es "este código no es válido para tu cuenta". */
export function mensajeDeErrorVinculacion(error: unknown): string {
  if (error instanceof ErrorApi && error.status === 404) return MENSAJE_CODIGO_NO_VALIDO_CUENTA;
  return mensajeDeError(error);
}

const MENSAJE_FOTO_NO_VALIDA = 'Esa foto no es válida. Usa una imagen JPG o PNG.';
const MENSAJE_FOTO_SIN_RESPUESTA =
  'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_FOTO_AUSENTE = 'No se recibió la foto. Elígela de nuevo.';

/**
 * Subir una foto: el servidor responde 415 si el tipo no es JPG o PNG (ERROR_415 por el tipo
 * declarado, ARCHIVO_CONTENIDO_INVALIDO si el contenido real no coincide), 413 si pesa más de 10 MB
 * y 400 si no llegó la foto.
 */
export function mensajeDeErrorFoto(error: unknown): string {
  // La foto se revisa antes de subirla: no se lee o pesa más de 10 MB.
  if (error instanceof ErrorArchivo) return error.message;
  // Sin respuesta al subir: no se afirma que falte internet (a veces falla el envío del archivo).
  if (error instanceof ErrorSinConexion) return MENSAJE_FOTO_SIN_RESPUESTA;
  if (error instanceof ErrorApi) {
    if (error.status === 415) return MENSAJE_FOTO_NO_VALIDA;
    if (error.status === 413 || error.codigo === 'CARGA_DEMASIADO_GRANDE') {
      return MENSAJE_FOTO_GRANDE;
    }
    if (error.status === 400) return MENSAJE_FOTO_AUSENTE;
  }
  return mensajeDeError(error);
}

/**
 * Inmuebles: algunos 409 del backend traen solo un texto en español (el filtro global les pone
 * CONFLICTO). Si no hay un código con mensaje propio, se muestra el texto del servidor.
 */
export function mensajeDeErrorInmueble(error: unknown): string {
  if (
    error instanceof ErrorApi &&
    error.status === 409 &&
    (error.codigo === null || error.codigo === 'CONFLICTO') &&
    error.mensaje.trim() !== ''
  ) {
    return error.mensaje;
  }
  return mensajeDeError(error);
}

/**
 * Resumen corto del fallo para mostrar bajo el mensaje en español ("Detalle técnico: …") y poder
 * diagnosticar sin conectar el teléfono. Solo estado, código y causa ya saneada: nunca URLs,
 * tokens ni rutas. Devuelve null si el error no aporta nada útil.
 */
export function detalleTecnico(error: unknown): string | null {
  if (error instanceof ErrorApi) {
    return error.codigo ? `HTTP ${error.status} · ${error.codigo}` : `HTTP ${error.status}`;
  }
  if (error instanceof ErrorTimeout) {
    return error.causa ? `Tiempo agotado · ${error.causa}` : 'Tiempo agotado';
  }
  if (error instanceof ErrorSinConexion) {
    return error.causa ? `Sin respuesta · ${error.causa}` : 'Sin respuesta';
  }
  if (error instanceof ErrorArchivo) {
    return error.motivo === 'grande' ? 'Archivo demasiado grande' : 'Archivo no legible';
  }
  return null;
}

/** Paso del asistente de contrato al que lleva un error del servidor ("cedula" = pantalla de cédula). */
export type PasoDeError = 'unidad' | 'inquilino' | 'pago' | 'fechas' | 'cedula';

function textoDeDetalles(error: ErrorApi): Record<string, unknown> {
  return typeof error.detalles === 'object' &&
    error.detalles !== null &&
    !Array.isArray(error.detalles)
    ? (error.detalles as Record<string, unknown>)
    : {};
}

/**
 * Crear contrato: igual que mensajeDeError, pero con SOLICITUD_INVALIDA o CONFLICTO y un texto del
 * servidor se muestra ese texto (viene en español), y el traslape dice con qué contrato choca.
 */
export function mensajeDeErrorContrato(error: unknown): string {
  if (error instanceof ErrorApi) {
    if (error.codigo === 'TRASLAPE_DE_CONTRATOS') {
      const { fecha_inicio: inicio, fecha_fin: fin } = textoDeDetalles(error);
      if (typeof inicio === 'string' && typeof fin === 'string') {
        try {
          return `Choca con el contrato del ${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)}.`;
        } catch {
          // Fechas con formato inesperado: se usa el mensaje del diccionario.
        }
      }
    }
    if (
      (error.codigo === 'SOLICITUD_INVALIDA' || error.codigo === 'CONFLICTO') &&
      error.mensaje.trim() !== ''
    ) {
      return error.mensaje;
    }
  }
  return mensajeDeError(error);
}

/** Textos de "detalles" de una VALIDACION (lista de mensajes del servidor). */
export function detallesDeErrorContrato(error: unknown): string[] {
  if (!(error instanceof ErrorApi) || !Array.isArray(error.detalles)) return [];
  return error.detalles.filter((d): d is string => typeof d === 'string');
}

/** A qué paso del asistente hay que volver para corregir el error; null si no hay uno claro. */
export function pasoDeErrorContrato(error: unknown): PasoDeError | null {
  if (!(error instanceof ErrorApi)) return null;
  switch (error.codigo) {
    case 'FECHA_FIN_PASADA':
    case 'TRASLAPE_DE_CONTRATOS':
    case 'CONFLICTO':
      return 'fechas';
    case 'DEPOSITO_NO_PERMITIDO_VIVIENDA':
      return 'pago';
    case 'INQUILINO_AMBIGUO':
    case 'INQUILINO_REQUERIDO':
    case 'INQUILINO_DATOS_INVALIDOS':
    case 'SOLICITUD_INVALIDA':
      return 'inquilino';
    case 'PLANTILLA_NO_CORRESPONDE_A_UNIDAD':
    case 'NO_ENCONTRADO':
      return 'unidad';
    case 'CEDULA_ARRENDADOR_REQUERIDA':
      return 'cedula';
    default:
      return null;
  }
}
