import type { components } from '../api/tipos.gen';
import { type BorradorContrato, normalizarDocumento } from './esquemas';
import { esPlantillaVivienda } from './plantilla';

export type CuerpoCrearContrato = components['schemas']['CrearContratoDto'];

/**
 * Cuerpo de POST /contratos. Exactamente uno de inquilino_id / inquilino_nuevo; depósito omitido en
 * vivienda o si es 0/vacío; textos opcionales vacíos omitidos. Dinero en centavos enteros.
 */
export function construirCuerpo(b: BorradorContrato): CuerpoCrearContrato {
  if (!b.unidadId || !b.plantilla || b.canonCentavos === null) {
    throw new Error('El borrador del contrato está incompleto.');
  }
  const cuerpo: CuerpoCrearContrato = {
    unidad_id: b.unidadId,
    tipo_plantilla: b.plantilla,
    canon_centavos: b.canonCentavos,
    dia_pago: Number(b.diaPago),
    forma_pago: b.formaPago.trim(),
    datos_recaudo: b.datosRecaudo.trim(),
    fecha_inicio: b.fechaInicio,
    fecha_fin: b.fechaFin,
  };
  if (b.modoInquilino === 'existente') {
    cuerpo.inquilino_id = b.inquilinoId ?? '';
  } else {
    cuerpo.inquilino_nuevo = {
      nombre: b.nombre.trim(),
      cedula: normalizarDocumento(b.documento),
      telefono: b.telefono.trim(),
    };
  }
  if (!esPlantillaVivienda(b.plantilla) && b.depositoCentavos) {
    cuerpo.deposito_centavos = b.depositoCentavos;
  }
  const fiador = b.datosFiador.trim();
  if (fiador) cuerpo.datos_fiador_o_poliza = fiador;
  const condiciones = b.condiciones.trim();
  if (condiciones) cuerpo.condicionesParticularesTexto = condiciones;
  return cuerpo;
}
