import type { Href } from 'expo-router';

import type { RecursoAlerta, RolAlertas } from '../api/alertas';

/**
 * A qué pantalla lleva una alerta, según el `recurso` que deriva el servidor y el rol de quien la lee.
 * Devuelve null cuando la alerta es informativa: no tiene recurso, el tipo es uno que esta versión no
 * conoce, o faltan los parámetros que la ruta necesita (entonces solo se marca leída).
 *
 * Función pura: no consulta nada. Si el destino responde 404 (recurso ya no visible), la pantalla
 * destino muestra su propio estado de "no encontrado".
 *
 * Rutas de cada rol (los dos grupos no pueden compartir URL, por eso los nombres distintos):
 *  - arrendador: /pago/[id], /mantenimiento/[id], /contrato/[id]/estado-cuenta, /contrato/[id];
 *  - inquilino: /mi-contrato/[id]/estado-cuenta, /pagos, /solicitud/[id], /mi-contrato/[id].
 * El inquilino no tiene detalle de un pago (B-65): sus alertas de pago llevan al estado de cuenta del
 * contrato o, sin contrato, a la pestaña Pagos.
 */
export function destinoDeAlerta(recurso: RecursoAlerta | null, rol: RolAlertas): Href | null {
  if (!recurso) return null;
  const { id, contrato_id: contratoId } = recurso;

  switch (recurso.tipo) {
    case 'PAGO':
      if (rol === 'arrendador') {
        return id ? { pathname: '/pago/[id]', params: { id } } : null;
      }
      return contratoId
        ? {
            pathname: '/mi-contrato/[id]/estado-cuenta',
            params: { id: contratoId },
          }
        : { pathname: '/pagos' };

    case 'SOLICITUD_MANTENIMIENTO':
      if (!id) return null;
      return rol === 'arrendador'
        ? { pathname: '/mantenimiento/[id]', params: { id } }
        : { pathname: '/solicitud/[id]', params: { id } };

    case 'PERIODO':
      if (!contratoId) return null;
      return rol === 'arrendador'
        ? {
            pathname: '/contrato/[id]/estado-cuenta',
            params: { id: contratoId },
          }
        : {
            pathname: '/mi-contrato/[id]/estado-cuenta',
            params: { id: contratoId },
          };

    case 'CONTRATO':
      if (!id) return null;
      return rol === 'arrendador'
        ? { pathname: '/contrato/[id]', params: { id } }
        : { pathname: '/mi-contrato/[id]', params: { id } };

    default:
      // Un tipo de recurso nuevo del servidor: informativa hasta que la app lo conozca.
      return null;
  }
}
