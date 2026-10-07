// Mi panel del inquilino (R3-B): solo presentación de lo que responde el servidor (panel, estado de
// cuenta y solicitudes). Montos, estados y vencidos son del servidor; aquí solo se da formato, se cuenta
// cuántos días faltan para la fecha límite (día de Bogotá) y se elige qué parte de la lista mostrar.

import type { PeriodoCuenta } from '../api/contratos';
import type { UrgenciaSolicitud } from '../api/mantenimiento';
import type { PeriodoLinea } from '../componentes/graficas/LineaTiempoPeriodos';
import { URGENCIAS } from '../componentes/estados';
import type { TonoEstado } from '../tema';
import { centavosAPesosTexto } from '../utilidades/dinero';
import {
  diaDeLaSemana,
  diaDeNegocio,
  diasEntre,
  formatearFechaLarga,
  hoyBogota,
} from '../utilidades/fechas';

/** Hasta 5 días antes de la fecha límite el chip pide atención (advertencia); antes, informa. */
const DIAS_AVISO = 5;
/** Meses que muestra "Tus pagos". */
const MESES_LINEA = 12;

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const nombreMes = (fecha: string) => MESES[Number(diaDeNegocio(fecha).slice(5, 7)) - 1];
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Chip de la tarjeta del próximo pago: "Faltan N días", "Vence hoy" o "Vencido hace N días". */
export function plazoDePago(
  fechaLimite: string,
  hoy: string = hoyBogota(),
): { texto: string; tono: TonoEstado } {
  const dias = diasEntre(hoy, fechaLimite);
  if (dias < 0) {
    const n = -dias;
    return { texto: `Vencido hace ${n} ${n === 1 ? 'día' : 'días'}`, tono: 'peligro' };
  }
  if (dias === 0) return { texto: 'Vence hoy', tono: 'advertencia' };
  return {
    texto: dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`,
    tono: dias <= DIAS_AVISO ? 'advertencia' : 'informacion',
  };
}

/** "Tu próximo pago · Octubre" (el mes que cubre el período). */
export function tituloProximoPago(periodo: string): string {
  return `Tu próximo pago · ${mayuscula(nombreMes(periodo))}`;
}

/** "Fecha límite: lunes 5 de octubre". */
export function textoFechaLimite(fechaLimite: string): string {
  const diaYMes = formatearFechaLarga(fechaLimite).split(' de ').slice(0, 2).join(' de ');
  return `Fecha límite: ${diaDeLaSemana(fechaLimite)} ${diaYMes}`;
}

/** "2 períodos vencidos · Total pendiente $ 3.000.000" (cantidad y total del servidor). */
export function textoVencidosPanel(cantidad: number, totalPendienteCentavos: number): string {
  const periodos = cantidad === 1 ? 'período vencido' : 'períodos vencidos';
  return `${cantidad} ${periodos} · Total pendiente ${centavosAPesosTexto(totalPendienteCentavos)}`;
}

/**
 * "Tus pagos": los últimos 12 períodos del estado de cuenta (el servidor los da del más antiguo al más
 * reciente, hasta el mes en curso), con su inicial y su estado; se resalta el del mes de hoy.
 */
export function lineaDePagos(
  periodos: readonly PeriodoCuenta[],
  hoy: string = hoyBogota(),
): PeriodoLinea[] {
  const mesDeHoy = hoy.slice(0, 7);
  return periodos.slice(-MESES_LINEA).map((p) => {
    const mes = nombreMes(p.periodo);
    return {
      inicial: mes.charAt(0).toUpperCase(),
      mes,
      estado: p.estado,
      actual: diaDeNegocio(p.periodo).slice(0, 7) === mesDeHoy,
    };
  });
}

/** "hoy", "ayer" o "hace N días", por día de Bogotá. */
export function textoHace(creadoEn: string, ahora: Date = new Date()): string {
  const dias = Math.max(0, diasEntre(creadoEn, hoyBogota(ahora)));
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/** "Urgencia media · hace 2 días". */
export function textoSolicitud(
  urgencia: UrgenciaSolicitud,
  creadoEn: string,
  ahora: Date = new Date(),
): string {
  return `Urgencia ${URGENCIAS[urgencia].etiqueta.toLowerCase()} · ${textoHace(creadoEn, ahora)}`;
}

/**
 * La tarjeta del período según su estado (R4-A). Con un comprobante EN_REVISION no se muestra plazo
 * (ni "Faltan N días" ni "Vencido" en rojo): el pago ya se reportó y el arrendador lo revisa; la acción
 * pasa a "Reemplazar comprobante" (secundaria, misma ruta). Los demás estados conservan el plazo y
 * "Reportar pago" como acción principal.
 */
export function accionDePeriodo(estado: PeriodoCuenta['estado']): {
  conPlazo: boolean;
  nota: string | null;
  boton: { titulo: string; variante: 'acento' | 'secundario' };
} {
  if (estado === 'EN_REVISION') {
    return {
      conPlazo: false,
      nota: 'Tu comprobante está en revisión',
      boton: { titulo: 'Reemplazar comprobante', variante: 'secundario' },
    };
  }
  return { conPlazo: true, nota: null, boton: { titulo: 'Reportar pago', variante: 'acento' } };
}
