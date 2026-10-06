// Mi panel del inquilino, rediseño (R3-B): cabecera, próximo pago, cómo pagar, accesos, "Tus pagos",
// "Tu contrato" y la última solicitud, cada bloque solo con datos; programado y finalizado sin los
// bloques que no aplican. API y router son dobles; el reloj está fijo (2 de octubre de 2026, Bogotá).
import { act, type ReactTestRenderer } from 'react-test-renderer';

import MiPanel from '../../app/(inquilino)/(pestanas)/mi-panel';
import type { EstadoCuenta, PeriodoCuenta } from '../api/contratos';
import type {
  ContratoInquilinoDetalle,
  ContratoInquilinoResumen,
  PanelContratoActivo,
  PanelContratoInquilino,
} from '../api/inquilino';
import type { SolicitudInquilino } from '../api/mantenimiento';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { fijarReloj, restaurarReloj } from '../pruebas/reloj';
import type { DatosSesion } from '../sesion/tipos';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPush = jest.fn();
const mockCopiar = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
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
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopiar(...a) }));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn(), patch: jest.fn() },
}));

const sesion: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// ---- Datos (hoy: viernes 2 de octubre de 2026 en Bogotá) ----

const resumen = (extra: Partial<ContratoInquilinoResumen> = {}): ContratoInquilinoResumen => ({
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
  estado_pago: 'al_dia',
  ...extra,
});

const PANEL: PanelContratoActivo = {
  contrato_id: 'c1',
  estado: 'ACTIVO',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  dias_restantes: 90,
  canon_vigente_centavos: 185_000_000,
  estado_pago: 'pendiente',
  proximo_periodo: {
    periodo: '2026-10-01T00:00:00.000Z',
    fecha_limite: '2026-10-05T00:00:00.000Z',
    monto_centavos: 185_000_000,
    estado: 'PENDIENTE',
  },
  periodos_vencidos: { cantidad: 0, total_pendiente_centavos: 0 },
};

const DETALLE = {
  contratoId: 'c1',
  unidad: { id: 'u1' },
  estado: 'ACTIVO',
  programado: false,
  datos_recaudo: 'Bancolombia ahorros 123-456 a nombre de Marta Ríos',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
} as unknown as ContratoInquilinoDetalle;

const periodo = (mes: string, estado: PeriodoCuenta['estado']): PeriodoCuenta => ({
  periodo: `${mes}-01T00:00:00.000Z`,
  fechaLimite: `${mes}-05T00:00:00.000Z`,
  canonVigenteCentavos: 185_000_000,
  estado,
  montoAprobadoCentavos: estado === 'PAGADO' ? 185_000_000 : 0,
});
const MESES_2026 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map(
  (m) => `2026-${m}`,
);
const CUENTA: EstadoCuenta = {
  estadoPago: 'pendiente',
  periodos: MESES_2026.map((m) => periodo(m, m === '2026-10' ? 'PENDIENTE' : 'PAGADO')),
};

const solicitud = (id: string, extra: Partial<SolicitudInquilino> = {}): SolicitudInquilino => ({
  id,
  arrendador_id: 'a1',
  unidad_id: 'u1',
  inquilino_id: 'i1',
  descripcion: `Solicitud ${id}`,
  urgencia: 'MEDIO',
  estado: 'PENDIENTE',
  creado_en: '2026-09-30T15:00:00.000Z',
  actualizado_en: '2026-09-30T15:00:00.000Z',
  adjunto_url: null,
  adjunto_tipo: null,
  ...extra,
});
const SOLICITUDES = [
  solicitud('s2', {
    descripcion: 'Goteo en el lavaplatos',
    estado: 'EN_PROCESO',
    adjunto_tipo: 'IMAGEN',
    adjunto_url: 'https://b.test/s/s2.jpg?token=FIRMA',
  }),
  solicitud('s1', { descripcion: 'Bombillo del pasillo', creado_en: '2026-08-01T15:00:00.000Z' }),
];

/** Lo que responde cada ruta; un Error se lanza; `undefined` es 404. */
let rutas: Record<string, unknown> = {};
function programar(extra: Record<string, unknown> = {}) {
  rutas = {
    '/inquilino/contratos': [resumen()],
    '/inquilino/contratos/c1/panel': PANEL,
    '/inquilino/contratos/c1': DETALLE,
    '/inquilino/contratos/c1/estado-cuenta': CUENTA,
    '/inquilino/solicitudes?contratoId=c1': SOLICITUDES,
    '/inquilino/alertas/conteo': { no_leidas: 0 },
    ...extra,
  };
}

beforeEach(() => {
  mockGet.mockReset();
  mockPush.mockReset();
  mockCopiar.mockReset().mockResolvedValue(true);
  mockGet.mockImplementation(async (url: string) => {
    const valor = rutas[url];
    if (valor === undefined) throw new Error(`Ruta inesperada: ${url}`);
    if (valor instanceof Error) throw valor;
    return valor;
  });
  programar();
  fijarReloj();
});
afterEach(() => restaurarReloj());

const montar = async () =>
  (
    await renderizarPantalla(
      <ContratoSeleccionadoProvider>
        <MiPanel />
      </ContratoSeleccionadoProvider>,
      sesion,
    )
  ).raiz;

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const todo = (raiz: ReactTestRenderer) => textosDe(raiz).join(' | ');
const pulsar = async (raiz: ReactTestRenderer, titulo: string) => {
  await act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
  await esperar();
};
/** Los bloques de Mi panel que hay en pantalla, en orden (solo nodos nativos, sin repetir). */
const BLOQUES = [
  'proximo-pago',
  'como-pagar',
  'accesos-panel',
  'tus-pagos',
  'tu-contrato',
  'ultima-solicitud',
];
const bloques = (raiz: ReactTestRenderer) =>
  raiz.root
    .findAll((n) => typeof n.type === 'string' && BLOQUES.includes(n.props.testID))
    .map((n) => n.props.testID as string);
const porTestId = (raiz: ReactTestRenderer, id: string) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);

// ---------------------------------------------------------------------------------------------

describe('Mi panel ACTIVO: bloques y orden', () => {
  it('cabecera: "Hola, {nombre}" e "{inmueble} · {unidad}" (abre Mis contratos)', async () => {
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Hola, Camilo Pardo');
    expect(t).toContain('Calle 45 # 12-30 · Apto 302');
    const selector = raiz.root.find(
      (n) =>
        typeof n.props.onPress === 'function' &&
        String(n.props.accessibilityLabel ?? '').startsWith('Cambiar de contrato'),
    );
    await act(async () => selector.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/mis-contratos');
  });

  it('con todos los datos: próximo pago, cómo pagar, accesos, tus pagos, tu contrato y solicitudes, en ese orden', async () => {
    const raiz = await montar();
    expect(bloques(raiz)).toEqual(BLOQUES);
  });

  it('próximo pago: mes, chip "Faltan N días", monto, fecha límite con día de la semana y "Reportar pago"', async () => {
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Tu próximo pago · Octubre');
    expect(t).toContain('Faltan 3 días');
    expect(t).toContain('$ 1.850.000');
    expect(t).toContain('Fecha límite: lunes 5 de octubre');
    await pulsar(raiz, 'Reportar pago');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reportar-pago',
      params: { contratoId: 'c1' },
    });
  });

  it('vence hoy: chip "Vence hoy"', async () => {
    programar({
      '/inquilino/contratos/c1/panel': {
        ...PANEL,
        proximo_periodo: { ...PANEL.proximo_periodo!, fecha_limite: '2026-10-02T00:00:00.000Z' },
      },
    });
    const raiz = await montar();
    expect(todo(raiz)).toContain('Vence hoy');
  });

  it('con períodos vencidos: chip "Vencido hace N días" y la línea de alerta con el total del servidor', async () => {
    programar({
      '/inquilino/contratos/c1/panel': {
        ...PANEL,
        estado_pago: 'en_mora',
        proximo_periodo: {
          periodo: '2026-09-01T00:00:00.000Z',
          fecha_limite: '2026-09-05T00:00:00.000Z',
          monto_centavos: 185_000_000,
          estado: 'VENCIDO',
        },
        periodos_vencidos: { cantidad: 2, total_pendiente_centavos: 370_000_000 },
      },
    });
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Tu próximo pago · Septiembre');
    expect(t).toContain('Vencido hace 27 días');
    expect(t).toContain('2 períodos vencidos · Total pendiente $ 3.700.000');
    expect(hayBoton(raiz, 'Reportar pago')).toBe(true);
  });

  it('sin período pendiente: "Estás al día", sin chip de plazo ni "Reportar pago"', async () => {
    programar({
      '/inquilino/contratos/c1/panel': { ...PANEL, estado_pago: 'al_dia', proximo_periodo: null },
    });
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Estás al día');
    expect(t).not.toMatch(/Faltan|Vence hoy|Vencido hace/);
    expect(hayBoton(raiz, 'Reportar pago')).toBe(false);
    expect(t).not.toContain('períodos vencidos');
  });

  it('cómo pagar: el texto del arrendador y "Copiar"', async () => {
    const raiz = await montar();
    expect(todo(raiz)).toContain('Cómo pagar');
    expect(todo(raiz)).toContain('Bancolombia ahorros 123-456 a nombre de Marta Ríos');
    await pulsar(raiz, 'Copiar');
    expect(mockCopiar).toHaveBeenCalledWith('Bancolombia ahorros 123-456 a nombre de Marta Ríos');
    expect(todo(raiz)).toContain('Copiado');
  });

  it('sin datos_recaudo: la sección "Cómo pagar" no aparece', async () => {
    programar({ '/inquilino/contratos/c1': { ...DETALLE, datos_recaudo: null } });
    const raiz = await montar();
    expect(todo(raiz)).not.toContain('Cómo pagar');
    expect(hayBoton(raiz, 'Copiar')).toBe(false);
    expect(bloques(raiz)).not.toContain('como-pagar');
  });

  it('accesos: Mi contrato, Estado de cuenta, Documentos y Nueva solicitud', async () => {
    const raiz = await montar();
    await pulsar(raiz, 'Mi contrato');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Estado de cuenta');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Documentos');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1', seccion: 'documentos' },
    });
    await pulsar(raiz, 'Nueva solicitud');
    expect(mockPush).toHaveBeenLastCalledWith('/nueva-solicitud');
  });

  it('"Tus pagos": la línea de los períodos del estado de cuenta, legible con lector, sin inventar "a tiempo"', async () => {
    const raiz = await montar();
    expect(todo(raiz)).toContain('Tus pagos');
    const linea = raiz.root.find(
      (n) =>
        typeof n.type === 'string' &&
        String(n.props.accessibilityLabel ?? '').startsWith('Historial de pagos'),
    );
    expect(linea.props.accessibilityLabel).toContain('enero: Pagado');
    expect(linea.props.accessibilityLabel).toContain('octubre: Por vencer');
    expect(todo(raiz)).not.toMatch(/a tiempo/);
  });

  it('si el estado de cuenta falla, "Tus pagos" no aparece y el resto sigue', async () => {
    programar({ '/inquilino/contratos/c1/estado-cuenta': new Error('sin red') });
    const raiz = await montar();
    expect(bloques(raiz)).not.toContain('tus-pagos');
    expect(bloques(raiz)).toContain('proximo-pago');
  });

  it('"Tu contrato": estado, días restantes del servidor, avance y fechas', async () => {
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Tu contrato');
    expect(t).toContain('Activo');
    expect(t).toContain('90');
    expect(t).toContain('días restantes');
    expect(t).toContain('1 ene. 2026');
    expect(t).toContain('31 dic. 2026');
    // 274 de 364 días transcurridos el 2 de octubre.
    const [barra] = porTestId(raiz, 'avance-contrato');
    expect(barra.props.style).toEqual(expect.arrayContaining([{ width: '75%' }]));
  });

  it('"Solicitudes": la más reciente con su miniatura, urgencia, "hace N días" y estado; abre su detalle', async () => {
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Goteo en el lavaplatos');
    expect(t).toContain('Urgencia media · hace 2 días');
    expect(t).toContain('En proceso');
    expect(t).not.toContain('Bombillo del pasillo');
    expect(porTestId(raiz, 'miniatura-solicitud')).toHaveLength(1);
    await pulsar(raiz, 'Goteo en el lavaplatos');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/solicitud/[id]',
      params: { id: 's2' },
    });
    await act(async () => {
      raiz.root
        .find(
          (n) => n.props.accessibilityRole === 'link' && n.props.accessibilityLabel === 'Ver todas',
        )
        .props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith('/solicitudes');
  });

  it('una solicitud sin foto muestra el icono (sin miniatura)', async () => {
    programar({ '/inquilino/solicitudes?contratoId=c1': [solicitud('s1')] });
    const raiz = await montar();
    expect(todo(raiz)).toContain('Solicitud s1');
    expect(porTestId(raiz, 'miniatura-solicitud')).toHaveLength(0);
  });

  it('sin solicitudes: la sección no aparece', async () => {
    programar({ '/inquilino/solicitudes?contratoId=c1': [] });
    const raiz = await montar();
    expect(bloques(raiz)).not.toContain('ultima-solicitud');
    expect(todo(raiz)).not.toContain('Ver todas');
  });

  it('mientras carga el panel: esqueleto con la forma de los bloques', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/inquilino/contratos') return [resumen()];
      return new Promise(() => undefined);
    });
    const raiz = await montar();
    await esperar();
    expect(porTestId(raiz, 'esqueleto-mi-panel')).toHaveLength(1);
  });
});

describe('Mi panel PROGRAMADO y finalizado', () => {
  const PROGRAMADO: PanelContratoInquilino = {
    contratoFinalizado: false,
    programado: true,
    estado: 'PROGRAMADO',
    fecha_inicio: '2027-02-01T00:00:00.000Z',
    fecha_fin: '2028-01-31T00:00:00.000Z',
  };

  it('PROGRAMADO: "Tu contrato empieza el …", accesos de lectura y sin pago, cómo pagar ni historial', async () => {
    programar({
      '/inquilino/contratos': [resumen({ estado: 'PROGRAMADO', estado_pago: null })],
      '/inquilino/contratos/c1/panel': PROGRAMADO,
    });
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Tu contrato empieza el 1 de febrero de 2027');
    expect(t).toContain('Programado');
    expect(hayBoton(raiz, 'Reportar pago')).toBe(false);
    expect(t).not.toContain('Cómo pagar');
    expect(t).not.toContain('Tus pagos');
    expect(hayBoton(raiz, 'Nueva solicitud')).toBe(false);
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c1');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c1/estado-cuenta');
    await pulsar(raiz, 'Mi contrato');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Documentos');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1', seccion: 'documentos' },
    });
  });

  it('finalizado: el mensaje del estado y los accesos de consulta, sin pago ni solicitudes nuevas', async () => {
    programar({
      '/inquilino/contratos': [resumen({ estado: 'VENCIDO', estado_pago: null })],
      '/inquilino/contratos/c1/panel': { contratoFinalizado: true, estado: 'VENCIDO' },
    });
    const raiz = await montar();
    const t = todo(raiz);
    expect(t).toContain('Tu contrato finalizó.');
    expect(hayBoton(raiz, 'Reportar pago')).toBe(false);
    expect(t).not.toContain('Cómo pagar');
    expect(hayBoton(raiz, 'Nueva solicitud')).toBe(false);
    await pulsar(raiz, 'Estado de cuenta');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
  });
});
