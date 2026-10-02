// Pagos del inquilino (E7-A): pestaña Pagos (recaudo, períodos, historial) y formulario de reporte
// con comprobante (idempotencia, avisos, errores por código).
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import PagosInquilino from '../../app/(inquilino)/(pestanas)/pagos';
import ReportarPago from '../../app/(inquilino)/reportar-pago';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { EstadoCuenta, PeriodoCuenta } from '../api/contratos';
import type { PagoRespuesta } from '../api/pagos';
import { SelectorFecha } from '../componentes/contratos/PasoFechas';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { FORMATO_CLAVE_IDEMPOTENCIA } from '../utilidades/idempotencia';
import { crearToken } from '../pruebas/crearToken';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';
import type { DatosSesion } from '../sesion/tipos';
import { hoyBogota } from '../utilidades/fechas';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockSubir = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockElegirFoto = jest.fn();
const mockDocumento = jest.fn();
const mockManipular = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
const mockBorrar = jest.fn();
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
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: async () => true }));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: jest.fn(),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegirFoto(...a),
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDescargar(...a),
  deleteAsync: (...a: unknown[]) => mockBorrar(...a),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...a: unknown[]) => mockCompartir(...a),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...a: unknown[]) => mockDocumento(...a),
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...a: unknown[]) => mockManipular(...a) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

const sesion: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// ---- Datos ----

const periodo = (iso: string, estado: PeriodoCuenta['estado'], aprobado = 0): PeriodoCuenta => ({
  periodo: `${iso}T00:00:00.000Z`,
  fechaLimite: `${iso.slice(0, 8)}05T00:00:00.000Z`,
  canonVigenteCentavos: 150_000_000,
  estado,
  montoAprobadoCentavos: aprobado,
});
const CUENTA: EstadoCuenta = {
  estadoPago: 'en_mora',
  periodos: [
    periodo('2026-09-01', 'PAGADO', 150_000_000),
    periodo('2026-10-01', 'VENCIDO'),
    periodo('2026-11-01', 'EN_REVISION'),
    periodo('2026-12-01', 'PENDIENTE'),
  ],
};

const CONTRATO_DE_PAGO: PagoRespuesta['contrato'] = {
  id: 'c1',
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  canon_centavos: 150_000_000,
  dia_pago: 5,
  forma_pago: 'Transferencia',
  deposito_centavos: null,
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2027-12-31T00:00:00.000Z',
  estado: 'ACTIVO',
  unidad: {
    id: 'u1',
    inmueble_id: 'm1',
    nombre: 'Apto 302',
    tipo: 'APARTAMENTO',
    metros_cuadrados: null,
    numero_habitaciones: null,
    numero_banos: null,
    canon_base_centavos: 150_000_000,
    ocupantes_maximos: null,
    acepta_mascotas: false,
    uso_permitido: 'RESIDENCIAL',
    foto_principal_url: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    inmueble: { id: 'm1', direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
  },
  inquilino: { id: 'i1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
};

const pago = (id: string, extra: Partial<PagoRespuesta> = {}): PagoRespuesta => ({
  id,
  arrendador_id: 'a1',
  contrato_id: 'c1',
  monto_centavos: 150_000_000,
  fecha_reportada: '2026-10-06T00:00:00.000Z',
  periodo: '2026-10-01T00:00:00.000Z',
  estado: 'PENDIENTE',
  motivo_rechazo: null,
  mensaje_rechazo: null,
  comprobante_url: null,
  comprobante_tipo: null,
  periodo_cuenta: null,
  contrato: CONTRATO_DE_PAGO,
  creado_en: '2026-10-06T15:00:00.000Z',
  actualizado_en: '2026-10-06T15:00:00.000Z',
  ...extra,
});

const resumen = (estado: string) => ({
  id: 'c1',
  estado,
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2027-12-31T00:00:00.000Z',
  unidad: { nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
  estado_pago: estado === 'ACTIVO' ? 'en_mora' : null,
});

const datos: {
  estadoContrato: string;
  cuenta: unknown;
  pagos: unknown;
  detalle: unknown;
  panel: unknown;
} = { estadoContrato: 'ACTIVO', cuenta: CUENTA, pagos: [], detalle: {}, panel: {} };

function responder(url: string): Promise<unknown> {
  const mapa: Record<string, unknown> = {
    '/inquilino/contratos': [resumen(datos.estadoContrato)],
    '/inquilino/contratos/c1': datos.detalle,
    '/inquilino/contratos/c1/estado-cuenta': datos.cuenta,
    '/inquilino/contratos/c1/panel': datos.panel,
    '/pagos/mios?contratoId=c1': datos.pagos,
  };
  const valor = url in mapa ? mapa[url] : new Error(`Ruta inesperada: ${url}`);
  return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
}
const llamadasA = (ruta: string) => mockGet.mock.calls.filter(([u]) => u === ruta).length;

// ---- Ayudas ----

const montar = (pantalla: ReactNode) =>
  renderizarPantalla(
    <ContratoSeleccionadoProvider>{pantalla}</ContratoSeleccionadoProvider>,
    sesion,
  );
type Raiz = Awaited<ReturnType<typeof montar>>['raiz'];
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
const todo = (raiz: Raiz) => textosDe(raiz).join(' | ');
const cuantos = (raiz: Raiz, texto: string) => textosDe(raiz).filter((t) => t === texto).length;
let alerta: jest.SpyInstance;
const confirmarAlerta = async (n = 0) => {
  await act(async () => {
    alerta.mock.calls[n][2][1].onPress();
  });
  await esperar();
};

const PDF = {
  canceled: false,
  assets: [
    {
      name: 'recibo.pdf',
      size: 250_000,
      uri: 'file:///cache/DocumentPicker/recibo.pdf',
      mimeType: 'application/pdf',
      lastModified: 1,
    },
  ],
};
const elegirElPdf = (raiz: Raiz) => {
  mockDocumento.mockResolvedValue(PDF);
  return pulsar(raiz, 'Elegir un PDF');
};

beforeEach(() => {
  jest.restoreAllMocks();
  mockDescargar.mockReset().mockResolvedValue({ status: 200, uri: 'file:///cache/c' });
  mockCompartir.mockReset().mockResolvedValue(undefined);
  mockBorrar.mockReset().mockResolvedValue(undefined);
  for (const m of [
    mockGet,
    mockSubir,
    mockPush,
    mockBack,
    mockReplace,
    mockElegirFoto,
    mockDocumento,
    mockManipular,
  ])
    m.mockReset();
  mockGet.mockImplementation(responder);
  mockSubir.mockResolvedValue(pago('nuevo'));
  mockParams = { contratoId: 'c1', periodo: '2026-10-01' };
  datos.estadoContrato = 'ACTIVO';
  datos.cuenta = CUENTA;
  datos.pagos = [];
  datos.detalle = {
    contratoId: 'c1',
    estado: 'ACTIVO',
    datos_recaudo: 'Bancolombia ahorros 123-456',
  };
  datos.panel = {
    contrato_id: 'c1',
    estado: 'ACTIVO',
    fecha_fin: '2027-12-31T00:00:00.000Z',
    dias_restantes: 400,
    canon_vigente_centavos: 150_000_000,
    estado_pago: 'en_mora',
    proximo_periodo: {
      periodo: '2026-10-01T00:00:00.000Z',
      fecha_limite: '2026-10-05T00:00:00.000Z',
      monto_centavos: 150_000_000,
      estado: 'VENCIDO',
    },
    periodos_vencidos: { cantidad: 1, total_pendiente_centavos: 150_000_000 },
  };
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------------------------

describe('pestaña Pagos del inquilino', () => {
  it('contrato ACTIVO: datos de recaudo, períodos con su chip y botón de reportar en los no pagados', async () => {
    const { raiz } = await montar(<PagosInquilino />);
    const t = todo(raiz);
    expect(t).toContain('Datos de recaudo');
    expect(t).toContain('Bancolombia ahorros 123-456');
    expect(t).toContain('Septiembre de 2026');
    expect(t).toContain('Pagado');
    // 3 períodos no pagados: vencido, en revisión y por vencer
    expect(cuantos(raiz, 'Reportar pago')).toBe(3);
  });

  it('un período EN_REVISION se muestra "En revisión", nunca como vencido', async () => {
    datos.cuenta = {
      estadoPago: 'pendiente',
      periodos: [periodo('2026-11-01', 'EN_REVISION')],
    };
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).toContain('En revisión');
    expect(todo(raiz)).not.toContain('Vencido');
  });

  it('"Reportar pago" abre el formulario con ese contrato y período', async () => {
    datos.cuenta = { estadoPago: 'en_mora', periodos: [periodo('2026-10-01', 'VENCIDO')] };
    const { raiz } = await montar(<PagosInquilino />);
    await pulsar(raiz, 'Reportar pago');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reportar-pago',
      params: { contratoId: 'c1', periodo: '2026-10-01' },
    });
  });

  it('historial: período, monto, fecha, chip y, si fue rechazado, el motivo en texto humano y el mensaje', async () => {
    datos.pagos = [
      pago('p1', {
        estado: 'RECHAZADO',
        motivo_rechazo: 'MONTO_NO_COINCIDE',
        mensaje_rechazo: 'Faltan 50.000',
      }),
      pago('p2', { estado: 'RECHAZADO', motivo_rechazo: 'OTRO', mensaje_rechazo: 'Foto borrosa' }),
      pago('p3', { estado: 'APROBADO', periodo: '2026-09-01T00:00:00.000Z' }),
      pago('p4', { estado: 'REEMPLAZADO' }),
      pago('p5', { estado: 'PENDIENTE' }),
    ];
    const { raiz } = await montar(<PagosInquilino />);
    const t = todo(raiz);
    expect(t).toContain('Mis pagos');
    expect(t).toContain('$ 1.500.000');
    expect(t).toContain('06/10/2026');
    expect(t).toContain('Rechazado');
    expect(t).toContain('El monto no coincide');
    expect(t).toContain('Faltan 50.000');
    expect(t).toContain('Foto borrosa');
    expect(t).toContain('Aprobado');
    expect(t).toContain('Reemplazado');
    // OTRO: solo el mensaje, sin un texto de motivo inventado
    expect(t).not.toContain('Otro motivo');
  });

  it('un rechazo anterior a B0.6-A1 (sin motivo ni mensaje) no inventa nada', async () => {
    datos.pagos = [pago('p1', { estado: 'RECHAZADO' })];
    const { raiz } = await montar(<PagosInquilino />);
    const t = todo(raiz);
    expect(t).toContain('Rechazado');
    expect(t).not.toMatch(/El monto no coincide|No se ve el pago|no se lee|Motivo/);
  });

  it('historial vacío', async () => {
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).toContain('Aún no has reportado pagos.');
  });

  it('error al cargar los pagos: aviso y "Reintentar"', async () => {
    datos.pagos = new ErrorSinConexion();
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    datos.pagos = [];
    const antes = llamadasA('/pagos/mios?contratoId=c1');
    await pulsar(raiz, 'Reintentar');
    expect(llamadasA('/pagos/mios?contratoId=c1')).toBeGreaterThan(antes);
  });

  it('sin contratos: estado vacío con "Agregar contrato con código"', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/inquilino/contratos' ? Promise.resolve([]) : responder(url),
    );
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).toContain('Aún no tienes contratos');
    await pulsar(raiz, 'Agregar contrato con código');
    expect(mockPush).toHaveBeenCalledWith('/agregar-contrato');
  });

  it('contrato VENCIDO: sin recaudo y solo se reporta en períodos VENCIDO o PARCIAL', async () => {
    datos.estadoContrato = 'VENCIDO';
    datos.cuenta = {
      estadoPago: 'en_mora',
      periodos: [
        periodo('2026-09-01', 'PAGADO', 150_000_000),
        periodo('2026-10-01', 'VENCIDO'),
        periodo('2026-11-01', 'EN_REVISION'),
        periodo('2026-12-01', 'PARCIAL', 50_000_000),
      ],
    };
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).not.toContain('Datos de recaudo');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c1');
    expect(cuantos(raiz, 'Reportar pago')).toBe(2);
  });

  it('contrato PROGRAMADO: sin recaudo, sin botón de reportar y sin pedir períodos', async () => {
    datos.estadoContrato = 'PROGRAMADO';
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).not.toContain('Datos de recaudo');
    expect(cuantos(raiz, 'Reportar pago')).toBe(0);
    expect(todo(raiz)).toContain('Cuando tu contrato empiece podrás reportar tus pagos aquí.');
  });

  it('ACTIVO sin datos de recaudo (null): no muestra la tarjeta', async () => {
    datos.detalle = { contratoId: 'c1', estado: 'ACTIVO', datos_recaudo: null };
    const { raiz } = await montar(<PagosInquilino />);
    expect(todo(raiz)).not.toContain('Datos de recaudo');
  });
});

// ---------------------------------------------------------------------------------------------

describe('formulario de reporte de pago', () => {
  it('preselecciona el período del parámetro y precarga el monto con el saldo del período', async () => {
    const { raiz } = await montar(<ReportarPago />);
    expect(todo(raiz)).toContain('Octubre de 2026');
    expect(campoDe(raiz, 'Monto pagado')?.props.value).toBe('1.500.000');
  });

  it('sin parámetro usa proximo_periodo del panel', async () => {
    mockParams = { contratoId: 'c1' };
    datos.panel = {
      ...(datos.panel as object),
      proximo_periodo: {
        periodo: '2026-12-01T00:00:00.000Z',
        fecha_limite: '2026-12-05T00:00:00.000Z',
        monto_centavos: 150_000_000,
        estado: 'PENDIENTE',
      },
    };
    const { raiz } = await montar(<ReportarPago />);
    await esperar();
    expect(
      raiz.root.findAll(
        (n) =>
          n.props.accessibilityState?.selected === true &&
          n.props.accessibilityLabel === 'Diciembre de 2026',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('el período se puede cambiar entre los reportables y el monto se vuelve a precargar', async () => {
    const { raiz } = await montar(<ReportarPago />);
    await act(async () => {
      raiz.root
        .findAll(
          (n) =>
            n.props.accessibilityLabel === 'Diciembre de 2026' &&
            typeof n.props.onPress === 'function',
        )[0]
        .props.onPress();
    });
    expect(campoDe(raiz, 'Monto pagado')?.props.value).toBe('1.500.000');
    // PAGADO no es reportable
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'Septiembre de 2026').length,
    ).toBe(0);
  });

  it('fecha: por defecto hoy, máximo hoy y mínimo el inicio del contrato', async () => {
    const { raiz } = await montar(<ReportarPago />);
    const selector = raiz.root.findAllByType(SelectorFecha)[0];
    expect(selector.props.valor).toBe(hoyBogota());
    expect(selector.props.maximo).toBe(hoyBogota());
    expect(selector.props.minimo).toBe('2026-01-01');
  });

  it('sin comprobante no se envía ni se pide confirmación', async () => {
    const { raiz } = await montar(<ReportarPago />);
    await pulsar(raiz, 'Enviar');
    expect(alerta).not.toHaveBeenCalled();
    expect(mockSubir).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Adjunta el comprobante del pago.');
  });

  it('monto menor al canon: aviso de pago parcial (no bloquea)', async () => {
    const { raiz } = await montar(<ReportarPago />);
    await escribirEn(raiz, 'Monto pagado', '1000000');
    expect(todo(raiz)).toContain(
      'Este monto es menor al canon: el período quedará como pago parcial al aprobarse.',
    );
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    expect(alerta).toHaveBeenCalledTimes(1);
  });

  it('monto mayor al canon: aviso de que no cubre otros meses', async () => {
    const { raiz } = await montar(<ReportarPago />);
    await escribirEn(raiz, 'Monto pagado', '2000000');
    expect(todo(raiz)).toContain(
      'Un monto mayor no cubre otros meses; cada período se reporta por separado.',
    );
  });

  it('período EN_REVISION: avisa que el comprobante anterior quedará reemplazado', async () => {
    mockParams = { contratoId: 'c1', periodo: '2026-11-01' };
    const { raiz } = await montar(<ReportarPago />);
    expect(todo(raiz)).toContain(
      'Ya tienes un comprobante en revisión para este período; al enviar este, el anterior quedará reemplazado.',
    );
  });

  it('con PDF: muestra nombre y tamaño; permite quitarlo', async () => {
    const { raiz } = await montar(<ReportarPago />);
    expect(mockDocumento).not.toHaveBeenCalled();
    await elegirElPdf(raiz);
    expect(todo(raiz)).toContain('recibo.pdf');
    expect(todo(raiz)).toContain('244 KB');
    await pulsar(raiz, 'Quitar comprobante');
    expect(todo(raiz)).not.toContain('recibo.pdf');
  });

  it('con foto de la cámara: se reduce antes de subir (JPEG)', async () => {
    mockElegirFoto.mockResolvedValue({
      tipo: 'elegida',
      archivo: { uri: 'file:///cache/f.jpg', name: 'portada.jpg', type: 'image/jpeg' },
    });
    const referencia = {
      width: 1200,
      height: 900,
      saveAsync: jest
        .fn()
        .mockResolvedValue({ uri: 'file:///cache/reducida.jpg', width: 1200, height: 900 }),
    };
    mockManipular.mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn().mockResolvedValue(referencia),
    });
    const { raiz } = await montar(<ReportarPago />);
    await pulsar(raiz, 'Tomar foto');
    expect(referencia.saveAsync).toHaveBeenCalledWith({ compress: 0.75, format: 'jpeg' });

    await pulsar(raiz, 'Enviar');
    await confirmarAlerta();
    expect(mockSubir.mock.calls[0][2]).toMatchObject({
      uri: 'file:///cache/reducida.jpg',
      type: 'image/jpeg',
    });
  });

  it('confirmación con el resumen y envío con cabecera, período, monto en centavos y fecha', async () => {
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    expect(alerta).toHaveBeenCalledTimes(1);
    const mensaje = alerta.mock.calls[0][1] as string;
    expect(mensaje).toContain('Octubre de 2026');
    expect(mensaje).toContain('$ 1.500.000');
    expect(mensaje).toContain('PDF');
    expect(mockSubir).not.toHaveBeenCalled();

    await confirmarAlerta();
    expect(mockSubir).toHaveBeenCalledTimes(1);
    const [ruta, campo, archivo, extras, opciones] = mockSubir.mock.calls[0];
    expect(ruta).toBe('/pagos');
    expect(campo).toBe('comprobante');
    expect(archivo).toMatchObject({ uri: PDF.assets[0].uri, type: 'application/pdf' });
    expect(extras).toEqual({
      contratoId: 'c1',
      monto_centavos: '150000000',
      fecha_reportada: hoyBogota(),
      periodo: '2026-10-01',
    });
    expect(opciones.encabezados['Idempotency-Key']).toMatch(FORMATO_CLAVE_IDEMPOTENCIA);
  });

  it('éxito: mensaje, invalida pagos, estado de cuenta y panel del contrato, y "Listo" regresa', async () => {
    const { raiz, cliente } = await montar(<ReportarPago />);
    await esperar();
    const invalidar = jest.spyOn(cliente, 'invalidateQueries');
    const antesCuenta = llamadasA('/inquilino/contratos/c1/estado-cuenta');
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('Pago reportado. Tu arrendador lo revisará.');
    const claves = invalidar.mock.calls.map(([filtro]) => JSON.stringify(filtro?.queryKey));
    expect(claves).toContain(JSON.stringify(['inquilino', 'contrato', 'c1', 'pagos']));
    expect(claves).toContain(JSON.stringify(['inquilino', 'contrato', 'c1', 'estado-cuenta']));
    expect(claves).toContain(JSON.stringify(['inquilino', 'contrato', 'c1', 'panel']));
    // El estado de cuenta está montado: se vuelve a pedir de inmediato.
    expect(llamadasA('/inquilino/contratos/c1/estado-cuenta')).toBeGreaterThan(antesCuenta);
    await pulsar(raiz, 'Listo');
    expect(mockBack).toHaveBeenCalled();
  });

  it('doble toque en la confirmación: una sola llamada', async () => {
    mockSubir.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockSubir).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta: avisa, no reenvía solo y al reintentar usa LA MISMA clave', async () => {
    mockSubir.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValueOnce(pago('p1'));
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(0);
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain(
      'No sabemos si el pago se envió. Puedes volver a enviarlo: no se duplicará.',
    );

    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(1);
    expect(mockSubir).toHaveBeenCalledTimes(2);
    expect(mockSubir.mock.calls[1][4].encabezados['Idempotency-Key']).toBe(
      mockSubir.mock.calls[0][4].encabezados['Idempotency-Key'],
    );
  });

  it('cambiar el monto entre reintentos cambia la clave', async () => {
    mockSubir.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValueOnce(pago('p1'));
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(0);
    await escribirEn(raiz, 'Monto pagado', '1400000');
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(1);
    expect(mockSubir.mock.calls[1][4].encabezados['Idempotency-Key']).not.toBe(
      mockSubir.mock.calls[0][4].encabezados['Idempotency-Key'],
    );
  });

  it('422 IDEMPOTENCY_KEY_REUTILIZADA: pide revisar y la siguiente vez usa una clave nueva', async () => {
    mockSubir
      .mockRejectedValueOnce(
        new ErrorApi({ status: 422, codigo: 'IDEMPOTENCY_KEY_REUTILIZADA', mensaje: 'x' }),
      )
      .mockResolvedValueOnce(pago('p1'));
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(0);
    expect(todo(raiz)).toContain(
      'Los datos del pago cambiaron mientras se enviaba. Revísalos y vuelve a enviar.',
    );
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta(1);
    expect(mockSubir.mock.calls[1][4].encabezados['Idempotency-Key']).not.toBe(
      mockSubir.mock.calls[0][4].encabezados['Idempotency-Key'],
    );
  });

  it('409 SOLICITUD_EN_PROCESO: informa que se procesa y no reenvía solo', async () => {
    mockSubir.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'SOLICITUD_EN_PROCESO', mensaje: 'x' }),
    );
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta();
    expect(todo(raiz)).toContain(
      'Tu pago se está procesando. Espera unos segundos y revisa Mis pagos.',
    );
    expect(mockSubir).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      415,
      'ARCHIVO_CONTENIDO_INVALIDO',
      'Ese archivo no es válido. Usa una foto JPG o PNG, o un PDF.',
    ],
    [413, 'CARGA_DEMASIADO_GRANDE', 'El archivo es demasiado grande (máximo 10 MB).'],
    [409, 'PERIODO_YA_PAGADO', 'Ese período ya está pagado.'],
    [409, 'CONTRATO_NO_ACTIVO', 'El contrato no está activo.'],
    [400, 'PERIODO_INVALIDO', 'El período elegido no es válido.'],
    [
      400,
      'FECHA_REPORTADA_ANTERIOR_A_INICIO',
      'La fecha del pago no puede ser anterior al inicio del contrato.',
    ],
    [404, 'NO_ENCONTRADO', 'No encontrado. Puede que ya no exista o que no tengas acceso.'],
  ])('%s %s: mensaje en español, sin texto técnico', async (status, codigo, mensaje) => {
    mockSubir.mockRejectedValueOnce(new ErrorApi({ status, codigo, mensaje: 'técnico' }));
    const { raiz } = await montar(<ReportarPago />);
    await elegirElPdf(raiz);
    await pulsar(raiz, 'Enviar');
    await confirmarAlerta();
    expect(todo(raiz)).toContain(mensaje);
    expect(todo(raiz)).not.toContain('técnico');
    expect(hayBoton(raiz, 'Enviar')).toBe(true);
  });

  it('contrato PROGRAMADO: no hay períodos reportables', async () => {
    datos.estadoContrato = 'PROGRAMADO';
    const { raiz } = await montar(<ReportarPago />);
    expect(todo(raiz)).toContain('Este contrato no tiene períodos para reportar.');
    expect(hayBoton(raiz, 'Enviar')).toBe(false);
  });

  it('contrato que no es del inquilino (404 del estado de cuenta): "No encontramos este contrato"', async () => {
    datos.cuenta = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    const { raiz } = await montar(<ReportarPago />);
    expect(todo(raiz)).toContain('No encontramos este contrato');
  });
});

describe('"Ver comprobante" en Mis pagos del inquilino', () => {
  const imagenes = (raiz: Raiz) =>
    raiz.root.findAll(
      (n) => n.props.accessibilityLabel === 'Comprobante del pago' && n.props.source,
    );

  it('solo los pagos con comprobante_url ofrecen "Ver comprobante"', async () => {
    datos.pagos = [
      pago('p1', { comprobante_url: 'https://b.test/s/a.png?token=A', comprobante_tipo: 'IMAGEN' }),
      pago('p2', { comprobante_url: null, comprobante_tipo: 'IMAGEN' }),
    ];
    const { raiz } = await montar(<PagosInquilino />);
    expect(cuantos(raiz, 'Ver comprobante')).toBe(1);
  });

  it('IMAGEN: vuelve a pedir la lista y muestra la vista previa con la URL NUEVA (en memoria)', async () => {
    datos.pagos = [
      pago('p1', {
        comprobante_url: 'https://b.test/s/a.png?token=VIEJA',
        comprobante_tipo: 'IMAGEN',
      }),
    ];
    const { raiz } = await montar(<PagosInquilino />);
    expect(imagenes(raiz)).toHaveLength(0);
    const antes = llamadasA('/pagos/mios?contratoId=c1');
    datos.pagos = [
      pago('p1', {
        comprobante_url: 'https://b.test/s/a.png?token=NUEVA',
        comprobante_tipo: 'IMAGEN',
      }),
    ];
    await pulsar(raiz, 'Ver comprobante');
    expect(llamadasA('/pagos/mios?contratoId=c1')).toBeGreaterThan(antes);
    const i = imagenes(raiz)[0];
    expect(i.props.source.uri).toContain('NUEVA');
    expect(i.props.cachePolicy).toBe('memory');
  });

  it('PDF: pide la lista otra vez, descarga con la URL fresca y comparte', async () => {
    datos.pagos = [
      pago('p1', {
        comprobante_url: 'https://b.test/s/a.pdf?token=VIEJA',
        comprobante_tipo: 'PDF',
      }),
    ];
    const { raiz } = await montar(<PagosInquilino />);
    const antes = llamadasA('/pagos/mios?contratoId=c1');
    datos.pagos = [
      pago('p1', {
        comprobante_url: 'https://b.test/s/a.pdf?token=NUEVA',
        comprobante_tipo: 'PDF',
      }),
    ];
    await pulsar(raiz, 'Ver comprobante');
    expect(llamadasA('/pagos/mios?contratoId=c1')).toBeGreaterThan(antes);
    expect(mockDescargar.mock.calls[0][0]).toContain('NUEVA');
    expect(mockCompartir).toHaveBeenCalledWith(
      'file:///cache/c',
      expect.objectContaining({ dialogTitle: 'Compartir comprobante' }),
    );
  });

  it('si el pago ya no trae URL al refrescar: "Comprobante no disponible", sin romper', async () => {
    datos.pagos = [
      pago('p1', { comprobante_url: 'https://b.test/s/a.png?token=A', comprobante_tipo: 'IMAGEN' }),
    ];
    const { raiz } = await montar(<PagosInquilino />);
    datos.pagos = [pago('p1', { comprobante_url: null, comprobante_tipo: 'IMAGEN' })];
    await pulsar(raiz, 'Ver comprobante');
    expect(todo(raiz)).toContain('Comprobante no disponible');
  });
});
