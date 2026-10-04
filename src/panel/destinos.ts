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

/**
 * Destino de un pendiente que es una lista de contratos (R3-A): con un solo contrato (y su id), la
 * pantalla de ese contrato; si no, la lista de contratos.
 */
export function destinoDeLista(
  lista: { cantidad: number; contratos: readonly { contrato_id: string }[] },
  deContrato: (contratoId: string) => Href | null,
): Href {
  const unico = lista.cantidad === 1 ? lista.contratos[0] : undefined;
  // Un id vacío no navega a un contrato.
  return (
    (unico?.contrato_id && deContrato(unico.contrato_id)) || { pathname: '/contratos-arrendador' }
  );
}

/** "Ver cartera": la lista de contratos con el filtro "En mora" ya puesto. */
export const destinoCartera = (): Href => ({
  pathname: '/contratos-arrendador',
  params: { filtro: 'EN_MORA' },
});
