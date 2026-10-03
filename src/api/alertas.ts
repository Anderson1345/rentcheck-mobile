// Alertas de ambos roles (B0.6-B1). Los tipos son los GENERADOS desde el OpenAPI (AlertaDto,
// AlertaRecursoDto, FeedAlertasDto, ConteoAlertasDto, MarcadasDto, TipoAlerta, TipoRecursoAlerta);
// aquí solo se les da un nombre corto. El rol decide la ruta, pero el servidor decide qué alertas
// son de cada usuario (lo ajeno es 404): la app no filtra nada.

import { api } from './cliente';
import type { components } from './tipos.gen';

export type RolAlertas = 'arrendador' | 'inquilino';
export type Alerta = components['schemas']['AlertaDto'];
export type RecursoAlerta = components['schemas']['AlertaRecursoDto'];
export type TipoAlerta = components['schemas']['TipoAlerta'];
export type TipoRecursoAlerta = components['schemas']['TipoRecursoAlerta'];
export type FeedAlertas = components['schemas']['FeedAlertasDto'];
export type ConteoAlertas = components['schemas']['ConteoAlertasDto'];
export type MarcadasAlertas = components['schemas']['MarcadasDto'];

/** Alertas por página: el valor por defecto del servidor (acepta de 1 a 50). */
export const TAMANO_PAGINA_ALERTAS = 20;

// Las rutas del arrendador y del inquilino no son simétricas: el feed del arrendador es /alertas/feed
// (GET /alertas es el obsoleto, sin paginar) y el del inquilino es /inquilino/alertas.
const RUTAS = {
  arrendador: {
    feed: '/alertas/feed',
    conteo: '/alertas/conteo',
    todas: '/alertas/leidas',
    una: (id: string) => `/alertas/${encodeURIComponent(id)}/leida`,
  },
  inquilino: {
    feed: '/inquilino/alertas',
    conteo: '/inquilino/alertas/conteo',
    todas: '/inquilino/alertas/leidas',
    una: (id: string) => `/inquilino/alertas/${encodeURIComponent(id)}/leida`,
  },
} as const;

/** Una página del feed, de la más reciente a la más antigua. `cursor` es el opaco de la página anterior. */
export const obtenerFeedAlertas = (rol: RolAlertas, cursor?: string) =>
  api.get<FeedAlertas>(
    `${RUTAS[rol].feed}?limite=${TAMANO_PAGINA_ALERTAS}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
    }`,
  );

/** Cuántas alertas sin leer tiene el usuario (alimenta la campana). */
export const obtenerConteoAlertas = (rol: RolAlertas) => api.get<ConteoAlertas>(RUTAS[rol].conteo);

/**
 * La respuesta del arrendador no tiene esquema en el OpenAPI (devuelve la forma antigua) y la del
 * inquilino es una AlertaDto: solo cuenta el código HTTP, por eso no se devuelve el cuerpo.
 */
export async function marcarAlertaLeida(rol: RolAlertas, id: string): Promise<void> {
  await api.patch(RUTAS[rol].una(id));
}

/** Marca las no leídas del usuario; responde cuántas pasaron a leídas. */
export const marcarTodasLeidas = (rol: RolAlertas) => api.patch<MarcadasAlertas>(RUTAS[rol].todas);
