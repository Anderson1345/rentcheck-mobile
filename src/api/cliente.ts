// Cliente de la API de RentCheck: fetch con tiempo de espera y errores tipados.
// Sin reintentos automáticos: un 401 fuera de /auth/* cierra la sesión (no hay refresh token hasta B0.6-B).

import * as FileSystem from 'expo-file-system/legacy';

import {
  MENSAJE_FOTO_GRANDE,
  MENSAJE_FOTO_ILEGIBLE,
  TAMANO_MAXIMO_FOTO_BYTES,
} from './mensajesArchivo';

/** Render gratis duerme: la primera petición (o la que sigue a un largo silencio) puede tardar ~60 s. */
export const TIMEOUT_PRIMERA_PETICION_MS = 60_000;
export const TIMEOUT_PETICION_MS = 20_000;
/** Subir un archivo (foto) por una red móvil lenta puede tardar: 60 s, haya o no despertado el servidor. */
export const TIMEOUT_SUBIDA_MS = 60_000;
/** Render duerme el servicio tras 15 min sin tráfico; con más de 10 min sin respuesta se asume dormido. */
export const INACTIVIDAD_SERVIDOR_DORMIDO_MS = 10 * 60_000;

class ErrorRentCheck extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

/** El servidor respondió con un error. `codigo` y `mensaje` salen del cuerpo `{ statusCode, codigo, mensaje, detalles?, message }`. */
export class ErrorApi extends ErrorRentCheck {
  readonly status: number;
  readonly codigo: string | null;
  readonly mensaje: string;
  readonly detalles?: unknown;

  constructor(datos: {
    status: number;
    codigo: string | null;
    mensaje: string;
    detalles?: unknown;
  }) {
    super(datos.mensaje || `Error ${datos.status}`);
    this.status = datos.status;
    this.codigo = datos.codigo;
    this.mensaje = datos.mensaje;
    this.detalles = datos.detalles;
  }
}

const LARGO_MAXIMO_CAUSA = 120;

/**
 * Texto del error original para el "detalle técnico": sin URLs, tokens ni rutas de archivos del
 * teléfono o de Windows, y recortado a 120 caracteres. Nunca debe filtrar datos sensibles.
 */
export function sanearCausa(causa: unknown): string | undefined {
  let texto: string;
  if (causa instanceof Error) texto = `${causa.name}: ${causa.message}`;
  else if (typeof causa === 'string') texto = causa;
  else return undefined;

  texto = texto
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S*/gi, '[url]')
    .replace(/\bBearer\s+\S+/gi, '[token]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/\b[a-z]:\\\S*/gi, '[ruta]')
    .replace(/(^|[\s(:'"])(?:\/[\w.@-]+){2,}\/?/g, '$1[ruta]')
    .replace(/\s+/g, ' ')
    .trim();
  return texto === '' ? undefined : texto.slice(0, LARGO_MAXIMO_CAUSA);
}

/** El servidor no respondió dentro del tiempo permitido. */
export class ErrorTimeout extends ErrorRentCheck {
  /** Nombre y mensaje del error original, saneados (ver sanearCausa). */
  readonly causa?: string;

  constructor(causaCruda?: unknown) {
    super('El servidor no respondió a tiempo.');
    this.causa = sanearCausa(causaCruda);
  }
}

/** La petición no llegó al servidor (sin red, sin DNS, conexión cortada, fallo del cargador nativo). */
export class ErrorSinConexion extends ErrorRentCheck {
  /** Nombre y mensaje del error original, saneados (ver sanearCausa). */
  readonly causa?: string;

  constructor(causaCruda?: unknown) {
    super('No hay conexión con el servidor.');
    this.causa = sanearCausa(causaCruda);
  }
}

/** La foto elegida no se puede subir (no se lee o pesa más de 10 MB): se detecta antes de subirla. */
export class ErrorArchivo extends ErrorRentCheck {
  readonly motivo: 'ilegible' | 'grande';

  constructor(motivo: 'ilegible' | 'grande') {
    super(motivo === 'ilegible' ? MENSAJE_FOTO_ILEGIBLE : MENSAJE_FOTO_GRANDE);
    this.motivo = motivo;
  }
}

export type ProveedorToken = () => string | null | Promise<string | null>;

// Punto de inyección del token: lo conecta el layout raíz con el controlador de sesión (el token
// vive solo en expo-secure-store). Sin sesión devuelve null.
let proveedorToken: ProveedorToken = () => null;

export function establecerProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor;
}

// Punto de inyección del manejo global de 401 (lo conecta SesionProvider).
let manejador401: (tokenEnviado: string) => void = () => undefined;

export function establecerManejador401(manejador: (tokenEnviado: string) => void): void {
  manejador401 = manejador;
}

/** Respuesta del cargador nativo: estado HTTP y cuerpo en texto. */
export interface RespuestaSubida {
  status: number;
  body: string;
}

/**
 * Sube el archivo con multipart. `registrarCancelacion` entrega la función que aborta la subida
 * (el cliente la llama al agotarse el tiempo).
 */
export type SubirImpl = (
  url: string,
  uri: string,
  opciones: FileSystem.FileSystemUploadOptions,
  registrarCancelacion?: (cancelar: () => Promise<void>) => void,
) => Promise<RespuestaSubida>;

export type InfoArchivoImpl = (uri: string) => Promise<{ exists: boolean; size?: number }>;

/** Cargador nativo de Expo: lee el archivo por su URI y arma el multipart, sin pasar por fetch. */
const subirNativo: SubirImpl = async (url, uri, opciones, registrarCancelacion) => {
  const tarea = FileSystem.createUploadTask(url, uri, opciones);
  registrarCancelacion?.(() => tarea.cancelAsync());
  const respuesta = await tarea.uploadAsync();
  if (!respuesta) throw new Error('Subida cancelada');
  return respuesta;
};

const infoNativa: InfoArchivoImpl = async (uri) => {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? { exists: true, size: info.size } : { exists: false };
};

export interface OpcionesCliente {
  /** Por defecto, EXPO_PUBLIC_API_URL. */
  baseUrl?: string;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  obtenerToken?: ProveedorToken;
  /** Reloj en milisegundos; se inyecta en las pruebas. */
  ahora?: () => number;
  /** Se llama ante un 401 de un endpoint que no es de acceso, con el token que se envió. */
  alRecibir401?: (tokenEnviado: string) => void;
  /** Cargador de archivos; por defecto el nativo de expo-file-system. Se inyecta en las pruebas. */
  subirImpl?: SubirImpl;
  /** Lee existencia y tamaño de un archivo local; por defecto getInfoAsync. */
  infoImpl?: InfoArchivoImpl;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Archivo local a subir. En React Native el FormData acepta { uri, name, type } en lugar de un Blob. */
export interface ArchivoSubida {
  uri: string;
  name: string;
  type: string;
}

/** Opciones por petición. `tiempo`: plazo propio en ms (p. ej. crear un contrato genera el PDF). */
export interface OpcionesPeticion {
  tiempo?: number;
}

export interface ClienteApi {
  solicitar<T = unknown>(
    metodo: Metodo,
    ruta: string,
    cuerpo?: unknown,
    opciones?: OpcionesPeticion,
  ): Promise<T>;
  /** POST multipart/form-data con un archivo en `campo` (más campos de texto opcionales). */
  subirArchivo<T = unknown>(
    ruta: string,
    campo: string,
    archivo: ArchivoSubida,
    extras?: Record<string, string>,
  ): Promise<T>;
  get<T = unknown>(ruta: string): Promise<T>;
  post<T = unknown>(ruta: string, cuerpo?: unknown, opciones?: OpcionesPeticion): Promise<T>;
  put<T = unknown>(ruta: string, cuerpo?: unknown): Promise<T>;
  patch<T = unknown>(ruta: string, cuerpo?: unknown): Promise<T>;
  delete<T = unknown>(ruta: string): Promise<T>;
}

function leerCuerpo(texto: string): unknown {
  if (texto === '') return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function aErrorApi(status: number, cuerpo: unknown): ErrorApi {
  const objeto =
    typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
  const mensaje =
    typeof objeto.mensaje === 'string'
      ? objeto.mensaje
      : typeof objeto.message === 'string'
        ? objeto.message
        : '';
  return new ErrorApi({
    status,
    codigo: typeof objeto.codigo === 'string' ? objeto.codigo : null,
    mensaje,
    detalles: objeto.detalles,
  });
}

/** Endpoints públicos de acceso (/auth/*): un 401 ahí es "credenciales inválidas", no una sesión vencida. */
export function esRutaDeAcceso(ruta: string): boolean {
  return ruta.startsWith('/auth/');
}

export function crearClienteApi(opciones: OpcionesCliente = {}): ClienteApi {
  const fetchImpl = opciones.fetchImpl ?? ((url, init) => fetch(url, init));
  const obtenerToken = opciones.obtenerToken ?? (() => proveedorToken());
  const ahora = opciones.ahora ?? (() => Date.now());
  const subirImpl = opciones.subirImpl ?? subirNativo;
  const infoImpl = opciones.infoImpl ?? infoNativa;
  const alRecibir401 =
    opciones.alRecibir401 ?? ((tokenEnviado: string) => manejador401(tokenEnviado));
  let ultimaRespuestaEn: number | null = null;

  function urlBase(): string {
    const base = opciones.baseUrl ?? process.env.EXPO_PUBLIC_API_URL;
    if (!base) throw new Error('Falta EXPO_PUBLIC_API_URL (revisa el archivo .env).');
    return base.replace(/\/+$/, '');
  }

  function tiempoDeEspera(): number {
    const despierto =
      ultimaRespuestaEn !== null && ahora() - ultimaRespuestaEn <= INACTIVIDAD_SERVIDOR_DORMIDO_MS;
    return despierto ? TIMEOUT_PETICION_MS : TIMEOUT_PRIMERA_PETICION_MS;
  }

  interface Contenido {
    cuerpo?: BodyInit;
    /** Solo el JSON lo fija; en multipart lo calcula fetch (lleva el boundary). */
    tipoContenido?: string;
    /** Tiempo de espera propio (subidas); por defecto el de una petición normal. */
    tiempo?: number;
  }

  async function ejecutar<T>(metodo: Metodo, ruta: string, envio: Contenido): Promise<T> {
    const url = `${urlBase()}${ruta}`;
    const controlador = new AbortController();
    let vencido = false;
    const temporizador = setTimeout(() => {
      vencido = true;
      controlador.abort();
    }, envio.tiempo ?? tiempoDeEspera());

    try {
      const token = await obtenerToken();
      const encabezados: Record<string, string> = { Accept: 'application/json' };
      if (token) encabezados.Authorization = `Bearer ${token}`;
      if (envio.tipoContenido) encabezados['Content-Type'] = envio.tipoContenido;

      let status: number;
      let texto: string;
      try {
        const respuesta = await fetchImpl(url, {
          method: metodo,
          headers: encabezados,
          body: envio.cuerpo,
          signal: controlador.signal,
        });
        ultimaRespuestaEn = ahora();
        status = respuesta.status;
        texto = await respuesta.text();
      } catch (causa) {
        throw vencido ? new ErrorTimeout(causa) : new ErrorSinConexion(causa);
      }

      const contenido = leerCuerpo(texto);
      // Un 401 con token fuera de los endpoints de acceso es una sesión vencida o revocada.
      if (status === 401 && token && !esRutaDeAcceso(ruta)) alRecibir401(token);
      if (status < 200 || status >= 300) throw aErrorApi(status, contenido);
      return contenido as T;
    } finally {
      clearTimeout(temporizador);
    }
  }

  function solicitar<T>(
    metodo: Metodo,
    ruta: string,
    cuerpo?: unknown,
    opciones?: OpcionesPeticion,
  ): Promise<T> {
    return ejecutar<T>(metodo, ruta, {
      ...(cuerpo === undefined
        ? {}
        : { cuerpo: JSON.stringify(cuerpo), tipoContenido: 'application/json' }),
      tiempo: opciones?.tiempo,
    });
  }

  /**
   * Sube el archivo con el cargador NATIVO (multipart): el fetch de React Native no logra enviar un
   * FormData con archivos locales en Android. Antes comprueba que el archivo exista, no esté vacío
   * y no pase de 10 MB.
   */
  async function subirArchivo<T>(
    ruta: string,
    campo: string,
    archivo: ArchivoSubida,
    extras?: Record<string, string>,
  ): Promise<T> {
    const info = await infoImpl(archivo.uri).catch(() => null);
    if (info !== null) {
      if (!info.exists || !info.size) throw new ErrorArchivo('ilegible');
      if (info.size > TAMANO_MAXIMO_FOTO_BYTES) throw new ErrorArchivo('grande');
    }

    const token = await obtenerToken();
    const encabezados: Record<string, string> = { Accept: 'application/json' };
    if (token) encabezados.Authorization = `Bearer ${token}`;
    // Sin Content-Type: el cargador lo calcula con el boundary.
    const opcionesSubida: FileSystem.FileSystemUploadOptions = {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: campo,
      mimeType: archivo.type,
      headers: encabezados,
      ...(extras && Object.keys(extras).length > 0 ? { parameters: extras } : {}),
    };

    let cancelar: (() => Promise<void>) | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const vencimiento = new Promise<never>((_resolver, rechazar) => {
      temporizador = setTimeout(() => {
        void cancelar?.().catch(() => undefined);
        rechazar(new ErrorTimeout());
      }, TIMEOUT_SUBIDA_MS);
    });

    let respuesta: RespuestaSubida;
    try {
      respuesta = await Promise.race([
        subirImpl(`${urlBase()}${ruta}`, archivo.uri, opcionesSubida, (c) => {
          cancelar = c;
        }),
        vencimiento,
      ]);
    } catch (causa) {
      if (causa instanceof ErrorTimeout) throw causa;
      throw new ErrorSinConexion(causa);
    } finally {
      clearTimeout(temporizador);
    }
    ultimaRespuestaEn = ahora();

    const contenido = leerCuerpo(respuesta.body);
    if (respuesta.status === 401 && token && !esRutaDeAcceso(ruta)) alRecibir401(token);
    if (respuesta.status < 200 || respuesta.status >= 300) {
      throw aErrorApi(respuesta.status, contenido);
    }
    return contenido as T;
  }

  return {
    solicitar,
    subirArchivo,
    get: (ruta) => solicitar('GET', ruta),
    post: (ruta, cuerpo, opciones) => solicitar('POST', ruta, cuerpo, opciones),
    put: (ruta, cuerpo) => solicitar('PUT', ruta, cuerpo),
    patch: (ruta, cuerpo) => solicitar('PATCH', ruta, cuerpo),
    delete: (ruta) => solicitar('DELETE', ruta),
  };
}

/** Cliente de toda la app. */
export const api = crearClienteApi();
