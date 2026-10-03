// Panel del arrendador (B0.6-A2, B-58). Tipos GENERADOS desde el OpenAPI (PanelArrendadorDto y sus
// esquemas); aquí solo se les da un nombre corto. El servidor calcula todo (mes actual de Bogotá, recaudo,
// mora, tendencia, pendientes) y la app lo muestra: no recalcula nada. 401 con otro rol o sin sesión.

import { api } from './cliente';
import type { components } from './tipos.gen';

export type PanelArrendador = components['schemas']['PanelArrendadorDto'];
export type RecaudoPanel = components['schemas']['RecaudoPanelDto'];
export type OcupacionPanel = components['schemas']['OcupacionPanelDto'];
export type MoraPanel = components['schemas']['MoraPanelDto'];
export type TendenciaMes = components['schemas']['TendenciaMesDto'];
export type PendientesPanel = components['schemas']['PendientesPanelDto'];
export type ContratoPendiente = components['schemas']['ContratoPendienteDto'];
export type IncrementoDisponible = components['schemas']['IncrementoDisponibleDto'];

/** Todo el Panel en una sola respuesta de solo lectura, sin parámetros. */
export const obtenerPanelArrendador = () => api.get<PanelArrendador>('/arrendadores/panel');
