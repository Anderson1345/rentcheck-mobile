// Panel del arrendador v2 (R3-A): cabecera, "Para hoy", "Quién te debe", "Cómo va el año" y "Ocupación",
// arrendador nuevo en cero, carga y error con reintento, y la insignia de la pestaña Pagos. La API y el
// router son dobles. Todo sale del servidor (el Panel no depende de la fecha de hoy).
import { RefreshControl, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { act, type ReactTestRenderer } from 'react-test-renderer';

import PanelArrendadorPantalla from '../../app/(arrendador)/(pestanas)/panel';
import LayoutPestanas from '../../app/(arrendador)/(pestanas)/_layout';
import { ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SIN_CONEXION } from '../api/errores';
import type { PanelArrendador } from '../api/panel';
import { BotonIcono } from '../componentes/BotonIcono';
import { AnilloRecaudo } from '../componentes/graficas/AnilloRecaudo';
import { GraficaAreaIngresos } from '../componentes/graficas/GraficaAreaIngresos';
import { crearToken } from '../pruebas/crearToken';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import type { DatosSesion } from '../sesion/tipos';
import { colores, coloresEstado } from '../tema';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPush = jest.fn();
const mockEnfoques: (() => void)[] = [];
const mockNavegar = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  function Tabs({
    tabBar,
  }: {
    tabBar: (p: unknown) => unknown;
    children?: unknown;
    screenOptions?: unknown;
  }) {
    return tabBar({
      state: { routes: [{ name: 'panel' }], index: 0 },
      navigation: { navigate: mockNavegar },
    }) as never;
  }
  Tabs.Screen = function Screen() {
    return null;
  };
  return {
    Tabs,
    View,
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
    }),
    useFocusEffect: (efecto: () => void) => {
      useEffect(() => {
        mockEnfoques.push(efecto);
        return efecto();
      }, [efecto]);
    },
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View: Vista } = jest.requireActual('react-native');
  return { Indicador: () => <Vista accessibilityLabel="Cargando" /> };
});
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: { get: (...a: unknown[]) => mockGet(...a), patch: jest.fn(), post: jest.fn() },
}));

const sesion: DatosSesion = {
  token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
};

const MILLON = 100_000_000; // un millón de pesos, en centavos
/** Millones de pesos → centavos enteros (sin errores de coma flotante). */
const millones = (n: number) => Math.round(n * MILLON);

const unidad = (
  unidad_id: string,
  nombre: string,
  inmueble_id: string,
  inmueble_direccion: string,
  estado: 'EN_MORA' | 'AL_DIA' | 'PROGRAMADA' | 'LIBRE',
) => ({ unidad_id, nombre, inmueble_id, inmueble_direccion, estado });
const inmueble = (inmueble_id: string, direccion: string, ingresos: number) => ({
  inmueble_id,
  direccion,
  ingresos_anio_centavos: millones(ingresos),
  unidades: 2,
  ocupadas: 1,
});

const PANEL_COMPLETO: PanelArrendador = {
  mes: '2026-10',
  calculado_para: '2026-10-02',
  morosos: [
    {
      contrato_id: 'm1',
      unidad: { id: 'u5', nombre: 'Apto 501' },
      inmueble: { id: 'i1', direccion: 'Los Almendros' },
      inquilino: { nombre: 'Andrés Villa' },
      periodos: 2,
      monto_centavos: millones(1.5),
      dias_mora: 29,
      periodo_mas_antiguo: '2026-09-01',
    },
    {
      contrato_id: 'm2',
      unidad: { id: 'u9', nombre: 'Local 53' },
      inmueble: { id: 'i3', direccion: 'Calle 53' },
      inquilino: null,
      periodos: 2,
      monto_centavos: millones(0.6),
      dias_mora: 30,
      periodo_mas_antiguo: '2026-08-01',
    },
  ],
  anio: {
    anio: 2026,
    meses: [
      { mes: '2026-01', actual_centavos: millones(15), anterior_centavos: millones(13) },
      { mes: '2026-02', actual_centavos: millones(15.5), anterior_centavos: millones(14) },
      { mes: '2026-03', actual_centavos: millones(16), anterior_centavos: millones(14.5) },
      { mes: '2026-04', actual_centavos: millones(15), anterior_centavos: millones(14) },
      { mes: '2026-05', actual_centavos: millones(17), anterior_centavos: millones(15) },
      { mes: '2026-06', actual_centavos: millones(18.5), anterior_centavos: millones(16) },
      { mes: '2026-07', actual_centavos: millones(19), anterior_centavos: millones(16) },
      { mes: '2026-08', actual_centavos: millones(18), anterior_centavos: millones(17) },
      { mes: '2026-09', actual_centavos: millones(19.4), anterior_centavos: millones(16) },
      { mes: '2026-10', actual_centavos: millones(13.65), anterior_centavos: millones(15) },
    ],
    total_actual_centavos: millones(152.6),
    total_anterior_centavos: millones(136.2),
    variacion_porcentual: 12,
  },
  por_inmueble: [
    inmueble('i1', 'Los Almendros', 86.4),
    inmueble('i2', 'Casa Laureles', 42),
    inmueble('i3', 'Calle 53', 24.2),
    inmueble('i4', 'Diagonal 4', 10),
    inmueble('i5', 'Carrera 5', 5),
    inmueble('i6', 'Avenida 6', 1),
    inmueble('i7', 'Bodega 7', 0),
  ],
  ingresos_mes_centavos: millones(13.65),
  recaudo: {
    esperado_centavos: millones(17.6),
    aprobado_centavos: millones(13.65),
    en_revision_centavos: millones(3.35),
    sin_reportar_centavos: millones(0.6),
    contratos: 8,
  },
  ocupacion: {
    unidades: 8,
    ocupadas: 7,
    libres: 1,
    con_contrato_programado: 1,
    porcentaje: 88,
    unidades_detalle: [
      unidad('u1', 'Apto 101', 'i1', 'Los Almendros', 'EN_MORA'),
      unidad('u2', 'Apto 102', 'i1', 'Los Almendros', 'AL_DIA'),
      unidad('u3', 'Apto 103', 'i1', 'Los Almendros', 'PROGRAMADA'),
      unidad('u4', 'Apto 104', 'i1', 'Los Almendros', 'LIBRE'),
      unidad('u5', 'Apto 105', 'i1', 'Los Almendros', 'AL_DIA'),
      unidad('u6', 'Apto 106', 'i1', 'Los Almendros', 'AL_DIA'),
      unidad('u7', 'Casa', 'i2', 'Casa Laureles', 'AL_DIA'),
      unidad('u8', 'Casa 2', 'i2', 'Casa Laureles', 'AL_DIA'),
    ],
  },
  mora: { contratos: 2, periodos: 4, total_centavos: millones(21) },
  tendencia: [
    { mes: '2026-05', ingresos_centavos: millones(17) },
    { mes: '2026-06', ingresos_centavos: millones(18.5) },
    { mes: '2026-07', ingresos_centavos: millones(19) },
    { mes: '2026-08', ingresos_centavos: millones(18) },
    { mes: '2026-09', ingresos_centavos: millones(19.4) },
    { mes: '2026-10', ingresos_centavos: millones(13.65) },
  ],
  pendientes: {
    comprobantes_por_validar: 3,
    mantenimientos_pendientes: 2,
    solicitudes_abiertas: { total: 3, urgentes: 1 },
    contratos_por_vencer: {
      cantidad: 7,
      contratos: [
        {
          contrato_id: 'cv1',
          unidad: 'Casa Laureles',
          inmueble: 'Carrera 70 # 5-20',
          fecha_fin: '2026-10-25',
        },
        {
          contrato_id: 'cv2',
          unidad: 'Local 53',
          inmueble: 'Calle 53 # 20-10',
          fecha_fin: '2026-10-30',
        },
      ],
    },
    incrementos_disponibles: {
      cantidad: 2,
      contratos: [
        {
          contrato_id: 'ci1',
          unidad: 'Apto 303',
          inmueble: 'Calle 3 # 4-5',
          disponible_desde: '2026-09-01',
          ipc_faltante: false,
        },
        {
          contrato_id: 'ci2',
          unidad: 'Apto 404',
          inmueble: 'Calle 4 # 5-6',
          disponible_desde: '2026-09-15',
          ipc_faltante: true,
        },
      ],
    },
    terminaciones_por_confirmar: {
      cantidad: 1,
      contratos: [
        {
          contrato_id: 'ct1',
          unidad: 'Apto 505',
          inmueble: 'Calle 5 # 6-7',
          fecha_fin: '2027-03-31',
        },
      ],
    },
  },
};

const PANEL_EN_CERO: PanelArrendador = {
  mes: '2026-10',
  calculado_para: '2026-10-02',
  morosos: [],
  anio: {
    anio: 2026,
    meses: Array.from({ length: 10 }, (_, k) => ({
      mes: `2026-${String(k + 1).padStart(2, '0')}`,
      actual_centavos: 0,
      anterior_centavos: 0,
    })),
    total_actual_centavos: 0,
    total_anterior_centavos: 0,
    variacion_porcentual: null,
  },
  por_inmueble: [],
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
  tendencia: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((mes) => ({
    mes,
    ingresos_centavos: 0,
  })),
  pendientes: {
    comprobantes_por_validar: 0,
    mantenimientos_pendientes: 0,
    solicitudes_abiertas: { total: 0, urgentes: 0 },
    contratos_por_vencer: { cantidad: 0, contratos: [] },
    incrementos_disponibles: { cantidad: 0, contratos: [] },
    terminaciones_por_confirmar: { cantidad: 0, contratos: [] },
  },
};

/** Responde cada ruta: el Panel con `panel` (o lo que lance) y el conteo de alertas. */
function programar(panel: PanelArrendador | Error, conteoAlertas = 0) {
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/alertas/conteo') return { no_leidas: conteoAlertas };
    if (url === '/arrendadores/panel') {
      if (panel instanceof Error) throw panel;
      return panel;
    }
    throw new Error(`ruta inesperada ${url}`);
  });
}
const llamadasAlPanel = () =>
  mockGet.mock.calls.filter((c) => c[0] === '/arrendadores/panel').length;

async function esperar() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 20));
  });
}

async function montarPanel(panel: PanelArrendador | Error, conteoAlertas = 0) {
  programar(panel, conteoAlertas);
  const montado = await renderizarPantalla(<PanelArrendadorPantalla />, sesion);
  await esperar();
  return montado;
}

beforeEach(() => {
  mockGet.mockReset();
  mockPush.mockReset();
  mockNavegar.mockReset();
  mockEnfoques.length = 0;
});

const estiloDe = (n: { props: { style?: unknown } }) =>
  StyleSheet.flatten(n.props.style as ViewStyle & TextStyle) ?? {};
/** Nodos nativos con ese testID (el componente y su vista nativa comparten props). */
const porTestId = (raiz: ReactTestRenderer, testID: string) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
const textosDentro = (n: ReturnType<ReactTestRenderer['root']['findAll']>[number]) =>
  n
    .findAll((h) => typeof h.type === 'string' && typeof h.props.children === 'string')
    .map((h) => h.props.children as string);
const seccion = (raiz: ReactTestRenderer, testID: string) =>
  raiz.root.find((n) => n.props.testID === testID && typeof n.type !== 'string');

describe('cabecera', () => {
  it('saludo, mes del servidor, "Recaudado este mes", esperado y leyenda abreviada; campana de alertas', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const textos = textosDe(raiz);
    expect(textos).toEqual(
      expect.arrayContaining([
        'Hola, Marta Ríos',
        'Octubre de 2026',
        'Recaudado este mes',
        '$ 13.650.000',
        'de $ 17.600.000 esperados',
        'En revisión $ 3,35 M',
        'Falta $ 600.000',
      ]),
    );
    expect(
      raiz.root
        .findAllByType(BotonIcono)
        .some((b) => String(b.props.etiqueta).startsWith('Alertas')),
    ).toBe(true);
  });

  it('el anillo recibe tal cual aprobado, en revisión y sin reportar del servidor (sin su leyenda propia)', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    expect(raiz.root.findByType(AnilloRecaudo).props).toEqual({
      aprobadoCentavos: millones(13.65),
      enRevisionCentavos: millones(3.35),
      sinReportarCentavos: millones(0.6),
      conLeyenda: false,
    });
  });

  it('sin recaudo esperado: lo dice y no dibuja un anillo vacío', async () => {
    const { raiz } = await montarPanel(PANEL_EN_CERO);
    expect(textosDe(raiz)).toContain('Aún no hay recaudo esperado este mes.');
    expect(raiz.root.findAllByType(AnilloRecaudo)).toHaveLength(0);
  });
});

describe('Para hoy', () => {
  const mosaicos = (raiz: ReactTestRenderer) =>
    raiz.root
      .findAll((n) => n.props.testID === 'mosaico-hoy' && !!n.props.onPress)
      .map((n) => n.props.accessibilityLabel as string);

  it('un mosaico por pendiente con conteo > 0, con número y texto', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    expect(mosaicos(raiz)).toEqual([
      '3 comprobantes por validar',
      '3 solicitudes abiertas · 1 urgente',
      '7 contratos vencen en 30 días',
      '2 incrementos disponibles',
      '1 terminación por confirmar',
    ]);
  });

  it('los pendientes en 0 no aparecen', async () => {
    const { raiz } = await montarPanel({
      ...PANEL_COMPLETO,
      pendientes: {
        ...PANEL_COMPLETO.pendientes,
        comprobantes_por_validar: 0,
        incrementos_disponibles: { cantidad: 0, contratos: [] },
      },
    });
    expect(mosaicos(raiz)).toEqual([
      '3 solicitudes abiertas · 1 urgente',
      '7 contratos vencen en 30 días',
      '1 terminación por confirmar',
    ]);
    expect(textosDe(raiz)).not.toContain('Todo al día por hoy');
  });

  it('"· N urgentes" va en tono peligro', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const urgente = raiz.root.findAll(
      (n) => typeof n.type === 'string' && n.props.children === '· 1 urgente',
    )[0];
    expect(estiloDe(urgente).color).toBe(coloresEstado.peligro.texto);
  });

  it('cada mosaico navega a su destino', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const tocar = async (etiqueta: string) =>
      act(async () =>
        raiz.root
          .find(
            (n) =>
              n.props.testID === 'mosaico-hoy' &&
              n.props.accessibilityLabel === etiqueta &&
              !!n.props.onPress,
          )
          .props.onPress(),
      );
    await tocar('3 comprobantes por validar');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/pagos-arrendador' });
    await tocar('3 solicitudes abiertas · 1 urgente');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/mantenimiento' });
    await tocar('7 contratos vencen en 30 días');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/contratos-arrendador' });
    await tocar('2 incrementos disponibles');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/contratos-arrendador' });
    await tocar('1 terminación por confirmar');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/terminacion',
      params: { id: 'ct1' },
    });
  });

  it('todo en 0: una sola línea positiva', async () => {
    const { raiz } = await montarPanel(PANEL_EN_CERO);
    expect(mosaicos(raiz)).toEqual([]);
    expect(textosDe(raiz)).toContain('Todo al día por hoy');
  });
});

describe('Quién te debe', () => {
  it('total en mora en peligro, contratos y períodos, y una fila por moroso', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const deuda = seccion(raiz, 'quien-te-debe');
    const textos = textosDentro(deuda);
    expect(textos).toEqual(
      expect.arrayContaining([
        '$ 21.000.000',
        '2 contratos · 4 períodos',
        'AV',
        'Andrés Villa',
        'Apto 501 · Los Almendros',
        '$ 1.500.000',
        '29 días',
        'Sin nombre',
        'Local 53 · Calle 53',
        '30 días',
      ]),
    );
    const total = deuda.findAll(
      (n) => typeof n.type === 'string' && n.props.children === '$ 21.000.000',
    )[0];
    expect(estiloDe(total).color).toBe(coloresEstado.peligro.texto);
  });

  it('días: advertencia con 29, peligro con 30', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const color = (texto: string) =>
      estiloDe(
        raiz.root.findAll((n) => typeof n.type === 'string' && n.props.children === texto)[0],
      ).color;
    expect(color('29 días')).toBe(coloresEstado.advertencia.texto);
    expect(color('30 días')).toBe(coloresEstado.peligro.texto);
  });

  it('cada fila abre el contrato; "Ver cartera" abre contratos con el filtro En mora', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    await act(async () => botonDe(raiz, 'Andrés Villa').props.onPress());
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/contrato/[id]', params: { id: 'm1' } });
    await act(async () =>
      raiz.root
        .find(
          (n) =>
            n.props.accessibilityRole === 'link' &&
            n.props.accessibilityLabel === 'Ver cartera' &&
            !!n.props.onPress,
        )
        .props.onPress(),
    );
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contratos-arrendador',
      params: { filtro: 'EN_MORA' },
    });
  });

  it('sin mora: la sección sigue, con "Nadie te debe"', async () => {
    const { raiz } = await montarPanel(PANEL_EN_CERO);
    expect(textosDentro(seccion(raiz, 'quien-te-debe'))).toEqual(
      expect.arrayContaining(['Quién te debe', 'Nadie te debe']),
    );
  });
});

describe('Cómo va el año', () => {
  it('total del año abreviado, chip "+12%" y "vs 2025 a la fecha"', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const textos = textosDentro(seccion(raiz, 'como-va-el-anio'));
    expect(textos).toEqual(
      expect.arrayContaining(['Ingresos 2026', '$ 152,6 M', '+12%', 'vs 2025 a la fecha']),
    );
    expect(textos).toContain('Ingresos de octubre: $ 13.650.000');
  });

  it('una barra pareada por mes (enero → mes actual), el mes en curso resaltado y etiquetas de una letra', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    expect(porTestId(raiz, 'barra-anterior')).toHaveLength(10);
    expect(porTestId(raiz, 'barra-actual')).toHaveLength(9);
    const enCurso = porTestId(raiz, 'barra-en-curso');
    expect(enCurso).toHaveLength(1);
    expect(estiloDe(enCurso[0]).backgroundColor).toBe(colores.lima);
    expect(estiloDe(enCurso[0]).borderColor).toBe(colores.tinta);
    expect(estiloDe(porTestId(raiz, 'barra-actual')[0]).backgroundColor).toBe(colores.serie);
    const letras = textosDentro(seccion(raiz, 'barras-anio')).filter((t) => t.length === 1);
    expect(letras).toEqual(['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O']);
  });

  it('la gráfica tiene un resumen accesible de los valores', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const etiqueta = porTestId(raiz, 'barras-anio')[0].props.accessibilityLabel as string;
    expect(etiqueta).toContain('Ingresos de 2026 frente a 2025');
    expect(etiqueta).toContain('enero: $ 15 M frente a $ 13 M');
    expect(etiqueta).toContain('octubre (en curso): $ 13,65 M frente a $ 15 M');
  });

  it('chip oculto con variación null y en peligro con variación negativa', async () => {
    let { raiz } = await montarPanel({
      ...PANEL_COMPLETO,
      anio: { ...PANEL_COMPLETO.anio, variacion_porcentual: null },
    });
    expect(textosDentro(seccion(raiz, 'como-va-el-anio')).join(' ')).not.toMatch(/%|vs 2025/);
    ({ raiz } = await montarPanel({
      ...PANEL_COMPLETO,
      anio: { ...PANEL_COMPLETO.anio, variacion_porcentual: -8 },
    }));
    const chip = raiz.root.findAll(
      (n) => typeof n.type === 'string' && n.props.children === '−8%',
    )[0];
    expect(estiloDe(chip).color).toBe(coloresEstado.peligro.texto);
  });

  it('por inmueble: máximo 5 y "Ver todos" despliega el resto; uno en 0 se ve con la barra vacía', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const filas = () => porTestId(raiz, 'fila-inmueble');
    expect(filas()).toHaveLength(5);
    await act(async () => botonDe(raiz, 'Ver todos').props.onPress());
    expect(filas()).toHaveLength(7);
    expect(hayBoton(raiz, 'Ver todos')).toBe(false);
    const vacia = filas()[6].findAll(
      (n) => typeof n.type === 'string' && n.props.testID === 'barra-inmueble',
    )[0];
    expect(estiloDe(vacia).width).toBe('0%');
    expect(textosDentro(filas()[0])).toEqual(['Los Almendros', '$ 86,4 M']);
  });
});

describe('Ocupación', () => {
  it('"7 de 8", "unidades ocupadas · 88%" y un cuadro por unidad con su estado', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const textos = textosDentro(seccion(raiz, 'ocupacion'));
    expect(textos).toEqual(expect.arrayContaining(['7 de 8', 'unidades ocupadas · 88%']));
    const cuadros = raiz.root
      .findAll((n) => n.props.testID === 'cuadro-unidad' && typeof n.type === 'string')
      .map((n) => n.props.accessibilityLabel as string);
    expect(cuadros).toHaveLength(8);
    expect(cuadros).toEqual(
      expect.arrayContaining([
        'Apto 101: en mora',
        'Apto 102: al día',
        'Apto 103: programada',
        'Apto 104: libre',
      ]),
    );
    const cuadro = (etiqueta: string) =>
      estiloDe(
        raiz.root.find(
          (n) => typeof n.type === 'string' && n.props.accessibilityLabel === etiqueta,
        ),
      );
    expect(cuadro('Apto 101: en mora').backgroundColor).toBe(coloresEstado.peligro.senal);
    expect(cuadro('Apto 102: al día').backgroundColor).toBe(colores.serie);
    expect(cuadro('Apto 103: programada').backgroundColor).toBe(coloresEstado.programado.senal);
    expect(cuadro('Apto 104: libre').borderStyle).toBe('dashed');
  });

  it('con varios inmuebles se agrupa con la dirección de cada uno', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const grupos = porTestId(raiz, 'grupo-ocupacion');
    expect(grupos).toHaveLength(2);
    expect(textosDentro(grupos[0])[0]).toBe('Los Almendros');
    expect(textosDentro(grupos[1])[0]).toBe('Casa Laureles');
  });

  it('con un solo inmueble no hay títulos de grupo; sin porcentaje del servidor, sin "· %"', async () => {
    const { raiz } = await montarPanel({
      ...PANEL_COMPLETO,
      ocupacion: {
        ...PANEL_COMPLETO.ocupacion,
        porcentaje: null,
        unidades_detalle: PANEL_COMPLETO.ocupacion.unidades_detalle.filter(
          (u) => u.inmueble_id === 'i1',
        ),
      },
    });
    expect(porTestId(raiz, 'grupo-ocupacion')).toHaveLength(1);
    expect(textosDentro(porTestId(raiz, 'grupo-ocupacion')[0])).not.toContain('Los Almendros');
    expect(textosDentro(seccion(raiz, 'ocupacion'))).toContain('unidades ocupadas');
  });
});

describe('arrendador nuevo: todo en cero', () => {
  it('para hoy positivo, nadie debe, año sin ingresos y sin unidades', async () => {
    const { raiz } = await montarPanel(PANEL_EN_CERO);
    const textos = textosDe(raiz);
    expect(textos).toEqual(
      expect.arrayContaining([
        'Todo al día por hoy',
        'Nadie te debe',
        'Aún no hay ingresos este año',
        'Aún no tienes unidades',
      ]),
    );
    // Las barras del año se ven vacías (alto 0), no desaparecen.
    expect(porTestId(raiz, 'barra-anterior')).toHaveLength(10);
    expect(porTestId(raiz, 'cuadro-unidad')).toHaveLength(0);
  });

  it('ya no hay tendencia de 6 meses ni "Cerrar sesión" en el Panel', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    expect(raiz.root.findAllByType(GraficaAreaIngresos)).toHaveLength(0);
    expect(hayBoton(raiz, 'Cerrar sesión')).toBe(false);
  });
});

describe('carga, error y refresco', () => {
  it('mientras carga: el saludo y un esqueleto, sin cifras', async () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<PanelArrendadorPantalla />, sesion);
    const textos = textosDe(raiz);
    expect(textos).toContain('Hola, Marta Ríos');
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'Cargando').length,
    ).toBeGreaterThan(0);
    expect(textos).not.toContain('Para hoy');
  });

  it('error: mensaje y "Reintentar", que vuelve a pedir el Panel y lo muestra', async () => {
    programar(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<PanelArrendadorPantalla />, sesion);
    await esperar();
    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);
    programar(PANEL_COMPLETO);
    await act(async () => {
      botonDe(raiz, 'Reintentar').props.onPress();
    });
    await esperar();
    expect(textosDe(raiz)).toContain('7 de 8');
    expect(llamadasAlPanel()).toBe(2);
  });

  it('pull-to-refresh vuelve a pedir el Panel', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    expect(llamadasAlPanel()).toBe(1);
    await act(async () => {
      await raiz.root.findByType(RefreshControl).props.onRefresh();
    });
    expect(llamadasAlPanel()).toBe(2);
  });

  it('al volver a enfocar la pestaña refresca solo si los datos ya están viejos', async () => {
    const { raiz, cliente } = await montarPanel(PANEL_COMPLETO);
    void raiz;
    const enfocar = () =>
      act(async () => {
        mockEnfoques[mockEnfoques.length - 1]();
        await new Promise<void>((r) => setTimeout(r, 20));
      });
    await enfocar();
    expect(llamadasAlPanel()).toBe(1);
    await act(async () => {
      cliente
        .getQueryCache()
        .find({ queryKey: ['arrendador', 'panel'] })
        ?.invalidate();
      // TanStack avisa del cambio con un setTimeout(0): la pantalla ya ve los datos como viejos.
      await new Promise<void>((r) => setTimeout(r, 20));
    });
    await enfocar();
    expect(llamadasAlPanel()).toBe(2);
  });

  it('no hay intervalo: sin enfocar ni arrastrar, no vuelve a pedir', async () => {
    await montarPanel(PANEL_COMPLETO);
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 80));
    });
    expect(llamadasAlPanel()).toBe(1);
  });
});

describe('insignia de la pestaña Pagos (misma fuente que el Panel)', () => {
  const etiquetaDePagos = (raiz: ReactTestRenderer) =>
    raiz.root
      .findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'tab')
      .map((n) => n.props.accessibilityLabel as string)
      .find((e) => e.startsWith('Pagos'));

  async function montarBarra(panel: PanelArrendador | Error) {
    programar(panel);
    const montado = await renderizarPantalla(<LayoutPestanas />, sesion);
    await esperar();
    return montado.raiz;
  }

  it('con 3 comprobantes por validar: "3"', async () => {
    const raiz = await montarBarra(PANEL_COMPLETO);
    expect(etiquetaDePagos(raiz)).toBe('Pagos, 3 pendientes');
    expect(textosDe(raiz)).toContain('3');
  });

  it('con 0 no hay insignia', async () => {
    const raiz = await montarBarra(PANEL_EN_CERO);
    expect(etiquetaDePagos(raiz)).toBe('Pagos');
  });

  it('con más de 9, "9+"', async () => {
    const raiz = await montarBarra({
      ...PANEL_COMPLETO,
      pendientes: { ...PANEL_COMPLETO.pendientes, comprobantes_por_validar: 12 },
    });
    expect(etiquetaDePagos(raiz)).toBe('Pagos, 9+ pendientes');
    expect(textosDe(raiz)).toContain('9+');
  });

  it('con el Panel cargando o con error no hay insignia ni error en la barra', async () => {
    const raiz = await montarBarra(new ErrorSinConexion());
    expect(etiquetaDePagos(raiz)).toBe('Pagos');
  });

  it('las otras pestañas nunca llevan insignia', async () => {
    const raiz = await montarBarra(PANEL_COMPLETO);
    const etiquetas = raiz.root
      .findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'tab')
      .map((n) => n.props.accessibilityLabel as string);
    expect(etiquetas).toEqual(['Panel', 'Inmuebles', 'Contratos', 'Pagos, 3 pendientes', 'Más']);
  });
});
