// Validación por paso del asistente de nuevo contrato. Solo ayuda al usuario: el servidor manda.
// Dinero en centavos enteros; fechas como "AAAA-MM-DD".

import { z } from 'zod';

import { compararFechas } from '../utilidades/fechas';
import { esPlantillaVivienda, type TipoPlantilla } from './plantilla';

export const PASO = {
  UNIDAD: 0,
  INQUILINO: 1,
  PAGO: 2,
  FECHAS: 3,
  GARANTIAS: 4,
  RESUMEN: 5,
} as const;
export const TOTAL_PASOS = 6;

export interface BorradorContrato {
  inmuebleId: string | null;
  unidadId: string | null;
  /** Plantilla de la unidad elegida (la fija la unidad; no se elige). */
  plantilla: TipoPlantilla | null;
  modoInquilino: 'nuevo' | 'existente';
  inquilinoId: string | null;
  nombre: string;
  documento: string;
  telefono: string;
  canonCentavos: number | null;
  diaPago: string;
  formaPago: string;
  datosRecaudo: string;
  depositoCentavos: number | null;
  fechaInicio: string;
  fechaFin: string;
  /** 6, 12, 24 o 36; null = "Otra fecha". */
  duracionMeses: number | null;
  datosFiador: string;
  condiciones: string;
}

export function borradorInicial(hoy: string): BorradorContrato {
  return {
    inmuebleId: null,
    unidadId: null,
    plantilla: null,
    modoInquilino: 'nuevo',
    inquilinoId: null,
    nombre: '',
    documento: '',
    telefono: '',
    canonCentavos: null,
    diaPago: '',
    formaPago: '',
    datosRecaudo: '',
    depositoCentavos: null,
    fechaInicio: hoy,
    fechaFin: '',
    duracionMeses: 12,
    datosFiador: '',
    condiciones: '',
  };
}

/** Misma normalización que el backend: sin puntos, espacios ni guiones, en mayúsculas. */
export function normalizarDocumento(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export type ErroresPaso = Partial<Record<keyof BorradorContrato, string>>;

function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  try {
    compararFechas(texto, texto);
    return true;
  } catch {
    return false;
  }
}

const textoObligatorio = (mensaje: string) => z.string().trim().min(1, mensaje);

const esquemaInquilinoNuevo = z.object({
  nombre: textoObligatorio('Escribe el nombre del inquilino.'),
  telefono: textoObligatorio('Escribe el teléfono del inquilino.'),
  documento: z
    .string()
    .transform(normalizarDocumento)
    .refine(
      (v) => v.length >= 5 && v.length <= 20,
      'El documento debe tener entre 5 y 20 caracteres.',
    ),
});

function esquemaPago(plantilla: TipoPlantilla | null) {
  return z.object({
    canonCentavos: z
      .number({ error: 'Escribe el canon mensual.' })
      .int()
      .nullable()
      .refine((v) => v !== null && v > 0, 'Escribe el canon mensual (mayor que cero).'),
    diaPago: z
      .string()
      .refine(
        (v) => /^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 31,
        'El día de pago es un número del 1 al 31.',
      ),
    formaPago: textoObligatorio('Escribe la forma de pago.'),
    datosRecaudo: textoObligatorio('Escribe los datos de recaudo.'),
    // En vivienda no hay depósito: lo que haya en el campo se ignora.
    depositoCentavos: z
      .number()
      .nullable()
      .refine(
        (v) =>
          (plantilla !== null && esPlantillaVivienda(plantilla)) ||
          v === null ||
          (Number.isInteger(v) && v >= 0),
        'El depósito no puede ser negativo.',
      ),
  });
}

function aErrores(resultado: z.ZodSafeParseResult<unknown>): ErroresPaso {
  if (resultado.success) return {};
  const errores: ErroresPaso = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as keyof BorradorContrato;
    if (campo && errores[campo] === undefined) errores[campo] = problema.message;
  }
  return errores;
}

/** Errores del paso indicado (vacío si todo está bien). `hoy` es hoyBogota(). */
export function erroresDePaso(paso: number, b: BorradorContrato, hoy: string): ErroresPaso {
  switch (paso) {
    case PASO.UNIDAD:
      return b.unidadId ? {} : { unidadId: 'Elige la unidad que vas a arrendar.' };
    case PASO.INQUILINO:
      if (b.modoInquilino === 'existente') {
        return b.inquilinoId ? {} : { inquilinoId: 'Elige al inquilino.' };
      }
      return aErrores(esquemaInquilinoNuevo.safeParse(b));
    case PASO.PAGO:
      return aErrores(esquemaPago(b.plantilla).safeParse(b));
    case PASO.FECHAS: {
      const errores: ErroresPaso = {};
      if (!esFechaValida(b.fechaInicio)) errores.fechaInicio = 'Elige la fecha de inicio.';
      if (!esFechaValida(b.fechaFin)) {
        errores.fechaFin = 'Elige la fecha de fin.';
      } else if (esFechaValida(b.fechaInicio) && compararFechas(b.fechaFin, b.fechaInicio) <= 0) {
        errores.fechaFin = 'La fecha de fin debe ser posterior a la de inicio.';
      } else if (compararFechas(b.fechaFin, hoy) <= 0) {
        errores.fechaFin = 'La fecha de fin debe ser posterior a hoy.';
      }
      return errores;
    }
    default:
      return {};
  }
}
