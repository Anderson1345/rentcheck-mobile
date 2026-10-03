import type { PanelArrendador, UnidadOcupacionPanel } from '../../api/panel';
import { ESTADO_OCUPACION, estadoDeUnidad, miniaturasVisibles, resumenDeInmueble } from '../cobro';

const unidad = (
  unidad_id: string,
  inmueble_id: string,
  estado: UnidadOcupacionPanel['estado'],
): UnidadOcupacionPanel => ({
  unidad_id,
  nombre: unidad_id,
  inmueble_id,
  inmueble_direccion: `Dirección ${inmueble_id}`,
  estado,
});

function panel(
  unidades: UnidadOcupacionPanel[],
  porInmueble: PanelArrendador['por_inmueble'] = [],
): PanelArrendador {
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
      unidades: unidades.length,
      ocupadas: 0,
      libres: 0,
      con_contrato_programado: 0,
      porcentaje: null,
      unidades_detalle: unidades,
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
    por_inmueble: porInmueble,
    pendientes: {
      comprobantes_por_validar: 0,
      mantenimientos_pendientes: 0,
      solicitudes_abiertas: { total: 0, urgentes: 0 },
      contratos_por_vencer: { cantidad: 0, contratos: [] },
      incrementos_disponibles: { cantidad: 0, contratos: [] },
      terminaciones_por_confirmar: { cantidad: 0, contratos: [] },
    },
  };
}

describe('resumenDeInmueble (chip de cobro, ocupadas e ingresos del año)', () => {
  const datos = panel(
    [
      unidad('a1', 'A', 'EN_MORA'),
      unidad('a2', 'A', 'EN_MORA'),
      unidad('a3', 'A', 'AL_DIA'),
      unidad('b1', 'B', 'AL_DIA'),
      unidad('b2', 'B', 'PROGRAMADA'),
      unidad('c1', 'C', 'LIBRE'),
      unidad('c2', 'C', 'PROGRAMADA'),
    ],
    [
      {
        inmueble_id: 'A',
        direccion: 'Dirección A',
        ingresos_anio_centavos: 1_365_000_000,
        unidades: 3,
        ocupadas: 3,
      },
      {
        inmueble_id: 'B',
        direccion: 'Dirección B',
        ingresos_anio_centavos: 0,
        unidades: 2,
        ocupadas: 1,
      },
    ],
  );

  it('con alguna unidad EN_MORA: "N en mora" en tono peligro', () => {
    expect(resumenDeInmueble(datos, 'A')).toEqual({
      chip: { texto: '2 en mora', tono: 'peligro' },
      ocupadas: 3,
      ingresosAnioCentavos: 1_365_000_000,
      anio: 2031,
    });
  });

  it('sin mora y con ocupadas: "Al día" (éxito); una programada no cuenta como ocupada', () => {
    expect(resumenDeInmueble(datos, 'B')).toMatchObject({
      chip: { texto: 'Al día', tono: 'exito' },
      ocupadas: 1,
      ingresosAnioCentavos: 0,
    });
  });

  it('sin ocupadas: "Libre" (neutro); sin fila en por_inmueble, ingresos null', () => {
    expect(resumenDeInmueble(datos, 'C')).toEqual({
      chip: { texto: 'Libre', tono: 'neutro' },
      ocupadas: 0,
      ingresosAnioCentavos: null,
      anio: 2031,
    });
  });

  it('un inmueble sin unidades en el Panel queda "Libre" con 0 ocupadas', () => {
    expect(resumenDeInmueble(datos, 'Z')?.chip).toEqual({
      texto: 'Libre',
      tono: 'neutro',
    });
  });

  it('sin Panel (cargando o con error) no hay resumen: la tarjeta se muestra sin esos datos', () => {
    expect(resumenDeInmueble(undefined, 'A')).toBeNull();
  });
});

describe('estadoDeUnidad', () => {
  const datos = panel([unidad('u1', 'A', 'EN_MORA'), unidad('u2', 'A', 'PROGRAMADA')]);

  it('devuelve el estado que calculó el servidor, con su etiqueta y tono', () => {
    expect(estadoDeUnidad(datos, 'u1')).toBe('EN_MORA');
    expect(estadoDeUnidad(datos, 'u2')).toBe('PROGRAMADA');
    expect(ESTADO_OCUPACION.EN_MORA).toEqual({ etiqueta: 'En mora', tono: 'peligro' });
    expect(ESTADO_OCUPACION.AL_DIA).toEqual({ etiqueta: 'Al día', tono: 'exito' });
    expect(ESTADO_OCUPACION.PROGRAMADA.etiqueta).toBe('Programada');
    expect(ESTADO_OCUPACION.LIBRE).toEqual({ etiqueta: 'Libre', tono: 'neutro' });
  });

  it('null si no hay Panel o la unidad no aparece', () => {
    expect(estadoDeUnidad(undefined, 'u1')).toBeNull();
    expect(estadoDeUnidad(datos, 'otra')).toBeNull();
  });
});

describe('miniaturasVisibles', () => {
  it('hasta 3 visibles y el resto como "+N"', () => {
    expect(miniaturasVisibles([1, 2, 3, 4, 5])).toEqual({ visibles: [1, 2, 3], resto: 2 });
    expect(miniaturasVisibles([1, 2, 3])).toEqual({ visibles: [1, 2, 3], resto: 0 });
    expect(miniaturasVisibles([])).toEqual({ visibles: [], resto: 0 });
  });
});
