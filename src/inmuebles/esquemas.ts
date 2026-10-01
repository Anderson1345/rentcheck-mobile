// Esquemas de los formularios de inmueble. Solo ayudan al usuario (campos vacíos, estrato según el
// uso): el servidor manda. Reflejan CrearInmuebleDto y ActualizarInmuebleDto del backend.

import { z } from 'zod';

import type { DatosActualizarInmueble, DatosCrearInmueble } from '../api/inmuebles';

const texto = (mensaje: string) => z.string().trim().min(1, mensaje);

const campos = {
  direccion: texto('Escribe la dirección.'),
  ciudad: texto('Escribe la ciudad.'),
  matricula_inmobiliaria: texto('Escribe la matrícula inmobiliaria.'),
  /** Estrato 1 a 6; null mientras no se elija. */
  estrato: z.number().int().min(1).max(6).nullable(),
};

export const MENSAJE_ESTRATO = 'Elige el estrato (1 a 6).';

/** Crear: el estrato es obligatorio solo si la unidad principal es residencial. */
export const esquemaCrearInmueble = z
  .object({
    ...campos,
    uso_unidad_principal: z.enum(['RESIDENCIAL', 'COMERCIAL']),
  })
  .superRefine((datos, contexto) => {
    if (datos.uso_unidad_principal === 'RESIDENCIAL' && datos.estrato === null) {
      contexto.addIssue({ code: 'custom', path: ['estrato'], message: MENSAJE_ESTRATO });
    }
  });

/** Editar: el estrato puede quedar vacío; si el servidor no lo permite, responde ESTRATO_REQUERIDO. */
export const esquemaEditarInmueble = z.object(campos);

export type DatosFormularioCrear = z.infer<typeof esquemaCrearInmueble>;
export type DatosFormularioEditar = z.infer<typeof esquemaEditarInmueble>;

/**
 * Cuerpo de POST /inmuebles. El estrato solo se envía si el uso es residencial: con Comercial el
 * campo está oculto y un valor elegido antes no debe viajar.
 */
export function armarCuerpoCrear(datos: DatosFormularioCrear): DatosCrearInmueble {
  const cuerpo: DatosCrearInmueble = {
    direccion: datos.direccion,
    ciudad: datos.ciudad,
    matricula_inmobiliaria: datos.matricula_inmobiliaria,
    uso_unidad_principal: datos.uso_unidad_principal,
  };
  if (datos.uso_unidad_principal === 'RESIDENCIAL' && datos.estrato !== null) {
    cuerpo.estrato = datos.estrato;
  }
  return cuerpo;
}

/**
 * Solo los campos que cambiaron respecto al inmueble guardado (los textos nuevos ya vienen recortados;
 * el estrato vacío se envía como null).
 */
export function camposCambiados(
  original: DatosFormularioEditar,
  nuevos: DatosFormularioEditar,
): DatosActualizarInmueble {
  const cambios: DatosActualizarInmueble = {};
  if (nuevos.direccion !== original.direccion.trim()) cambios.direccion = nuevos.direccion;
  if (nuevos.ciudad !== original.ciudad.trim()) cambios.ciudad = nuevos.ciudad;
  if (nuevos.matricula_inmobiliaria !== original.matricula_inmobiliaria.trim()) {
    cambios.matricula_inmobiliaria = nuevos.matricula_inmobiliaria;
  }
  if (nuevos.estrato !== original.estrato) cambios.estrato = nuevos.estrato;
  return cambios;
}
