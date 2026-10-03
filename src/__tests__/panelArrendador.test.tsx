// Panel del arrendador (E9-B): datos completos, arrendador nuevo en cero, carga y error con reintento,
// navegación de cada pendiente, pendientes con ipc_faltante y la insignia de la pestaña Pagos. La API y el
// router son dobles. El mes y las fechas salen del servidor (el Panel ya no depende de la fecha de hoy).
import { RefreshControl } from 'react-native';
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

const PANEL_COMPLETO: PanelArrendador = {
  mes: '2026-10',
  calculado_para: '2026-10-02',
  ingresos_mes_centavos: millones(13.65),
  recaudo: {
    esperado_centavos: millones(17.6),
    aprobado_centavos: millones(13.65),
    en_revision_centavos: millones(3.35),
    sin_reportar_centavos: millones(0.6),
    contratos: 8,
  },
  ocupacion: { unidades: 8, ocupadas: 7, libres: 1, con_contrato_programado: 1 },
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
  ingresos_mes_centavos: 0,
  recaudo: {
    esperado_centavos: 0,
    aprobado_centavos: 0,
    en_revision_centavos: 0,
    sin_reportar_centavos: 0,
    contratos: 0,
  },
  ocupacion: { unidades: 0, ocupadas: 0, libres: 0, con_contrato_programado: 0 },
  mora: { contratos: 0, periodos: 0, total_centavos: 0 },
  tendencia: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((mes) => ({
    mes,
    ingresos_centavos: 0,
  })),
  pendientes: {
    comprobantes_por_validar: 0,
    mantenimientos_pendientes: 0,
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

describe('Panel del arrendador: datos completos', () => {
  let raiz: ReactTestRenderer;
  let textos: string[];
  beforeEach(async () => {
    ({ raiz } = await montarPanel(PANEL_COMPLETO));
    textos = textosDe(raiz);
  });

  it('cabecera: saludo, mes del servidor, recaudo del mes y campana de alertas', () => {
    expect(textos).toContain('Hola, Marta Ríos');
    expect(textos).toContain('Octubre de 2026');
    expect(textos).toContain('Recaudado en octubre');
    expect(textos).toContain('$ 13.650.000');
    expect(textos).toContain('de $ 17.600.000 esperados');
    expect(raiz.root.findByType(BotonIcono).props.icono).toBe('alerta');
  });

  it('el anillo recibe tal cual aprobado, en revisión y sin reportar del servidor', () => {
    expect(raiz.root.findByType(AnilloRecaudo).props).toMatchObject({
      aprobadoCentavos: millones(13.65),
      enRevisionCentavos: millones(3.35),
      sinReportarCentavos: millones(0.6),
    });
  });

  it('ocupación: "7 de 8 unidades", libres y con contrato programado (sin mini-plano)', () => {
    expect(textos).toContain('Ocupación');
    expect(textos).toContain('7 de 8 unidades');
    expect(textos).toContain('1 libre');
    expect(textos).toContain('1 con contrato programado');
  });

  it('cartera en mora: total en dinero, contratos y períodos tal cual', () => {
    expect(textos).toContain('Cartera en mora');
    expect(textos).toContain('$ 21.000.000');
    expect(textos).toContain('2 contratos · 4 períodos');
    expect(textos).toContain('Calculada al 02/10/2026');
  });

  it('tendencia: los 6 meses del servidor con etiqueta corta, el actual al final y en curso', () => {
    expect(textos).toContain('Ingresos aprobados');
    const grafica = raiz.root.findByType(GraficaAreaIngresos).props;
    expect(grafica.meses.map((m: { etiqueta: string }) => m.etiqueta)).toEqual([
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
    ]);
    expect(grafica.meses[5].centavos).toBe(millones(13.65));
    expect(grafica.ultimoEnCurso).toBe(true);
    expect(grafica.etiquetaBurbuja).toBe('oct. en curso');
    expect(textos).toContain('Ingresos de octubre: $ 13.650.000');
  });

  it('no escribe "promedio": el servidor no entrega uno y la gráfica no dibuja uno', () => {
    expect(textos.join('|').toLowerCase()).not.toContain('promedio');
    expect(raiz.root.findByType(GraficaAreaIngresos).props.conPromedio).toBe(false);
  });

  it('pendientes: cinco secciones con su conteo', () => {
    expect(textos).toContain('Pendientes');
    for (const titulo of [
      'Comprobantes por validar',
      'Mantenimientos pendientes',
      'Contratos por vencer (30 días)',
      'Incrementos disponibles',
      'Terminaciones por confirmar',
    ]) {
      expect(textos).toContain(titulo);
    }
    expect(textos).toContain('3');
    expect(textos).toContain('2');
    expect(textos).toContain('7');
    expect(textos).toContain('1');
  });

  it('pendientes con elementos: unidad e inmueble de cada uno, y cuántos quedan sin mostrar', () => {
    expect(textos).toContain('Casa Laureles');
    expect(textos).toContain('Carrera 70 # 5-20');
    expect(textos).toContain('Vence el 25/10/2026');
    expect(textos).toContain('Local 53');
    // 7 en total y 2 en la lista: quedan 5.
    expect(textos).toContain('y 5 más');
    expect(textos).toContain('Apto 505');
    expect(textos).toContain('Calle 5 # 6-7');
  });

  it('no repite "Cerrar sesión": ya vive en la pestaña Más', () => {
    expect(hayBoton(raiz, 'Cerrar sesión')).toBe(false);
  });
});

describe('incrementos con ipc_faltante', () => {
  it('el contrato se muestra y se explica que falta el IPC; el que no lo necesita no lleva el aviso', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    const textos = textosDe(raiz);
    expect(textos).toContain('Apto 404');
    expect(textos).toContain('Disponible desde 15/09/2026');
    expect(textos).toContain('Falta el IPC del año anterior: aún no se puede aplicar.');
    expect(textos).toContain('Apto 303');
    expect(textos).toContain('Disponible desde 01/09/2026');
    // Solo el contrato con ipc_faltante lleva el aviso.
    expect(
      textos.filter((t) => t === 'Falta el IPC del año anterior: aún no se puede aplicar.'),
    ).toHaveLength(1);
  });

  it('y sigue siendo navegable a la pantalla de incremento', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    await act(async () => {
      botonDe(raiz, 'Apto 404').props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/incremento',
      params: { id: 'ci2' },
    });
  });
});

describe('navegación de los pendientes', () => {
  it.each([
    ['Comprobantes por validar', { pathname: '/pagos-arrendador' }],
    ['Mantenimientos pendientes', { pathname: '/mantenimiento' }],
    ['Casa Laureles', { pathname: '/contrato/[id]', params: { id: 'cv1' } }],
    ['Local 53', { pathname: '/contrato/[id]', params: { id: 'cv2' } }],
    ['Apto 303', { pathname: '/contrato/[id]/incremento', params: { id: 'ci1' } }],
    ['Apto 505', { pathname: '/contrato/[id]/terminacion', params: { id: 'ct1' } }],
  ])('tocar "%s" abre su pantalla', async (titulo, destino) => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    await act(async () => {
      botonDe(raiz, titulo).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(destino);
  });

  it('las cabeceras de contratos (por vencer, incrementos, terminaciones) no son botones: navegan sus elementos', async () => {
    const { raiz } = await montarPanel(PANEL_COMPLETO);
    for (const titulo of [
      'Contratos por vencer (30 días)',
      'Incrementos disponibles',
      'Terminaciones por confirmar',
    ]) {
      expect(hayBoton(raiz, titulo)).toBe(false);
    }
  });

  it('con 0 comprobantes o 0 mantenimientos esas filas no navegan (no hay nada que resolver)', async () => {
    const { raiz } = await montarPanel(PANEL_EN_CERO);
    expect(hayBoton(raiz, 'Comprobantes por validar')).toBe(false);
    expect(hayBoton(raiz, 'Mantenimientos pendientes')).toBe(false);
  });

  it('un elemento con contrato_id vacío se muestra pero no navega', async () => {
    const panel: PanelArrendador = {
      ...PANEL_COMPLETO,
      pendientes: {
        ...PANEL_COMPLETO.pendientes,
        contratos_por_vencer: {
          cantidad: 1,
          contratos: [
            { contrato_id: '', unidad: 'Sin id', inmueble: 'Calle 0', fecha_fin: '2026-10-25' },
          ],
        },
      },
    };
    const { raiz } = await montarPanel(panel);
    expect(textosDe(raiz)).toContain('Sin id');
    expect(hayBoton(raiz, 'Sin id')).toBe(false);
  });
});

describe('arrendador nuevo: todo en cero', () => {
  let raiz: ReactTestRenderer;
  let textos: string[];
  beforeEach(async () => {
    ({ raiz } = await montarPanel(PANEL_EN_CERO));
    textos = textosDe(raiz);
  });

  it('el recaudo dice que no hay esperado y no dibuja un anillo vacío', () => {
    expect(textos).toContain('Recaudado en octubre');
    expect(textos).toContain('$ 0');
    expect(textos).toContain('Aún no hay recaudo esperado este mes.');
    expect(raiz.root.findAllByType(AnilloRecaudo)).toHaveLength(0);
  });

  it('sin unidades lo dice, sin "0 de 0 unidades"', () => {
    expect(textos).toContain('Aún no tienes unidades');
    expect(textos).not.toContain('0 de 0 unidades');
  });

  it('sin mora: estado positivo', () => {
    expect(textos).toContain('Sin cartera en mora');
    expect(textos).not.toContain('0 contratos · 0 períodos');
  });

  it('tendencia toda en ceros: mensaje en vez de una gráfica rota', () => {
    expect(textos).toContain('Aún no hay ingresos aprobados en los últimos 6 meses.');
    expect(raiz.root.findAllByType(GraficaAreaIngresos)).toHaveLength(0);
  });

  it('pendientes: cada sección sigue ahí con un estado vacío corto', () => {
    for (const titulo of [
      'Comprobantes por validar',
      'Mantenimientos pendientes',
      'Contratos por vencer (30 días)',
      'Incrementos disponibles',
      'Terminaciones por confirmar',
    ]) {
      expect(textos).toContain(titulo);
    }
    expect(textos.filter((t) => t === 'Sin pendientes')).toHaveLength(5);
  });
});

describe('datos raros no rompen la pantalla', () => {
  it('tendencia vacía, listas vacías con cantidad mayor a cero y un solo mes', async () => {
    const panel: PanelArrendador = {
      ...PANEL_COMPLETO,
      tendencia: [],
      pendientes: {
        ...PANEL_COMPLETO.pendientes,
        contratos_por_vencer: { cantidad: 3, contratos: [] },
        incrementos_disponibles: { cantidad: 0, contratos: [] },
      },
    };
    const { raiz } = await montarPanel(panel);
    const textos = textosDe(raiz);
    expect(textos).toContain('Aún no hay ingresos aprobados.');
    expect(raiz.root.findAllByType(GraficaAreaIngresos)).toHaveLength(0);
    expect(textos).toContain('Contratos por vencer (30 días)');
    expect(textos).toContain('y 3 más');
  });

  it('un solo mes de tendencia con ingresos dibuja la gráfica', async () => {
    const panel: PanelArrendador = {
      ...PANEL_COMPLETO,
      tendencia: [{ mes: '2026-10', ingresos_centavos: millones(5) }],
    };
    const { raiz } = await montarPanel(panel);
    expect(raiz.root.findByType(GraficaAreaIngresos).props.meses).toHaveLength(1);
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
    expect(textos).not.toContain('Pendientes');
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
    expect(textosDe(raiz)).toContain('7 de 8 unidades');
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
