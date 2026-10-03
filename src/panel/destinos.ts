import type { Href } from 'expo-router';

/**
 * A dónde lleva cada pendiente del Panel. Todas son pantallas que ya existen en el grupo (arrendador).
 * Un id vacío no navega (null): la fila se muestra igual, sin acción.
 */
export const destinosPanel = {
  /** La pestaña Pagos: su segmento por defecto es "En revisión", que es la cola de comprobantes por validar. */
  comprobantes: (): Href => ({ pathname: '/pagos-arrendador' }),
  mantenimientos: (): Href => ({ pathname: '/mantenimiento' }),
  porVencer: (contratoId: string): Href | null =>
    contratoId ? { pathname: '/contrato/[id]', params: { id: contratoId } } : null,
  incremento: (contratoId: string): Href | null =>
    contratoId ? { pathname: '/contrato/[id]/incremento', params: { id: contratoId } } : null,
  terminacion: (contratoId: string): Href | null =>
    contratoId ? { pathname: '/contrato/[id]/terminacion', params: { id: contratoId } } : null,
};
