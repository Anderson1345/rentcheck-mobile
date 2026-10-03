import type { TipoAlerta } from '../api/alertas';
import type { NombreIcono } from '../componentes/iconos/Icono';
import type { TonoEstado } from '../tema';

export interface PresentacionAlerta {
  icono: NombreIcono;
  tono: TonoEstado;
  /** Título corto sobre el mensaje del servidor (máx. 32 caracteres). */
  titulo: string;
}

/**
 * Cómo se ve cada tipo de alerta. `Record<TipoAlerta, …>` exige los 19 valores: si el backend agrega
 * uno y se regeneran los tipos, la compilación falla hasta que se le dé presentación. El tono sigue el
 * significado: peligro lo que ya salió mal (mora, rechazo), advertencia lo que pide atención pronto,
 * éxito lo resuelto, información lo que cambió y neutro lo que se canceló.
 */
export const PRESENTACION_ALERTA: Record<TipoAlerta, PresentacionAlerta> = {
  AJUSTE_IPC_PENDIENTE: {
    icono: 'contratos',
    tono: 'advertencia',
    titulo: 'Incremento pendiente',
  },
  INQUILINO_EN_MORA: {
    icono: 'pagos',
    tono: 'peligro',
    titulo: 'Pago en mora',
  },
  CONTRATO_PROXIMO_A_VENCER: {
    icono: 'calendario',
    tono: 'advertencia',
    titulo: 'Contrato por vencer',
  },
  RECORDATORIO_PAGO_PROXIMO: {
    icono: 'calendario',
    tono: 'advertencia',
    titulo: 'Pago por vencer',
  },
  SOLICITUD_MANTENIMIENTO_SIN_ATENDER: {
    icono: 'mantenimiento',
    tono: 'advertencia',
    titulo: 'Solicitud sin atender',
  },
  TERMINACION_ANTICIPADA_SOLICITADA: {
    icono: 'contratos',
    tono: 'advertencia',
    titulo: 'Terminación solicitada',
  },
  TERMINACION_ANTICIPADA_CANCELADA: {
    icono: 'contratos',
    tono: 'neutro',
    titulo: 'Terminación cancelada',
  },
  TERMINACION_ANTICIPADA_CONFIRMADA: {
    icono: 'contratos',
    tono: 'informacion',
    titulo: 'Terminación confirmada',
  },
  AVISO_NO_RENOVACION_DADO: {
    icono: 'contratos',
    tono: 'advertencia',
    titulo: 'Aviso de no renovación',
  },
  AVISO_NO_RENOVACION_CANCELADO: {
    icono: 'contratos',
    tono: 'neutro',
    titulo: 'Aviso cancelado',
  },
  CONTRATO_PRORROGADO_AUTOMATICAMENTE: {
    icono: 'calendario',
    tono: 'informacion',
    titulo: 'Prórroga automática',
  },
  CONTRATO_VINCULADO_POR_INQUILINO: {
    icono: 'contratos',
    tono: 'exito',
    titulo: 'Contrato vinculado',
  },
  PAGO_APROBADO: { icono: 'aprobar', tono: 'exito', titulo: 'Pago aprobado' },
  PAGO_RECHAZADO: {
    icono: 'rechazar',
    tono: 'peligro',
    titulo: 'Pago rechazado',
  },
  PAGO_ANULADO: {
    icono: 'rechazar',
    tono: 'advertencia',
    titulo: 'Pago anulado',
  },
  SOLICITUD_MANTENIMIENTO_CREADA: {
    icono: 'mantenimiento',
    tono: 'informacion',
    titulo: 'Nueva solicitud',
  },
  MANTENIMIENTO_CAMBIO_ESTADO: {
    icono: 'mantenimiento',
    tono: 'informacion',
    titulo: 'Solicitud actualizada',
  },
  PRORROGA_APLICADA: {
    icono: 'calendario',
    tono: 'informacion',
    titulo: 'Contrato prorrogado',
  },
  INCREMENTO_APLICADO: {
    icono: 'pagos',
    tono: 'informacion',
    titulo: 'Incremento aplicado',
  },
};

const GENERICA: PresentacionAlerta = {
  icono: 'alerta',
  tono: 'neutro',
  titulo: 'Aviso',
};

/** Un tipo que el servidor agregue después de esta versión de la app se ve como un aviso genérico. */
export function presentacionDeAlerta(tipo: string): PresentacionAlerta {
  return Object.prototype.hasOwnProperty.call(PRESENTACION_ALERTA, tipo)
    ? PRESENTACION_ALERTA[tipo as TipoAlerta]
    : GENERICA;
}
