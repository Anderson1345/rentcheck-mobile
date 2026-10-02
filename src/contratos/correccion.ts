// Corrección de un contrato sin vincular (PATCH /contratos/:id y /contratos/:id/inquilino): se
// precargan los valores actuales y se envían SOLO los campos que cambiaron. La validación es una
// ayuda; el servidor manda (si hay pagos o incrementos responde CONTRATO_NO_EDITABLE).

import type { ContratoDetalle } from '../api/contratos';
import type { components } from '../api/tipos.gen';
import { compararFechas } from '../utilidades/fechas';
import { normalizarDocumento } from './esquemas';
import { esPlantillaVivienda } from './plantilla';

export type CuerpoCorregirContrato = components['schemas']['CorregirContratoDto'];
export type CuerpoCorregirInquilino = components['schemas']['CorregirInquilinoContratoDto'];

export interface ValoresCorreccion {
  canonCentavos: number | null;
  diaPago: string;
  formaPago: string;
  datosRecaudo: string;
  depositoCentavos: number | null;
  datosFiador: string;
  condiciones: string;
  fechaInicio: string;
  fechaFin: string;
}

const dia = (fecha: string) => fecha.slice(0, 10);

/** Valores actuales del detalle; los null (p. ej. datos_recaudo) quedan como campo vacío. */
export function valoresDeContrato(c: ContratoDetalle): ValoresCorreccion {
  return {
    canonCentavos: c.canon_centavos,
    diaPago: c.dia_pago === undefined ? '' : String(c.dia_pago),
    formaPago: c.forma_pago ?? '',
    datosRecaudo: c.datos_recaudo ?? '',
    depositoCentavos: c.deposito_centavos ?? null,
    datosFiador: c.datos_fiador_o_poliza ?? '',
    condiciones: c.condicionesParticularesTexto ?? '',
    fechaInicio: dia(c.fecha_inicio),
    fechaFin: dia(c.fecha_fin),
  };
}

/** Solo los campos cambiados. Quitar fiador, condiciones o depósito se envía como null. */
export function camposCambiadosContrato(
  original: ContratoDetalle,
  nuevos: ValoresCorreccion,
): CuerpoCorregirContrato {
  const antes = valoresDeContrato(original);
  const cambios: CuerpoCorregirContrato = {};
  if (nuevos.canonCentavos !== null && nuevos.canonCentavos !== antes.canonCentavos) {
    cambios.canon_centavos = nuevos.canonCentavos;
  }
  if (nuevos.diaPago.trim() !== antes.diaPago && /^\d+$/.test(nuevos.diaPago.trim())) {
    cambios.dia_pago = Number(nuevos.diaPago.trim());
  }
  if (nuevos.formaPago.trim() !== antes.formaPago.trim())
    cambios.forma_pago = nuevos.formaPago.trim();
  if (nuevos.datosRecaudo.trim() !== antes.datosRecaudo.trim()) {
    cambios.datos_recaudo = nuevos.datosRecaudo.trim();
  }
  if (!esPlantillaVivienda(original.tipo_plantilla)) {
    const nuevoDeposito = nuevos.depositoCentavos || null;
    const antesDeposito = antes.depositoCentavos || null;
    if (nuevoDeposito !== antesDeposito) cambios.deposito_centavos = nuevoDeposito;
  }
  const fiador = nuevos.datosFiador.trim();
  if (fiador !== antes.datosFiador.trim()) cambios.datos_fiador_o_poliza = fiador || null;
  const condiciones = nuevos.condiciones.trim();
  if (condiciones !== antes.condiciones.trim()) {
    cambios.condicionesParticularesTexto = condiciones || null;
  }
  if (nuevos.fechaInicio !== antes.fechaInicio) cambios.fecha_inicio = nuevos.fechaInicio;
  if (nuevos.fechaFin !== antes.fechaFin) cambios.fecha_fin = nuevos.fechaFin;
  return cambios;
}

export type ErroresCorreccion = Partial<Record<keyof ValoresCorreccion, string>>;

function esFecha(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  try {
    compararFechas(texto, texto);
    return true;
  } catch {
    return false;
  }
}

/** Valida solo lo que cambió: lo que no se tocó (aunque venga vacío del servidor) no es un error. */
export function erroresCorreccion(
  original: ContratoDetalle,
  nuevos: ValoresCorreccion,
  hoy: string,
): ErroresCorreccion {
  const antes = valoresDeContrato(original);
  const errores: ErroresCorreccion = {};
  if (nuevos.canonCentavos !== antes.canonCentavos) {
    if (nuevos.canonCentavos === null || nuevos.canonCentavos <= 0) {
      errores.canonCentavos = 'Escribe el canon mensual (mayor que cero).';
    }
  }
  if (nuevos.diaPago.trim() !== antes.diaPago) {
    const d = nuevos.diaPago.trim();
    if (!/^\d+$/.test(d) || Number(d) < 1 || Number(d) > 31) {
      errores.diaPago = 'El día de pago es un número del 1 al 31.';
    }
  }
  if (nuevos.formaPago.trim() !== antes.formaPago.trim() && nuevos.formaPago.trim() === '') {
    errores.formaPago = 'Escribe la forma de pago.';
  }
  if (
    nuevos.datosRecaudo.trim() !== antes.datosRecaudo.trim() &&
    nuevos.datosRecaudo.trim() === ''
  ) {
    errores.datosRecaudo = 'Escribe los datos de recaudo.';
  }
  if (
    !esPlantillaVivienda(original.tipo_plantilla) &&
    nuevos.depositoCentavos !== antes.depositoCentavos &&
    nuevos.depositoCentavos !== null &&
    nuevos.depositoCentavos < 0
  ) {
    errores.depositoCentavos = 'El depósito no puede ser negativo.';
  }
  if (nuevos.fechaInicio !== antes.fechaInicio || nuevos.fechaFin !== antes.fechaFin) {
    if (!esFecha(nuevos.fechaInicio)) errores.fechaInicio = 'Elige la fecha de inicio.';
    if (!esFecha(nuevos.fechaFin)) {
      errores.fechaFin = 'Elige la fecha de fin.';
    } else if (
      esFecha(nuevos.fechaInicio) &&
      compararFechas(nuevos.fechaFin, nuevos.fechaInicio) <= 0
    ) {
      errores.fechaFin = 'La fecha de fin debe ser posterior a la de inicio.';
    } else if (compararFechas(nuevos.fechaFin, hoy) <= 0) {
      errores.fechaFin = 'La fecha de fin debe ser posterior a hoy.';
    }
  }
  return errores;
}

export interface ValoresInquilino {
  nombre: string;
  telefono: string;
  cedula: string;
}

/** Solo lo que cambió; la cédula se normaliza igual que en el asistente (y que el backend). */
export function camposCambiadosInquilino(
  original: ValoresInquilino,
  nuevos: ValoresInquilino,
): CuerpoCorregirInquilino {
  const cambios: CuerpoCorregirInquilino = {};
  if (nuevos.nombre.trim() !== original.nombre.trim()) cambios.nombre = nuevos.nombre.trim();
  if (nuevos.telefono.trim() !== original.telefono.trim())
    cambios.telefono = nuevos.telefono.trim();
  const cedula = normalizarDocumento(nuevos.cedula);
  if (cedula !== normalizarDocumento(original.cedula)) cambios.cedula = cedula;
  return cambios;
}

export function erroresInquilino(
  v: ValoresInquilino,
): Partial<Record<keyof ValoresInquilino, string>> {
  const errores: Partial<Record<keyof ValoresInquilino, string>> = {};
  if (v.nombre.trim() === '') errores.nombre = 'Escribe el nombre del inquilino.';
  if (v.telefono.trim() === '') errores.telefono = 'Escribe el teléfono del inquilino.';
  const cedula = normalizarDocumento(v.cedula);
  if (cedula.length < 5 || cedula.length > 20) {
    errores.cedula = 'El documento debe tener entre 5 y 20 caracteres.';
  }
  return errores;
}
