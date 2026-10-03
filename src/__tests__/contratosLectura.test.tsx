// Contratos del arrendador (E5-A, R2-B): lista compacta con búsqueda y filtros, detalle con cabecera,
// accesos y "Gestionar contrato", y las pantallas de documentos y de código de acceso.
import { Alert, Linking, RefreshControl, ScrollView, Share, StyleSheet } from 'react-native';
import { act } from 'react-test-renderer';

import ContratosTab from '../../app/(arrendador)/(pestanas)/contratos-arrendador';
import Acceso from '../../app/(arrendador)/contrato/[id]/acceso';
import Documentos from '../../app/(arrendador)/contrato/[id]/documentos';
import Detalle from '../../app/(arrendador)/contrato/[id]/index';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type {
  ContratoDetalle,
  ContratoResumen,
  DocumentoContrato,
  EstadoCuenta,
  PeriodoCuenta,
} from '../api/contratos';
import { contratoListaEjemplo } from '../pruebas/datosContratos';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { fijarReloj, restaurarReloj } from '../pruebas/reloj';
import { coloresEstado } from '../tema';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
const mockBorrar = jest.fn();
const mockCopiar = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="codigo-qr" {...props} />,
  };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopiar(...a) }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDescargar(...a),
  deleteAsync: (...a: unknown[]) => mockBorrar(...a),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...a: unknown[]) => mockCompartir(...a),
}));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const resumen = (extra: Partial<ContratoResumen> & { id: string }): ContratoResumen =>
  contratoListaEjemplo(extra);
const DETALLE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-10-01T00:00:00.000Z',
  fecha_fin: '2027-09-30T00:00:00.000Z',
  canon_centavos: 250_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  dia_pago: 5,
  deposito_centavos: null,
  datos_recaudo: 'Cuenta de ahorros 123',
  estado_pago: 'AL_DIA',
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2099-10-08T12:00:00.000Z' },
  incrementos_ipc: [],
  aviso_no_renovacion: { estado: 'NINGUNO', dado_por: null, dado_en: null, motivo: null },
  terminacion_anticipada: {
    estado: 'NINGUNA',
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
  },
};
const DOC: DocumentoContrato = {
  id: 'd1',
  tipo: 'CONTRATO_ORIGINAL',
  version: 1,
  generado_en: '2026-10-01T15:00:00.000Z',
  hash_sha256: 'abc',
  url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO1',
};

/** Un período del estado de cuenta (fecha límite el día 5 del mes). */
const periodo = (mes: string, estado: PeriodoCuenta['estado']): PeriodoCuenta => ({
  periodo: `${mes}T00:00:00.000Z`,
  fechaLimite: `${mes.slice(0, 8)}05T00:00:00.000Z`,
  canonVigenteCentavos: 250_000_000,
  montoAprobadoCentavos: estado === 'PARCIAL' ? 100_000_000 : 0,
  estado,
});

const datos: {
  lista: ContratoResumen[];
  detalle: ContratoDetalle;
  docs: DocumentoContrato[];
  /** null: el estado de cuenta responde con error. */
  cuenta: EstadoCuenta | null;
} = {
  lista: [],
  detalle: DETALLE,
  docs: [DOC],
  cuenta: { estadoPago: 'al_dia', periodos: [] },
};

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const pulsar = async (raiz: Raiz, titulo: string) => {
  await act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
  await esperar();
};
const qr = (raiz: Raiz) => raiz.root.findAll((n) => n.props.testID === 'codigo-qr')[0];

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPost,
    mockPush,
    mockBack,
    mockReplace,
    mockDescargar,
    mockCompartir,
    mockBorrar,
    mockCopiar,
  ]) {
    m.mockReset();
  }
  mockParams = { id: 'c1' };
  Object.assign(datos, {
    lista: [],
    detalle: DETALLE,
    docs: [DOC],
    cuenta: { estadoPago: 'al_dia', periodos: [] },
  });
  mockGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/contratos') return datos.lista;
    if (ruta === '/contratos/c1') return datos.detalle;
    if (ruta === '/contratos/c1/documentos') return datos.docs;
    if (ruta === '/contratos/c1/estado-cuenta') {
      if (!datos.cuenta) throw new ErrorSinConexion();
      return datos.cuenta;
    }
    throw new Error(`GET inesperado ${ruta}`);
  });
  mockDescargar.mockResolvedValue({ status: 200, uri: 'file:///cache/contrato-c1-v1.pdf' });
  mockCompartir.mockResolvedValue(undefined);
  mockBorrar.mockResolvedValue(undefined);
  mockCopiar.mockResolvedValue(true);
});

describe('Pestaña Contratos (R2-B)', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<ContratosTab />);
    await esperar();
    return r;
  };
  const filtro = (raiz: Raiz, etiqueta: string) =>
    raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'tab' &&
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith(etiqueta) &&
        !!n.props.onPress,
    );
  const elegir = async (raiz: Raiz, etiqueta: string) => {
    await act(async () => filtro(raiz, etiqueta).props.onPress());
  };
  const buscar = async (raiz: Raiz, texto: string) => {
    await act(async () =>
      raiz.root
        .find((n) => n.props.accessibilityLabel === 'Buscar contrato' && !!n.props.onChangeText)
        .props.onChangeText(texto),
    );
  };
  const fila = (raiz: Raiz, nombre: string) =>
    raiz.root.find(
      (n) =>
        n.props.testID === 'fila-contrato' &&
        typeof n.type !== 'string' &&
        n.findAll((h) => h.props.children === nombre).length > 0,
    );
  const textosDeFila = (raiz: Raiz, nombre: string) =>
    fila(raiz, nombre)
      .findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string')
      .map((n) => n.props.children as string);

  // Al día, en mora, sin vincular, programado y dos cerrados (uno con deuda).
  const LISTA = [
    resumen({ id: 'a', vinculado: true, inquilino: { id: 'q1', nombre: 'José Peña' } }),
    resumen({
      id: 'm',
      vinculado: true,
      estado_pago: 'EN_MORA',
      unidad: { id: 'u2', nombre: 'Local 5', tipo: 'LOCAL' },
      inquilino: { id: 'q2', nombre: 'Laura Mejía' },
    }),
    resumen({
      id: 's',
      unidad: { id: 'u3', nombre: 'Casa Laureles', tipo: 'CASA' },
      inquilino: { id: 'q3', nombre: 'Andrés Velásquez' },
    }),
    resumen({
      id: 'p',
      estado: 'PROGRAMADO',
      estado_pago: 'PENDIENTE',
      unidad: { id: 'u4', nombre: 'Apto 601', tipo: 'APARTAMENTO' },
      inquilino: { id: 'q4', nombre: 'Paula Herrera' },
    }),
    resumen({
      id: 'v',
      estado: 'VENCIDO',
      estado_pago: 'EN_MORA',
      unidad: { id: 'u5', nombre: 'Apto 101', tipo: 'APARTAMENTO' },
      inquilino: { id: 'q5', nombre: 'Marta Ríos' },
    }),
    resumen({
      id: 'x',
      estado: 'CANCELADO',
      estado_pago: 'PENDIENTE',
      unidad: { id: 'u6', nombre: 'Bodega', tipo: 'LOCAL' },
      inquilino: { id: 'q6', nombre: 'Comercial Norte' },
    }),
  ];

  it('sin contratos: mensaje propio y botón "Nuevo contrato"', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Aún no tienes contratos');
    await pulsar(raiz, 'Nuevo contrato');
    expect(mockPush).toHaveBeenCalledWith('/contrato/nuevo');
  });

  it('cargando: esqueleto', async () => {
    mockGet.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<ContratosTab />);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityRole === 'progressbar').length,
    ).toBeGreaterThan(0);
  });

  it('error: mensaje y Reintentar', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    );
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('Aún no tienes contratos');
  });

  it('cabecera: "N contratos · M activos" y "Nuevo"', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('6 contratos · 3 activos');
    await pulsar(raiz, 'Nuevo');
    expect(mockPush).toHaveBeenCalledWith('/contrato/nuevo');
  });

  it('fila: iniciales, inquilino, "unidad · hasta …", canon y estado con tono; abre el detalle', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    expect(textosDeFila(raiz, 'José Peña')).toEqual(
      expect.arrayContaining(['JP', 'Apto 302 · hasta 30/09/2027', '$ 2.500.000', 'Al día']),
    );
    expect(textosDeFila(raiz, 'Laura Mejía')).toContain('En mora');
    expect(textosDeFila(raiz, 'Andrés Velásquez')).toContain('Sin vincular');
    expect(textosDeFila(raiz, 'Paula Herrera')).toEqual(
      expect.arrayContaining(['Apto 601 · desde 01/10/2026', 'Programado']),
    );
    await act(async () => fila(raiz, 'Laura Mejía').props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/contrato/[id]', params: { id: 'm' } });
  });

  it('el punto y el texto de estado usan el tono: éxito, peligro, neutro y programado', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    const punto = (nombre: string) =>
      StyleSheet.flatten(
        fila(raiz, nombre).findAll(
          (n) => typeof n.type === 'string' && n.props.testID === 'punto-estado',
        )[0].props.style,
      ).backgroundColor;
    expect(punto('José Peña')).toBe(coloresEstado.exito.senal);
    expect(punto('Laura Mejía')).toBe(coloresEstado.peligro.senal);
    expect(punto('Andrés Velásquez')).toBe(coloresEstado.neutro.senal);
    expect(punto('Paula Herrera')).toBe(coloresEstado.programado.senal);
  });

  it('con "Todos", los cerrados van aparte en "Cerrados" (con su texto)', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    const seccion = raiz.root.find(
      (n) => n.props.testID === 'seccion-cerrados' && typeof n.type !== 'string',
    );
    const nombres = seccion
      .findAll((n) => n.props.testID === 'fila-contrato' && !!n.props.onPress)
      .map((n) => n.findAll((h) => typeof h.props.children === 'string')[0]);
    expect(nombres).toHaveLength(2);
    expect(textosDeFila(raiz, 'Marta Ríos')).toEqual(
      expect.arrayContaining(['Apto 101 · finalizó el 30/09/2027', 'En mora']),
    );
    expect(textosDeFila(raiz, 'Comercial Norte')).toEqual(
      expect.arrayContaining(['Bodega · cancelado', 'Cerrado']),
    );
    expect(textosDe(raiz)).toContain('Cerrados');
  });

  it('filtros con conteo: Todos 6, Activos 3, En mora 2, Cerrados 2; cada uno muestra lo suyo', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    for (const [etiqueta, n] of [
      ['Todos', 6],
      ['Activos', 3],
      ['En mora', 2],
      ['Cerrados', 2],
    ] as const) {
      expect(filtro(raiz, etiqueta).props.accessibilityLabel).toBe(`${etiqueta}, ${n}`);
    }
    const visibles = () =>
      raiz.root
        .findAll((n) => n.props.testID === 'fila-contrato' && !!n.props.onPress)
        .map((n) => n.props.accessibilityLabel as string);
    await elegir(raiz, 'Activos');
    expect(visibles()).toEqual(['José Peña', 'Laura Mejía', 'Andrés Velásquez']);
    await elegir(raiz, 'En mora');
    expect(visibles()).toEqual(['Laura Mejía', 'Marta Ríos']);
    await elegir(raiz, 'Cerrados');
    expect(visibles()).toEqual(['Marta Ríos', 'Comercial Norte']);
    await elegir(raiz, 'Todos');
    expect(visibles()).toHaveLength(6);
  });

  it('búsqueda por unidad o inquilino sin tildes; vacío con búsqueda tiene su propio mensaje', async () => {
    datos.lista = LISTA;
    const { raiz } = await montar();
    await buscar(raiz, 'jose pena');
    const visibles = () =>
      raiz.root
        .findAll((n) => n.props.testID === 'fila-contrato' && !!n.props.onPress)
        .map((n) => n.props.accessibilityLabel as string);
    expect(visibles()).toEqual(['José Peña']);
    await buscar(raiz, 'LOCAL');
    expect(visibles()).toEqual(['Laura Mejía']);
    await buscar(raiz, 'zzz');
    expect(visibles()).toEqual([]);
    expect(textosDe(raiz).join(' ')).toContain('Ningún contrato coincide con «zzz»');
    expect(textosDe(raiz)).not.toContain('Aún no tienes contratos');
  });

  it('ningún contrato en el filtro: mensaje distinto de "no tienes contratos"', async () => {
    datos.lista = [resumen({ id: 'a' })];
    const { raiz } = await montar();
    await elegir(raiz, 'Cerrados');
    expect(textosDe(raiz)).toContain('Ningún contrato en este filtro');
    expect(textosDe(raiz)).not.toContain('Aún no tienes contratos');
  });

  it('arrastrar para refrescar vuelve a pedir la lista', async () => {
    const { raiz } = await montar();
    const antes = mockGet.mock.calls.length;
    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    expect(control.type).toBe(RefreshControl);
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
  });
});

describe('Detalle del contrato (R2-B)', () => {
  beforeEach(() => fijarReloj());
  afterEach(() => restaurarReloj());
  const montar = async () => {
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r;
  };
  const enGrilla = (raiz: Raiz, etiqueta: string) =>
    raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === etiqueta &&
        !!n.props.onPress,
    );

  it('cabecera: chip combinado, plantilla, unidad, canon "/ mes · día N" y avance con días restantes', async () => {
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Activo · Al día');
    expect(textos).toContain('Vivienda urbana (Ley 820 de 2003)');
    expect(textos).toContain('Apto 302');
    expect(textos).toContain('$ 2.500.000');
    expect(textos).toContain('/ mes · día 5');
    expect(textos).toEqual(expect.arrayContaining(['01/10/2026', '30/09/2027']));
    // Hoy (simulado) es 02/10/2026: faltan 363 días.
    expect(textos).toContain('363 días restantes');
  });

  it('en mora: el chip lo dice; si no está activo, el estado reemplaza a los días restantes', async () => {
    datos.detalle = { ...DETALLE, estado_pago: 'EN_MORA' };
    let { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Activo · En mora');
    datos.detalle = { ...DETALLE, estado: 'PROGRAMADO', estado_pago: 'PENDIENTE' };
    ({ raiz } = await montar());
    expect(textosDe(raiz)).toContain('Programado');
    expect(textosDe(raiz).join(' ')).not.toContain('días restantes');
    expect(textosDe(raiz).join(' ')).toContain('Empieza el 01/10/2026');
  });

  it('la flecha de atrás vuelve', async () => {
    const { raiz } = await montar();
    await act(async () => enGrilla(raiz, 'Volver').props.onPress());
    expect(mockBack).toHaveBeenCalled();
  });

  it('tarjeta del inquilino: iniciales, nombre, cédula, vínculo y "Llamar" (tel:) solo con teléfono', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toEqual(
      expect.arrayContaining(['CP', 'Camilo Pardo', 'Cédula 1020304050', 'Sin vincular']),
    );
    await pulsar(raiz, 'Llamar');
    expect(abrir).toHaveBeenCalledWith('tel:3001234567');

    datos.detalle = {
      ...DETALLE,
      vinculado: true,
      inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050' },
    };
    const sin = await montar();
    expect(hayBoton(sin.raiz, 'Llamar')).toBe(false);
    expect(textosDe(sin.raiz)).toContain('Vinculado');
  });

  it('accesos: Estado de cuenta, Documentos, Código de acceso e Inventario llevan a su pantalla', async () => {
    const { raiz } = await montar();
    for (const [etiqueta, pathname] of [
      ['Estado de cuenta', '/contrato/[id]/estado-cuenta'],
      ['Documentos', '/contrato/[id]/documentos'],
      ['Código de acceso', '/contrato/[id]/acceso'],
      ['Inventario', '/contrato/[id]/inventario'],
    ] as const) {
      await act(async () => enGrilla(raiz, etiqueta).props.onPress());
      expect(mockPush).toHaveBeenLastCalledWith({ pathname, params: { id: 'c1' } });
    }
  });

  it('próximos pagos: hasta 3 períodos sin pagar con su estado y fecha límite (del estado de cuenta)', async () => {
    datos.cuenta = {
      estadoPago: 'en_mora',
      periodos: [
        periodo('2026-10-01', 'PAGADO'),
        periodo('2026-11-01', 'VENCIDO'),
        periodo('2026-12-01', 'PARCIAL'),
        periodo('2027-01-01', 'EN_REVISION'),
        periodo('2027-02-01', 'PENDIENTE'),
      ],
    };
    const { raiz } = await montar();
    const seccion = raiz.root.find(
      (n) => n.props.testID === 'proximos-pagos' && typeof n.type !== 'string',
    );
    const textos = seccion
      .findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string')
      .map((n) => n.props.children as string);
    expect(textos).toEqual(
      expect.arrayContaining(['Noviembre de 2026', 'Diciembre de 2026', 'Enero de 2027']),
    );
    expect(textos).not.toContain('Octubre de 2026');
    expect(textos).not.toContain('Febrero de 2027');
    expect(textos).toEqual(expect.arrayContaining(['Vencido', 'Parcial', 'En revisión']));
    expect(textos).toContain('Fecha límite 05/11/2026');
  });

  it('próximos pagos sin pendientes: lo dice; si el estado de cuenta falla, no inventa nada', async () => {
    datos.cuenta = { estadoPago: 'al_dia', periodos: [periodo('2026-10-01', 'PAGADO')] };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('No hay pagos pendientes.');
    datos.cuenta = null;
    const otro = await montar();
    expect(textosDe(otro.raiz)).toContain('Camilo Pardo');
    expect(textosDe(otro.raiz)).not.toContain('No hay pagos pendientes.');
  });

  it('condiciones: plantilla, día de pago, teléfono y datos de recaudo; vivienda sin depósito', async () => {
    datos.detalle = { ...DETALLE, deposito_centavos: 500_000_000 };
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toEqual(
      expect.arrayContaining([
        'Condiciones',
        'Plantilla',
        'Día de pago',
        'Día 5 de cada mes',
        'Teléfono del inquilino',
        '3001234567',
        'Datos de recaudo',
        'Cuenta de ahorros 123',
      ]),
    );
    expect(textos.join('|')).not.toContain('Depósito');
  });

  it('local o parqueadero: muestra el depósito; el correo solo si el servidor lo envía', async () => {
    datos.detalle = {
      ...DETALLE,
      tipo_plantilla: 'LOCAL_COMERCIAL',
      deposito_centavos: 500_000_000,
      inquilino: { ...DETALLE.inquilino, correo: 'camilo@x.co' },
    };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toEqual(expect.arrayContaining(['Depósito', '$ 5.000.000']));
    expect(textosDe(raiz)).toContain('camilo@x.co');
  });

  it('historial de incrementos de IPC en solo lectura', async () => {
    datos.detalle = {
      ...DETALLE,
      incrementos_ipc: [
        {
          id: 'i1',
          fecha_aplicacion: '2027-10-01T00:00:00.000Z',
          canon_anterior_centavos: 250_000_000,
          canon_nuevo_centavos: 260_000_000,
          porcentaje_ipc_aplicado: '4',
        },
      ],
    };
    const { raiz } = await montar();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Incrementos de IPC');
    expect(todo).toContain('$ 2.500.000 → $ 2.600.000');
    expect(todo).toContain('01/10/2027');
  });

  it('sin incrementos no hay sección', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz).join('|')).not.toContain('Incrementos de IPC');
  });

  it('aviso de no renovación y terminación anticipada: solo información, sin acciones de aviso ni de terminación', async () => {
    datos.detalle = {
      ...DETALLE,
      aviso_no_renovacion: {
        estado: 'DADO',
        dado_por: 'INQUILINO',
        dado_en: '2026-12-01T10:00:00.000Z',
        motivo: 'Me mudo',
      },
      terminacion_anticipada: {
        estado: 'SOLICITADA',
        solicitada_por: 'ARRENDADOR',
        solicitada_en: '2026-12-02T10:00:00.000Z',
        motivo: 'Venta',
        fecha_efectiva: '2027-01-31T00:00:00.000Z',
      },
    };
    const { raiz } = await montar();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Aviso de no renovación dado por el inquilino el 01/12/2026');
    expect(todo).toContain('Me mudo');
    expect(todo).toContain('Terminación anticipada solicitada por el arrendador');
    expect(todo).toContain('31/01/2027');
    for (const accion of [
      'Cancelar aviso',
      'Dar aviso de no renovación',
      'Confirmar terminación',
      'Solicitar terminación anticipada',
    ]) {
      expect(hayBoton(raiz, accion)).toBe(false);
    }
  });

  describe('Gestionar contrato: filas según la disponibilidad existente', () => {
    const FILAS = [
      'Aplicar incremento',
      'Prorrogar contrato',
      'Dar aviso de no renovación',
      'Cancelar aviso',
      'Solicitar terminación anticipada',
      'Corregir datos',
      'Corregir datos del inquilino',
      'Cancelar contrato programado',
    ];
    const filas = async (detalle: ContratoDetalle) => {
      datos.detalle = detalle;
      const { raiz } = await montar();
      return FILAS.filter((t) => hayBoton(raiz, t));
    };
    const conAviso = (extra: Partial<ContratoDetalle>): ContratoDetalle => ({
      ...DETALLE,
      aviso_no_renovacion: {
        estado: 'NINGUNO',
        dado_por: null,
        dado_en: null,
        motivo: null,
        puede_dar: true,
        puede_cancelar: false,
      },
      ...extra,
    });

    it('activo vinculado: incremento, prórroga, aviso y terminación (sin corregir)', async () => {
      expect(await filas(conAviso({ vinculado: true, codigo_acceso: null }))).toEqual([
        'Aplicar incremento',
        'Prorrogar contrato',
        'Dar aviso de no renovación',
        'Solicitar terminación anticipada',
      ]);
    });

    it('activo sin vincular: además, corregir datos y datos del inquilino', async () => {
      expect(await filas(conAviso({}))).toEqual([
        'Aplicar incremento',
        'Prorrogar contrato',
        'Dar aviso de no renovación',
        'Solicitar terminación anticipada',
        'Corregir datos',
        'Corregir datos del inquilino',
      ]);
    });

    it('programado: corregir y cancelar el contrato programado', async () => {
      expect(await filas({ ...DETALLE, estado: 'PROGRAMADO' })).toEqual([
        'Corregir datos',
        'Corregir datos del inquilino',
        'Cancelar contrato programado',
      ]);
    });

    it('cerrado: ninguna fila (y sin la sección)', async () => {
      expect(await filas({ ...DETALLE, estado: 'VENCIDO' })).toEqual([]);
      expect(textosDe((await montar()).raiz)).not.toContain('Gestionar contrato');
    });

    it('cada fila explica la acción en una línea', async () => {
      datos.detalle = conAviso({});
      const { raiz } = await montar();
      const textos = textosDe(raiz);
      expect(textos).toContain('Gestionar contrato');
      expect(textos).toContain('Sube el canon con el IPC del año anterior.');
      expect(textos).toContain('Mientras el inquilino no vincule el contrato.');
    });
  });

  it('404: "Contrato no encontrado" con botón para volver', async () => {
    mockGet.mockImplementation(async (ruta: string) => {
      if (ruta === '/contratos/c1') {
        throw new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
      }
      return [];
    });
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Contrato no encontrado');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('otro error: mensaje y Reintentar', async () => {
    mockGet.mockImplementationOnce(async () => {
      throw new ErrorSinConexion();
    });
    const { raiz } = await montar();
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('Camilo Pardo');
  });
});

// R2-B: la sección de documentos pasó a su propia pantalla (contrato/[id]/documentos): mismas pruebas.
describe('Documentos del contrato (pantalla)', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Documentos />);
    await esperar();
    return r;
  };

  it('lista las versiones con tipo legible, versión y fecha', async () => {
    datos.docs = [
      DOC,
      {
        ...DOC,
        id: 'd2',
        tipo: 'OTROSI_INCREMENTO',
        version: 2,
        generado_en: '2027-10-01T15:00:00.000Z',
      },
    ];
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Contrato original');
    expect(textos).toContain('Versión 1 · 01/10/2026');
    expect(textos).toContain('Otrosí por incremento');
    expect(textos).toContain('Versión 2 · 01/10/2027');
  });

  it('"Ver y compartir": pide la lista fresca, descarga al caché y abre el selector; funciona dos veces', async () => {
    const { raiz } = await montar();
    const pedidos = () =>
      mockGet.mock.calls.filter((c) => c[0] === '/contratos/c1/documentos').length;
    const antes = pedidos();

    await pulsar(raiz, 'Ver y compartir');
    expect(pedidos()).toBe(antes + 1);
    expect(mockDescargar).toHaveBeenCalledWith(
      'https://b.test/s/doc1.pdf?token=SECRETO1',
      'file:///cache/contrato-c1-v1.pdf',
    );
    expect(mockCompartir).toHaveBeenCalledWith(
      'file:///cache/contrato-c1-v1.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );

    // Segunda vez: la URL firmada nueva viene de otra lista fresca.
    datos.docs = [{ ...DOC, url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO2' }];
    await pulsar(raiz, 'Ver y compartir');
    expect(mockDescargar).toHaveBeenCalledTimes(2);
    expect(mockDescargar.mock.calls[1][0]).toContain('SECRETO2');
    expect(mockCompartir).toHaveBeenCalledTimes(2);
  });

  it('el archivo descargado se borra del caché después de compartirlo', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    expect(mockBorrar).toHaveBeenCalledWith('file:///cache/contrato-c1-v1.pdf', {
      idempotent: true,
    });
  });

  it('doble toque: una sola descarga', async () => {
    let terminar!: (v: unknown) => void;
    mockDescargar.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const boton = raiz.root.find(
      (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityState?.busy === true,
    );
    await act(async () => boton.props.onPress());
    await act(async () => boton.props.onPress());
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    await act(async () => terminar({ status: 200, uri: 'file:///cache/contrato-c1-v1.pdf' }));
    await esperar();
  });

  it('sin url_firmada: "Archivo no disponible", sin romper la pantalla', async () => {
    datos.docs = [{ ...DOC, url_firmada: null }];
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Archivo no disponible');
    expect(hayBoton(raiz, 'Ver y compartir')).toBe(false);
    // La pantalla sigue en pie (antes se comprobaba con el nombre del inquilino del detalle).
    expect(textosDe(raiz)).toContain('Contrato original');
  });

  it('la lista fresca trae el archivo sin URL: avisa "Archivo no disponible"', async () => {
    const { raiz } = await montar();
    datos.docs = [{ ...DOC, url_firmada: null }];
    await pulsar(raiz, 'Ver y compartir');
    expect(mockDescargar).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Archivo no disponible');
  });

  it('si falla la descarga: mensaje claro (sin URL) y Reintentar', async () => {
    mockDescargar.mockRejectedValueOnce(
      new Error('fallo https://b.test/s/doc1.pdf?token=SECRETO1'),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const textos = textosDe(raiz);
    expect(textos).toContain('No pudimos descargar el documento. Inténtalo de nuevo.');
    expect(textos.join('|')).not.toMatch(/SECRETO|b\.test/);
    await pulsar(raiz, 'Reintentar');
    expect(mockCompartir).toHaveBeenCalledTimes(1);
  });

  it('un estado HTTP de error al descargar también es un fallo', async () => {
    mockDescargar.mockResolvedValueOnce({ status: 403, uri: 'file:///cache/x.pdf' });
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    expect(textosDe(raiz)).toContain('No pudimos descargar el documento. Inténtalo de nuevo.');
    expect(mockCompartir).not.toHaveBeenCalled();
  });

  it('nada sensible en los logs (URL firmada, código, cédula)', async () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const impreso = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    expect(impreso).not.toMatch(/SECRETO|RC-AB3D|1020304050/);
  });
});

// R2-B: el código de acceso pasó a su propia pantalla (contrato/[id]/acceso): mismas pruebas.
describe('Código de acceso (pantalla)', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Acceso />);
    await esperar();
    return r;
  };

  it('sin vincular y vigente: texto, QR solo con el código, copiar y compartir', async () => {
    const compartir = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('RC-AB3D-9KPX');
    expect(qr(raiz).props.value).toBe('RC-AB3D-9KPX');
    await pulsar(raiz, 'Copiar código');
    expect(mockCopiar).toHaveBeenCalledWith('RC-AB3D-9KPX');
    expect(textosDe(raiz)).toContain('Copiado');
    await pulsar(raiz, 'Compartir código');
    expect(compartir.mock.calls[0][0].message).toContain('Hola Camilo Pardo');
    expect(compartir.mock.calls[0][0].message).toContain('RC-AB3D-9KPX');
  });

  it('vinculado: sin código ni QR, con la explicación', async () => {
    datos.detalle = { ...DETALLE, vinculado: true, codigo_acceso: null };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('El inquilino ya vinculó este contrato.');
    expect(qr(raiz)).toBeUndefined();
    expect(hayBoton(raiz, 'Regenerar código')).toBe(false);
  });

  it('vinculado aunque el servidor aún mande el código: no se muestra', async () => {
    datos.detalle = { ...DETALLE, vinculado: true };
    const { raiz } = await montar();
    expect(textosDe(raiz).join('|')).not.toContain('RC-AB3D-9KPX');
    expect(qr(raiz)).toBeUndefined();
  });

  it('expirado: lo dice y ofrece regenerar (sin QR)', async () => {
    datos.detalle = {
      ...DETALLE,
      codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2020-01-01T00:00:00.000Z' },
    };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Este código expiró.');
    expect(qr(raiz)).toBeUndefined();
    expect(hayBoton(raiz, 'Regenerar código')).toBe(true);
  });

  it('regenerar pide confirmación, cambia el código mostrado y el doble toque no lo repite', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let terminar!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();

    await pulsar(raiz, 'Regenerar código');
    expect(alerta.mock.calls[0][0]).toBe('Regenerar código');
    expect(alerta.mock.calls[0][1]).toBe('El código anterior dejará de servir.');
    expect(mockPost).not.toHaveBeenCalled();

    const confirmar = alerta.mock.calls[0][2]?.[1];
    await act(async () => confirmar?.onPress?.());
    await act(async () => confirmar?.onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/regenerar-codigo');

    await act(async () =>
      terminar({ codigo: 'RC-ZZZZ-2222', expira_en: '2099-11-01T12:00:00.000Z' }),
    );
    await esperar();
    expect(textosDe(raiz)).toContain('RC-ZZZZ-2222');
    expect(textosDe(raiz).join('|')).not.toContain('RC-AB3D-9KPX');
    expect(qr(raiz).props.value).toBe('RC-ZZZZ-2222');
  });

  it('cancelar la confirmación no regenera', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await montar();
    await pulsar(raiz, 'Regenerar código');
    expect(alerta.mock.calls[0][2]?.[0].text).toBe('Cancelar');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('si regenerar falla: mensaje en español, sin el código', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(
      new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'RC-AB3D-9KPX no' }),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Regenerar código');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await esperar();
    expect(textosDe(raiz)).toContain(
      'No encontrado. Puede que ya no exista o que no tengas acceso.',
    );
    expect(textosDe(raiz)).toContain('RC-AB3D-9KPX');
  });
});
