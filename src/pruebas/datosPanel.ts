// Panel del arrendador de ejemplo para las pruebas de pantallas (forma real de GET /arrendadores/panel).
import type { PanelArrendador, UnidadOcupacionPanel } from '../api/panel';

export function unidadOcupacion(
  unidad_id: string,
  inmueble_id: string,
  estado: UnidadOcupacionPanel['estado'],
): UnidadOcupacionPanel {
  return {
    unidad_id,
    nombre: unidad_id,
    inmueble_id,
    inmueble_direccion: `Dirección ${inmueble_id}`,
    estado,
  };
}

/** Un Panel vacío del 15/03/2031 con lo que se le pase encima (fechas fijas: no dependen de hoy). */
export function panelEjemplo(extra: Partial<PanelArrendador> = {}): PanelArrendador {
  return {
    mes: '2031-03',
    calculado_para: '2031-03-15',
    ingresos_mes_centavos: 0,
    recaudo: {
      esperado_centavos: 0,
      aprobado_centavos: 0,
      en_revision_centavos: 0,
      sin_reportar_centavos: 0,
      contratos: 0,
    },
    ocupacion: {
      unidades: 0,
      ocupadas: 0,
      libres: 0,
      con_contrato_programado: 0,
      porcentaje: null,
      unidades_detalle: [],
    },
    mora: { contratos: 0, periodos: 0, total_centavos: 0 },
    morosos: [],
    tendencia: [],
    anio: {
      anio: 2031,
      meses: [],
      total_actual_centavos: 0,
      total_anterior_centavos: 0,
      variacion_porcentual: null,
    },
    por_inmueble: [],
    pendientes: {
      comprobantes_por_validar: 0,
      mantenimientos_pendientes: 0,
      solicitudes_abiertas: { total: 0, urgentes: 0 },
      contratos_por_vencer: { cantidad: 0, contratos: [] },
      incrementos_disponibles: { cantidad: 0, contratos: [] },
      terminaciones_por_confirmar: { cantidad: 0, contratos: [] },
    },
    ...extra,
  };
}
