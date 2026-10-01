// Cliente de la API de RentCheck: fetch con tiempo de espera y errores tipados.
// Sin reintentos automáticos (el de 401 llega en E2).

/** Render gratis duerme: la primera petición (o la que sigue a un largo silencio) puede tardar ~60 s. */
export const TIMEOUT_PRIMERA_PETICION_MS = 60_000;
export const TIMEOUT_PETICION_MS = 20_000;
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

/** El servidor no respondió dentro del tiempo permitido. */
export class ErrorTimeout extends ErrorRentCheck {
  constructor() {
    super('El servidor no respondió a tiempo.');
  }
}

/** La petición no llegó al servidor (sin red, sin DNS, conexión cortada). */
export class ErrorSinConexion extends ErrorRentCheck {
  constructor() {
    super('No hay conexión con el servidor.');
  }
}

export type ProveedorToken = () => string | null | Promise<string | null>;

// Punto de inyección del token. Hoy no hay sesión (E2 lo reemplaza con el token de secure-store).
let proveedorToken: ProveedorToken = () => null;

export function establecerProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor;
}

// Punto de inyección del manejo global de 401 (lo conecta SesionProvider).
let manejador401: (tokenEnviado: string) => void = () => undefined;

export function establecerManejador401(manejador: (tokenEnviado: string) => void): void {
  manejador401 = manejador;
}

export interface OpcionesCliente {
  /** Por defecto, EXPO_PUBLIC_API_URL. */
  baseUrl?: string;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  obtenerToken?: ProveedorToken;
  /** Reloj en milisegundos; se inyecta en las pruebas. */
  ahora?: () => number;
  /** Se llama ante un 401 de un endpoint que no es de acceso, con el token que se envió. */
  alRecibir401?: (tokenEnviado: string) => void;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ClienteApi {
  solicitar<T = unknown>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T>;
  get<T = unknown>(ruta: string): Promise<T>;
  post<T = unknown>(ruta: string, cuerpo?: unknown): Promise<T>;
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

  async function solicitar<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
    const url = `${urlBase()}${ruta}`;
    const controlador = new AbortController();
    let vencido = false;
    const temporizador = setTimeout(() => {
      vencido = true;
      controlador.abort();
    }, tiempoDeEspera());

    try {
      const token = await obtenerToken();
      const encabezados: Record<string, string> = { Accept: 'application/json' };
      if (token) encabezados.Authorization = `Bearer ${token}`;
      if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';

      let status: number;
      let texto: string;
      try {
        const respuesta = await fetchImpl(url, {
          method: metodo,
          headers: encabezados,
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
          signal: controlador.signal,
        });
        ultimaRespuestaEn = ahora();
        status = respuesta.status;
        texto = await respuesta.text();
      } catch {
        throw vencido ? new ErrorTimeout() : new ErrorSinConexion();
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

  return {
    solicitar,
    get: (ruta) => solicitar('GET', ruta),
    post: (ruta, cuerpo) => solicitar('POST', ruta, cuerpo),
    put: (ruta, cuerpo) => solicitar('PUT', ruta, cuerpo),
    patch: (ruta, cuerpo) => solicitar('PATCH', ruta, cuerpo),
    delete: (ruta) => solicitar('DELETE', ruta),
  };
}

/** Cliente de toda la app. */
export const api = crearClienteApi();
