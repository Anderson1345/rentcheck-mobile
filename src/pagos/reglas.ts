// Reglas del reporte de pago del inquilino. La app NO decide: el servidor valida período, fecha y
// estado del contrato. Aquí solo se calcula lo que ayuda a la persona (qué períodos ofrecer, qué
// monto precargar, qué avisar) y se mantiene la clave de idempotencia de cada borrador.

import type { EstadoContratoApi, PeriodoCuenta } from '../api/contratos';
import type { MotivoRechazoPago } from '../api/pagos';
import { generarClaveIdempotencia } from '../utilidades/idempotencia';

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
 * Cambia cuando cambia cualquiera de esos cuatro y tras un envío exitoso (`reiniciar`).
 */
export class BorradorIdempotente {
  private actual: { huella: string; clave: string } | null = null;

  constructor(private readonly generar: () => string = () => generarClaveIdempotencia()) {}

  claveParaEnvio(contenido: ContenidoBorrador): string {
    const huella = JSON.stringify([
      contenido.periodo,
      contenido.montoCentavos,
      contenido.fechaReportada,
      contenido.archivoUri,
    ]);
    if (!this.actual || this.actual.huella !== huella) {
      this.actual = { huella, clave: this.generar() };
    }
    return this.actual.clave;
  }

  reiniciar(): void {
    this.actual = null;
  }
}
