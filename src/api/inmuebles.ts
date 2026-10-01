// Excepción documentada: faltan esquemas en OpenAPI (B-57). Los CUERPOS de petición salen de los DTO
// generados (tipos.gen.ts); las RESPUESTAS de /inmuebles no tienen esquema en el OpenAPI y se
// escriben a mano según rentcheck-backend (inmueble.service.ts y el modelo Prisma). Cuando el
// backend las publique, se reemplazan por los tipos generados.

import type { components } from './tipos.gen';
import { api, type ArchivoSubida } from './cliente';

export type DatosCrearInmueble = components['schemas']['CrearInmuebleDto'];
export type DatosActualizarInmueble = components['schemas']['ActualizarInmuebleDto'];
export type UsoPermitido = NonNullable<DatosCrearInmueble['uso_unidad_principal']>;
export type TipoUnidad = 'APARTAMENTO' | 'CASA' | 'LOCAL' | 'PARQUEADERO' | 'HABITACION';

/** Foto lista para subir: el selector solo entrega JPG o PNG. */
export interface ArchivoFoto extends ArchivoSubida {
  type: 'image/jpeg' | 'image/png';
}

export interface UnidadInmueble {
  id: string;
  inmueble_id: string;
  nombre: string;
  tipo: TipoUnidad;
  /** Decimal de Prisma: llega como texto ("58.5") o número; null en la unidad principal recién creada. */
  metros_cuadrados: string | number | null;
  numero_habitaciones: number | null;
  numero_banos: number | null;
  /** Centavos (entero). La unidad principal nace con 0. */
  canon_base_centavos: number;
  ocupantes_maximos: number | null;
  acepta_mascotas: boolean;
  uso_permitido: UsoPermitido;
  /** URL firmada (expira en 1 hora) o null. Nunca se guarda. */
  foto_principal_url: string | null;
  creado_en: string;
}

export interface Inmueble {
  id: string;
  arrendador_id: string;
  direccion: string;
  ciudad: string;
  /** 1 a 6, o null si todas las unidades son comerciales. */
  estrato: number | null;
  matricula_inmobiliaria: string;
  /** URL firmada de la portada (expira en 1 hora) o null. Nunca la ruta interna ni se guarda. */
  foto_portada_url: string | null;
  creado_en: string;
  unidades: UnidadInmueble[];
}

export const listarInmuebles = () => api.get<Inmueble[]>('/inmuebles');

export const obtenerInmueble = (id: string) =>
  api.get<Inmueble>(`/inmuebles/${encodeURIComponent(id)}`);

export const crearInmueble = (datos: DatosCrearInmueble) => api.post<Inmueble>('/inmuebles', datos);

/** Solo los campos recibidos (el servidor deja el resto como está). */
export const actualizarInmueble = (id: string, cambios: DatosActualizarInmueble) =>
  api.patch<Inmueble>(`/inmuebles/${encodeURIComponent(id)}`, cambios);

/** Campo multipart "foto"; JPEG o PNG de hasta 10 MB. Responde el inmueble con la portada nueva. */
export const subirFotoPortada = (id: string, foto: ArchivoFoto) =>
  api.subirArchivo<Inmueble>(`/inmuebles/${encodeURIComponent(id)}/foto-portada`, 'foto', foto);

export interface ResultadoCrearConFoto {
  inmueble: Inmueble;
  /** false si el inmueble se creó pero la foto no se pudo subir. */
  fotoSubida: boolean;
  /** El error de la foto, para mostrarlo; solo si fotoSubida es false. */
  errorFoto?: unknown;
}

/**
 * Crea el inmueble y, si hay foto, la sube DESPUÉS (nunca en el mismo paso). Si crear falla, no se
 * intenta la foto y el error se propaga. Si la foto falla, el inmueble ya existe: no se lanza, se
 * devuelve con fotoSubida en false para que la pantalla avise y se pueda reintentar solo la foto.
 */
export async function crearInmuebleConFoto(
  datos: DatosCrearInmueble,
  foto?: ArchivoFoto,
): Promise<ResultadoCrearConFoto> {
  const creado = await crearInmueble(datos);
  if (!foto) return { inmueble: creado, fotoSubida: true };
  try {
    const conFoto = await subirFotoPortada(creado.id, foto);
    return { inmueble: conFoto, fotoSubida: true };
  } catch (errorFoto) {
    return { inmueble: creado, fotoSubida: false, errorFoto };
  }
}
