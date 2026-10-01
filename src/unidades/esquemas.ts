// Formulario de unidad. Los campos numéricos se escriben como texto y se convierten al enviar. Solo
// ayuda al usuario: el servidor manda (reglas 6 y 7 del Contexto). Dinero siempre en centavos enteros.

import { z } from 'zod';

import type {
  DatosActualizarUnidad,
  DatosCrearUnidad,
  TipoUnidad,
  UnidadInmueble,
  UsoPermitido,
} from '../api/inmuebles';

export interface ValoresUnidad {
  nombre: string;
  tipo: TipoUnidad;
  uso: UsoPermitido;
  canonCentavos: number | null;
  /** Texto: admite coma o punto decimal. */
  area: string;
  habitaciones: string;
  banos: string;
  ocupantes: string;
  mascotas: boolean;
}

export const VALORES_UNIDAD_VACIOS: ValoresUnidad = {
  nombre: '',
  tipo: 'APARTAMENTO',
  uso: 'RESIDENCIAL',
  canonCentavos: null,
  area: '',
  habitaciones: '',
  banos: '',
  ocupantes: '',
  mascotas: false,
};

/** "58,5" o "58.5" → 58.5; null si no es un número con hasta dos decimales. */
function aDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : null;
}

function aEntero(texto: string): number | null {
  const limpio = texto.trim();
  return /^\d+$/.test(limpio) ? Number(limpio) : null;
}

export const esquemaUnidad = z
  .object({
    nombre: z.string().trim().min(1, 'Escribe el nombre de la unidad.'),
    tipo: z.enum(['APARTAMENTO', 'CASA', 'LOCAL', 'PARQUEADERO', 'HABITACION']),
    uso: z.enum(['RESIDENCIAL', 'COMERCIAL']),
    canonCentavos: z
      .number({ error: 'Escribe el canon base.' })
      .int()
      .min(0, 'El canon no puede ser negativo.')
      .nullable()
      .refine((valor) => valor !== null, 'Escribe el canon base.'),
    area: z.string(),
    habitaciones: z.string(),
    banos: z.string(),
    ocupantes: z.string(),
    mascotas: z.boolean(),
  })
  .superRefine((v, contexto) => {
    if (v.uso !== 'RESIDENCIAL') return;
    const problema = (path: keyof ValoresUnidad, message: string) =>
      contexto.addIssue({ code: 'custom', path: [path], message });
    const area = aDecimal(v.area);
    if (area === null || area < 1) problema('area', 'Escribe el área en m² (mínimo 1).');
    if (aEntero(v.habitaciones) === null)
      problema('habitaciones', 'Escribe las habitaciones (0 o más).');
    if (aEntero(v.banos) === null) problema('banos', 'Escribe los baños (0 o más).');
    const ocupantes = aEntero(v.ocupantes);
    if (ocupantes === null || ocupantes < 1) {
      problema('ocupantes', 'Escribe los ocupantes máximos (mínimo 1).');
    }
  });

/** Local y Parqueadero suelen ser comerciales: se sugiere, la persona puede cambiarlo. */
export function tipoSugeridoUso(tipo: TipoUnidad): UsoPermitido | null {
  return tipo === 'LOCAL' || tipo === 'PARQUEADERO' ? 'COMERCIAL' : null;
}

/** Cuerpo de POST. Comercial: sin campos residenciales y acepta_mascotas en false. */
export function armarCuerpoCrearUnidad(v: ValoresUnidad): DatosCrearUnidad {
  const cuerpo: DatosCrearUnidad = {
    nombre: v.nombre.trim(),
    tipo: v.tipo,
    uso_permitido: v.uso,
    canon_base_centavos: v.canonCentavos ?? 0,
    acepta_mascotas: v.uso === 'RESIDENCIAL' ? v.mascotas : false,
  };
  if (v.uso === 'RESIDENCIAL') {
    cuerpo.metros_cuadrados = aDecimal(v.area) ?? undefined;
    cuerpo.numero_habitaciones = aEntero(v.habitaciones) ?? undefined;
    cuerpo.numero_banos = aEntero(v.banos) ?? undefined;
    cuerpo.ocupantes_maximos = aEntero(v.ocupantes) ?? undefined;
  }
  return cuerpo;
}

const texto = (n: number | string | null | undefined): string =>
  n === null || n === undefined ? '' : String(Number(n));

/** Valores del formulario a partir de la unidad del servidor (el área puede llegar como "58.50"). */
export function valoresDeUnidad(u: UnidadInmueble): ValoresUnidad {
  return {
    nombre: u.nombre,
    tipo: u.tipo,
    uso: u.uso_permitido,
    canonCentavos: u.canon_base_centavos,
    area: texto(u.metros_cuadrados),
    habitaciones: texto(u.numero_habitaciones),
    banos: texto(u.numero_banos),
    ocupantes: texto(u.ocupantes_maximos),
    mascotas: u.acepta_mascotas,
  };
}

/**
 * Solo los campos que cambiaron. Si el uso cambia a Residencial se envían los CUATRO campos
 * residenciales completos (el servidor los exige juntos). Si el uso es comercial, los residenciales
 * ocultos no se envían; al pasar a comercial las mascotas quedan en false.
 */
export function camposCambiadosUnidad(
  original: UnidadInmueble,
  nuevos: ValoresUnidad,
): DatosActualizarUnidad {
  const antes = valoresDeUnidad(original);
  const cambios: DatosActualizarUnidad = {};
  const nombre = nuevos.nombre.trim();
  if (nombre !== antes.nombre.trim()) cambios.nombre = nombre;
  if (nuevos.tipo !== antes.tipo) cambios.tipo = nuevos.tipo;
  if (nuevos.canonCentavos !== null && nuevos.canonCentavos !== antes.canonCentavos) {
    cambios.canon_base_centavos = nuevos.canonCentavos;
  }
  const cambiaUso = nuevos.uso !== antes.uso;
  if (cambiaUso) cambios.uso_permitido = nuevos.uso;

  if (nuevos.uso === 'RESIDENCIAL') {
    const enviarTodo = cambiaUso;
    const area = aDecimal(nuevos.area);
    const habitaciones = aEntero(nuevos.habitaciones);
    const banos = aEntero(nuevos.banos);
    const ocupantes = aEntero(nuevos.ocupantes);
    if (area !== null && (enviarTodo || area !== Number(antes.area || NaN))) {
      cambios.metros_cuadrados = area;
    }
    if (habitaciones !== null && (enviarTodo || nuevos.habitaciones !== antes.habitaciones)) {
      cambios.numero_habitaciones = habitaciones;
    }
    if (banos !== null && (enviarTodo || nuevos.banos !== antes.banos))
      cambios.numero_banos = banos;
    if (ocupantes !== null && (enviarTodo || nuevos.ocupantes !== antes.ocupantes)) {
      cambios.ocupantes_maximos = ocupantes;
    }
    if (nuevos.mascotas !== antes.mascotas) cambios.acepta_mascotas = nuevos.mascotas;
  } else if (cambiaUso && antes.mascotas) {
    cambios.acepta_mascotas = false;
  }
  return cambios;
}
