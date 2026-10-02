// Reglas del reporte de pago del inquilino. La app NO decide: el servidor valida período, fecha y
// estado del contrato. Aquí solo se calcula lo que ayuda a la persona (qué períodos ofrecer, qué
// monto precargar, qué avisar) y se mantiene la clave de idempotencia de cada borrador.

import type { EstadoContratoApi, PeriodoCuenta } from '../api/contratos';
import type { CuerpoRechazo, MotivoRechazoPago, PeriodoCuentaPago } from '../api/pagos';
import { BorradorIdempotente as BorradorGenerico } from '../utilidades/borradorIdempotente';

export const AVISO_PARCIAL =
  'Este monto es menor al canon: el período quedará como pago parcial al aprobarse.';
export const AVISO_MAYOR =
  'Un monto mayor no cubre otros meses; cada período se reporta por separado.';
export const AVISO_REEMPLAZO =
  'Ya tienes un comprobante en revisión para este período; al enviar este, el anterior quedará reemplazado.';

/** "2026-10-01T00:00:00.000Z" o "2026-10-01" → "2026-10-01". */
export function diaDePeriodo(periodo: string): string {
  return periodo.slice(0, 10);
}

/**
 * Períodos donde tiene sentido ofrecer "Reportar pago". Contrato ACTIVO: todo lo que no esté
 * PAGADO (un período EN_REVISION se puede volver a reportar: el comprobante anterior queda
 * reemplazado). Contrato vencido o terminado: solo VENCIDO o PARCIAL (el servidor exige período
 * explícito). PROGRAMADO y CANCELADO: ninguno.
 */
export function periodosReportables(
  periodos: readonly PeriodoCuenta[],
  estadoContrato: EstadoContratoApi,
): PeriodoCuenta[] {
  if (estadoContrato === 'ACTIVO') return periodos.filter((p) => p.estado !== 'PAGADO');
  if (estadoContrato === 'VENCIDO' || estadoContrato === 'TERMINADO_ANTICIPADAMENTE') {
    return periodos.filter((p) => p.estado === 'VENCIDO' || p.estado === 'PARCIAL');
  }
  return [];
}

/**
 * El período con el que abre el formulario: el primero de `preferidos` que sea reportable (el que
 * llegó por parámetro y luego `proximo_periodo` del panel); si no, el más antiguo reportable.
 */
export function periodoInicial(
  periodos: readonly PeriodoCuenta[],
  estadoContrato: EstadoContratoApi,
  preferidos: readonly (string | null | undefined)[],
): PeriodoCuenta | null {
  const reportables = periodosReportables(periodos, estadoContrato);
  for (const preferido of preferidos) {
    if (!preferido) continue;
    const dia = diaDePeriodo(preferido);
    const encontrado = reportables.find((p) => diaDePeriodo(p.periodo) === dia);
    if (encontrado) return encontrado;
  }
  const ordenados = [...reportables].sort((a, b) => a.periodo.localeCompare(b.periodo));
  return ordenados[0] ?? null;
}

/** Lo que falta por cubrir del período: canon menos lo ya aprobado (si no queda saldo, el canon). */
export function montoSugerido(periodo: PeriodoCuenta): number {
  const saldo = periodo.canonVigenteCentavos - periodo.montoAprobadoCentavos;
  return saldo > 0 ? saldo : periodo.canonVigenteCentavos;
}

/** Avisos (no bloquean: el servidor no compara el monto con el canon). */
export function avisoDeMonto(
  montoCentavos: number | null,
  periodo: PeriodoCuenta,
): 'parcial' | 'mayor' | null {
  if (montoCentavos === null) return null;
  const saldo = montoSugerido(periodo);
  if (montoCentavos < saldo) return 'parcial';
  if (montoCentavos > saldo) return 'mayor';
  return null;
}

const TEXTO_MOTIVO: Record<Exclude<MotivoRechazoPago, 'OTRO'>, string> = {
  MONTO_NO_COINCIDE: 'El monto no coincide',
  PAGO_NO_VISIBLE: 'No se ve el pago',
  COMPROBANTE_ILEGIBLE: 'El comprobante no se lee',
};

/**
 * Motivo del rechazo en texto humano. `OTRO` solo trae el mensaje; un rechazo anterior a B0.6-A1
 * (sin motivo ni mensaje) no inventa nada.
 */
export function textoMotivoRechazo(
  motivo: MotivoRechazoPago | null,
  mensaje: string | null,
): { motivo: string | null; mensaje: string | null } {
  const limpio = mensaje?.trim() ? mensaje.trim() : null;
  return {
    motivo: motivo && motivo !== 'OTRO' ? TEXTO_MOTIVO[motivo] : null,
    mensaje: limpio,
  };
}

export interface ContenidoBorrador {
  periodo: string;
  montoCentavos: number;
  fechaReportada: string;
  /** Uri del archivo ya preparado (la que se sube). */
  archivoUri: string;
}

/**
 * UNA clave de idempotencia por borrador. Se conserva mientras el contenido (período, monto, fecha,
 * archivo) no cambie, aunque haya errores de red o "sin respuesta": así reenviar no duplica el pago.
 * Cambia cuando cambia cualquiera de esos cuatro y tras un envío exitoso (`reiniciar`). La regla
 * vive en el borrador genérico (src/utilidades/borradorIdempotente.ts); esto solo fija los campos.
 */
export class BorradorIdempotente {
  private readonly base: BorradorGenerico;

  constructor(generar?: () => string) {
    this.base = new BorradorGenerico(generar);
  }

  claveParaEnvio(contenido: ContenidoBorrador): string {
    return this.base.claveParaEnvio(
      [contenido.periodo, contenido.montoCentavos, contenido.fechaReportada],
      contenido.archivoUri,
    );
  }

  reiniciar(): void {
    this.base.reiniciar();
  }
}

// ---------------------------------------------------------------------------------------------
// Arrendador (E7-B): comparar lo esperado con lo reportado y rechazar con motivo
// ---------------------------------------------------------------------------------------------

export const AVISO_APROBAR_PARCIAL = 'Al aprobar, el período quedará como pago parcial.';
export const AVISO_APROBAR_MAYOR = 'Un monto mayor no cubre otros períodos.';

interface PagoConPeriodo {
  monto_centavos: number;
  /** Primer día del mes que cubre. */
  periodo: string;
  periodo_cuenta: PeriodoCuentaPago | null;
}

export interface ComparacionDePago {
  canon: number;
  aprobado: number;
  /** Lo que falta por cubrir: canon vigente del período menos lo ya aprobado. */
  saldo: number;
  reportado: number;
  /** Reportado menos saldo: negativo = menor, positivo = mayor. */
  diferencia: number;
  aviso: 'parcial' | 'mayor' | null;
}

/**
 * "Esperado vs. reportado" con los valores del servidor (periodo_cuenta). Sin periodo_cuenta no hay
 * comparación: no se inventa nada. El aviso es el mismo criterio de E7-A (avisoDeMonto).
 */
export function comparacionDePago(pago: PagoConPeriodo): ComparacionDePago | null {
  const bloque = pago.periodo_cuenta;
  if (!bloque) return null;
  const saldo = Math.max(0, bloque.canon_vigente_centavos - bloque.monto_aprobado_centavos);
  const aviso = avisoDeMonto(pago.monto_centavos, {
    periodo: pago.periodo,
    fechaLimite: bloque.fecha_limite,
    canonVigenteCentavos: bloque.canon_vigente_centavos,
    estado: bloque.estado,
    montoAprobadoCentavos: bloque.monto_aprobado_centavos,
  });
  return {
    canon: bloque.canon_vigente_centavos,
    aprobado: bloque.monto_aprobado_centavos,
    saldo,
    reportado: pago.monto_centavos,
    diferencia: pago.monto_centavos - saldo,
    aviso,
  };
}

/** Cómo quedaría el período al aprobar: Parcial si el monto es menor al saldo; si no, Pagado. */
export function efectoDeAprobar(pago: PagoConPeriodo): 'PAGADO' | 'PARCIAL' | null {
  const comparacion = comparacionDePago(pago);
  if (!comparacion) return null;
  return comparacion.aviso === 'parcial' ? 'PARCIAL' : 'PAGADO';
}

export const MAXIMO_MENSAJE_RECHAZO = 200;

export const MOTIVOS_RECHAZO: readonly { valor: MotivoRechazoPago; etiqueta: string }[] = [
  { valor: 'MONTO_NO_COINCIDE', etiqueta: 'El monto no coincide' },
  { valor: 'PAGO_NO_VISIBLE', etiqueta: 'No se ve el pago' },
  { valor: 'COMPROBANTE_ILEGIBLE', etiqueta: 'El comprobante no se lee' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

/**
 * El cuerpo del rechazo: la app nunca rechaza sin motivo, "Otro" exige mensaje (hasta 200 caracteres)
 * y un mensaje vacío se omite. El servidor vuelve a validar.
 */
export function validarRechazo(
  motivo: MotivoRechazoPago | null,
  mensaje: string,
): { cuerpo: CuerpoRechazo; error?: undefined } | { error: string; cuerpo?: undefined } {
  if (motivo === null) return { error: 'Elige el motivo del rechazo.' };
  const texto = mensaje.trim();
  if (motivo === 'OTRO' && texto === '') {
    return { error: 'Escribe un mensaje que explique el rechazo.' };
  }
  if (texto.length > MAXIMO_MENSAJE_RECHAZO) {
    return { error: `El mensaje puede tener hasta ${MAXIMO_MENSAJE_RECHAZO} caracteres.` };
  }
  return { cuerpo: texto === '' ? { motivo } : { motivo, mensaje: texto } };
}
