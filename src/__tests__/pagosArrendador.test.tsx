// Pagos del arrendador (E7-B): cola de validación por estado, detalle con "esperado vs. reportado",
// comprobante (imagen / PDF / sin URL con URL fresca), aprobar y rechazar con motivo, recuperación tras
// "sin respuesta", 409 y pagos ya procesados en solo lectura.
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import PagosArrendador from '../../app/(arrendador)/(pestanas)/pagos-arrendador';
import DetallePago from '../../app/(arrendador)/pago/[id]';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { PagoRespuesta } from '../api/pagos';
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

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
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
    patch: (...a: unknown[]) => mockPatch(...a),
    post: jest.fn(),
  },
}));

const sesion: DatosSesion = {
  token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
};

// ---- Datos ----

const CONTRATO: PagoRespuesta['contrato'] = {
  id: 'c1',
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  canon_centavos: 100_000_000,
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
    canon_base_centavos: 100_000_000,
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
  monto_centavos: 60_000_000,
  fecha_reportada: '2026-10-06T00:00:00.000Z',
  periodo: '2026-10-01T00:00:00.000Z',
  estado: 'PENDIENTE',
  motivo_rechazo: null,
  mensaje_rechazo: null,
  creado_en: '2026-10-06T15:00:00.000Z',
  actualizado_en: '2026-10-06T15:00:00.000Z',
  comprobante_url: 'https://b.test/s/comp.png?token=SECRETO1',
  comprobante_tipo: 'IMAGEN',
  periodo_cuenta: {
    canon_vigente_centavos: 100_000_000,
    fecha_limite: '2026-10-05T00:00:00.000Z',
    monto_aprobado_centavos: 40_000_000,
    estado: 'EN_REVISION',
  },
  contrato: CONTRATO,
  ...extra,
});

const otroInquilino = (nombre: string): PagoRespuesta['contrato'] => ({
  ...CONTRATO,
  inquilino: { ...CONTRATO.inquilino, id: `i-${nombre}`, nombre },
});

const datos: { lista: Record<string, unknown>; pago: unknown } = { lista: {}, pago: pago('p1') };

function responder(url: string): Promise<unknown> {
  const m = /^\/pagos\?estado=(\w+)$/.exec(url);
  let valor: unknown;
  if (m) valor = datos.lista[m[1]] ?? [];
  else if (url === '/pagos/p1') valor = datos.pago;
  else valor = new Error(`Ruta inesperada: ${url}`);
  return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
}
const llamadasA = (ruta: string) => mockGet.mock.calls.filter(([u]) => u === ruta).length;

// ---- Ayudas ----

const montar = (pantalla: React.ReactElement) => renderizarPantalla(pantalla, sesion);
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
/** El botón vive en la barra fija, no en el contenido que se desplaza (R4-C). */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};
const sinBarraFija = (raiz: Raiz) =>
  raiz.root.findAll((n) => n.props.testID === 'accion-fija').length === 0;
const porEtiqueta = (raiz: Raiz, etiqueta: string) => {
  const nodo = raiz.root.findAll(
    (n) => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function',
  )[0];
  if (!nodo) throw new Error(`No hay un control "${etiqueta}"`);
  return nodo;
};
const elegir = async (raiz: Raiz, etiqueta: string) => {
  await act(async () => {
    porEtiqueta(raiz, etiqueta).props.onPress();
  });
};
let alerta: jest.SpyInstance;
const confirmarAlerta = async (n = 0) => {
  await act(async () => {
    alerta.mock.calls[n][2][1].onPress();
  });
  await esperar();
};

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPatch,
    mockPush,
    mockBack,
    mockReplace,
    mockDescargar,
    mockCompartir,
    mockBorrar,
  ])
    m.mockReset();
  mockGet.mockImplementation(responder);
  mockPatch.mockResolvedValue({});
  mockDescargar.mockResolvedValue({ status: 200, uri: 'file:///cache/c' });
  mockCompartir.mockResolvedValue(undefined);
  mockBorrar.mockResolvedValue(undefined);
  mockParams = { id: 'p1' };
  datos.lista = {
    PENDIENTE: [
      pago('p1', { contrato: otroInquilino('Camilo Pardo') }),
      pago('p2', { contrato: otroInquilino('Laura Gómez'), monto_centavos: 100_000_000 }),
    ],
    APROBADO: [pago('p3', { estado: 'APROBADO', contrato: otroInquilino('Marcos Rey') })],
    RECHAZADO: [pago('p4', { estado: 'RECHAZADO', contrato: otroInquilino('Sofía Lara') })],
  };
  datos.pago = pago('p1');
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------------------------

describe('pestaña Pagos del arrendador: cola de validación', () => {
  it('por defecto "En revisión" (PENDIENTE); cada segmento con su conteo; solo En revisión, Aprobados y Rechazados', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    expect(mockGet).toHaveBeenCalledWith('/pagos?estado=PENDIENTE');
    expect(porEtiqueta(raiz, 'En revisión, 2')).toBeDefined();
    expect(porEtiqueta(raiz, 'Aprobados, 1')).toBeDefined();
    expect(porEtiqueta(raiz, 'Rechazados, 1')).toBeDefined();
    expect(todo(raiz)).not.toContain('Reemplazados');
  });

  it('R4-C: la cabecera dice cuántos hay por validar', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    expect(textosDe(raiz)).toContain('2 por validar');
  });

  it('R4-C: filas compactas: iniciales, "unidad · mes", inquilino, monto, fecha y chip; "esperado" solo si difiere', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    const t = textosDe(raiz);
    expect(t).toEqual(expect.arrayContaining(['CP', 'LG', 'Camilo Pardo', 'Laura Gómez']));
    expect(t.filter((x) => x === 'Apto 302 · Octubre de 2026')).toHaveLength(2);
    expect(t).toEqual(expect.arrayContaining(['$ 600.000', '$ 1.000.000']));
    expect(t.filter((x) => x === 'Reportado el 06/10/2026')).toHaveLength(2);
    expect(t).toContain('En revisión');
    // p1 reporta justo el saldo (600.000): sin "esperado". p2 reporta 1.000.000: lo dice.
    expect(t.filter((x) => x.startsWith('esperado '))).toEqual(['esperado $ 600.000']);
  });

  it('R4-C (a8): al cambiar de segmento se conserva lo cargado (sin volver a cargar ni esqueleto)', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    const antes = mockGet.mock.calls.length;
    await elegir(raiz, 'Aprobados, 1');
    expect(todo(raiz)).toContain('Marcos Rey');
    await elegir(raiz, 'En revisión, 2');
    expect(todo(raiz)).toContain('Camilo Pardo');
    expect(raiz.root.findAll((n) => n.props.accessibilityLabel === 'Cargando')).toHaveLength(0);
    expect(mockGet.mock.calls.length).toBe(antes);
  });

  it('el orden es el del servidor', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    const t = textosDe(raiz);
    expect(t.indexOf('Camilo Pardo')).toBeLessThan(t.indexOf('Laura Gómez'));
  });

  it('tocar una fila abre el detalle', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    await pulsar(raiz, 'Laura Gómez');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/pago/[id]', params: { id: 'p2' } });
  });

  it('Aprobados y Rechazados piden su estado y no muestran el saldo esperado', async () => {
    const { raiz } = await montar(<PagosArrendador />);
    await elegir(raiz, 'Aprobados, 1');
    await esperar();
    expect(mockGet).toHaveBeenCalledWith('/pagos?estado=APROBADO');
    expect(todo(raiz)).toContain('Marcos Rey');
    expect(todo(raiz)).not.toMatch(/esperado/i);
    await elegir(raiz, 'Rechazados, 1');
    await esperar();
    expect(mockGet).toHaveBeenCalledWith('/pagos?estado=RECHAZADO');
    expect(todo(raiz)).toContain('Sofía Lara');
    expect(todo(raiz)).toContain('Rechazado');
    // el contador de pendientes sigue visible en el segmento
    expect(porEtiqueta(raiz, 'En revisión, 2')).toBeDefined();
  });

  it.each([
    ['PENDIENTE', 'En revisión, 0', 'No hay comprobantes por validar'],
    ['APROBADO', 'Aprobados, 0', 'Aún no hay pagos aprobados'],
    ['RECHAZADO', 'Rechazados, 0', 'No hay pagos rechazados'],
  ])('%s sin pagos: estado vacío que explica qué pasa', async (estado, segmento, texto) => {
    datos.lista = {};
    const { raiz } = await montar(<PagosArrendador />);
    if (estado !== 'PENDIENTE') {
      await elegir(raiz, segmento);
      await esperar();
    }
    expect(todo(raiz)).toContain(texto);
  });

  it('error al cargar: aviso y "Reintentar"', async () => {
    datos.lista = { PENDIENTE: new ErrorSinConexion() };
    mockGet.mockImplementation((url: string) =>
      url === '/pagos?estado=PENDIENTE' && datos.lista.PENDIENTE instanceof Error
        ? Promise.reject(datos.lista.PENDIENTE)
        : responder(url),
    );
    const { raiz } = await montar(<PagosArrendador />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    datos.lista = { PENDIENTE: [pago('p1')] };
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Camilo Pardo');
  });

  it('mientras carga muestra un esqueleto', async () => {
    mockGet.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<PagosArrendador />);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'Cargando').length,
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------

describe('detalle del pago (R4-C): protagonista y barra fija', () => {
  it('protagonista: monto reportado frente al esperado del período, inquilino, unidad, mes y fecha', async () => {
    datos.pago = pago('p1', { monto_centavos: 40_000_000 });
    const { raiz } = await montar(<DetallePago />);
    const [protagonista] = raiz.root.findAll(
      (n) => typeof n.type === 'string' && n.props.testID === 'protagonista-pago',
    );
    const textos = protagonista
      .findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string')
      .map((n) => n.props.children);
    expect(textos).toEqual(
      expect.arrayContaining([
        '$ 400.000',
        'Esperado $ 600.000 · faltan $ 200.000',
        'Camilo Pardo',
        'Apto 302 · Calle 45 # 12-30',
        'Octubre de 2026 · reportado el 06/10/2026',
      ]),
    );
  });

  it('"Aprobar pago" y "Rechazar pago" en la barra fija; rechazar abre el formulario y "Confirmar rechazo" pasa a la barra', async () => {
    const { raiz } = await montar(<DetallePago />);
    expect(enBarraFija(raiz, 'Aprobar pago')).toBe(true);
    expect(enBarraFija(raiz, 'Rechazar pago')).toBe(true);
    await pulsar(raiz, 'Rechazar pago');
    expect(enBarraFija(raiz, 'Confirmar rechazo')).toBe(true);
    expect(textosDe(raiz)).toContain('Motivo del rechazo');
    await pulsar(raiz, 'Cancelar');
    expect(enBarraFija(raiz, 'Aprobar pago')).toBe(true);
    expect(textosDe(raiz)).not.toContain('Motivo del rechazo');
  });

  it.each(['APROBADO', 'RECHAZADO', 'REEMPLAZADO'] as const)(
    '%s: sin barra de acciones',
    async (estado) => {
      datos.pago = pago('p1', { estado });
      const { raiz } = await montar(<DetallePago />);
      expect(sinBarraFija(raiz)).toBe(true);
    },
  );
});

describe('detalle del pago: esperado vs. reportado', () => {
  it('muestra inquilino, teléfono, unidad, período y el estado del período', async () => {
    const { raiz } = await montar(<DetallePago />);
    const t = todo(raiz);
    expect(mockGet).toHaveBeenCalledWith('/pagos/p1');
    expect(t).toContain('Camilo Pardo');
    expect(t).toContain('Teléfono 3001234567');
    expect(t).toContain('Apto 302 · Calle 45 # 12-30');
    expect(t).toContain('Octubre de 2026');
    expect(t).toContain('En revisión');
  });

  it('canon, aprobado, saldo, monto reportado y diferencia (en pesos, desde centavos)', async () => {
    const { raiz } = await montar(<DetallePago />);
    const t = todo(raiz);
    expect(t).toContain('Canon del período: $ 1.000.000');
    expect(t).toContain('Ya aprobado: $ 400.000');
    expect(t).toContain('Saldo esperado: $ 600.000');
    expect(t).toContain('Monto reportado: $ 600.000');
    expect(t).toContain('Diferencia: $ 0');
    expect(t).not.toContain('pago parcial');
    expect(t).not.toContain('no cubre otros períodos');
  });

  it('monto menor al saldo: diferencia negativa y aviso de pago parcial', async () => {
    datos.pago = pago('p1', { monto_centavos: 40_000_000 });
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toContain('Diferencia: -$ 200.000');
    expect(todo(raiz)).toContain('Al aprobar, el período quedará como pago parcial.');
  });

  it('monto mayor al saldo: diferencia positiva y aviso de que no cubre otros períodos', async () => {
    datos.pago = pago('p1', { monto_centavos: 90_000_000 });
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toContain('Diferencia: +$ 300.000');
    expect(todo(raiz)).toContain('Un monto mayor no cubre otros períodos.');
  });

  it('periodo_cuenta null: no hay comparación ni valores inventados', async () => {
    datos.pago = pago('p1', { periodo_cuenta: null });
    const { raiz } = await montar(<DetallePago />);
    const t = todo(raiz);
    expect(t).toContain('No hay datos del período');
    expect(t).not.toContain('Saldo esperado');
    expect(t).not.toContain('Canon del período');
    expect(t).not.toContain('Diferencia');
    // Aprobar sigue siendo posible: el servidor decide.
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(true);
  });

  it('404: "Pago no encontrado"', async () => {
    datos.pago = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toContain('Pago no encontrado');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('sin conexión: aviso y "Reintentar"', async () => {
    datos.pago = new ErrorSinConexion();
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    datos.pago = pago('p1');
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Camilo Pardo');
  });
});

describe('detalle del pago: comprobante (URL siempre fresca)', () => {
  const imagenes = (raiz: Raiz) =>
    raiz.root.findAll(
      (n) => n.props.accessibilityLabel === 'Comprobante del pago' && n.props.source,
    );

  it('IMAGEN: vista previa en pantalla, en memoria (sin caché en disco)', async () => {
    const { raiz } = await montar(<DetallePago />);
    const i = imagenes(raiz)[0];
    expect(i.props.source.uri).toContain('SECRETO1');
    expect(i.props.cachePolicy).toBe('memory');
    expect(i.props.source.cacheKey).toBeUndefined();
  });

  it('"Ampliar" vuelve a pedir el pago y abre la imagen con la URL NUEVA', async () => {
    const { raiz } = await montar(<DetallePago />);
    const antes = llamadasA('/pagos/p1');
    datos.pago = pago('p1', { comprobante_url: 'https://b.test/s/comp.png?token=SECRETO2' });
    await pulsar(raiz, 'Ampliar');
    expect(llamadasA('/pagos/p1')).toBeGreaterThan(antes);
    const urls = imagenes(raiz).map((n) => n.props.source.uri as string);
    expect(urls.some((u) => u.includes('SECRETO2'))).toBe(true);
    expect(hayBoton(raiz, 'Cerrar')).toBe(true);
    await pulsar(raiz, 'Cerrar');
    expect(hayBoton(raiz, 'Cerrar')).toBe(false);
  });

  it('PDF: "Abrir comprobante" pide el pago otra vez, descarga con la URL fresca y comparte', async () => {
    datos.pago = pago('p1', {
      comprobante_tipo: 'PDF',
      comprobante_url: 'https://b.test/s/comp.pdf?token=VIEJA',
    });
    const { raiz } = await montar(<DetallePago />);
    expect(imagenes(raiz)).toHaveLength(0);
    const antes = llamadasA('/pagos/p1');
    datos.pago = pago('p1', {
      comprobante_tipo: 'PDF',
      comprobante_url: 'https://b.test/s/comp.pdf?token=NUEVA',
    });
    await pulsar(raiz, 'Abrir comprobante');
    expect(llamadasA('/pagos/p1')).toBeGreaterThan(antes);
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    expect(mockDescargar.mock.calls[0][0]).toContain('NUEVA');
    expect(mockCompartir).toHaveBeenCalledWith(
      'file:///cache/c',
      expect.objectContaining({
        dialogTitle: 'Compartir comprobante',
        mimeType: 'application/pdf',
      }),
    );
  });

  it('tipo desconocido (null) pero con URL: se abre como archivo, sin suponer el tipo', async () => {
    datos.pago = pago('p1', { comprobante_tipo: null });
    const { raiz } = await montar(<DetallePago />);
    expect(imagenes(raiz)).toHaveLength(0);
    await pulsar(raiz, 'Abrir comprobante');
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    expect(mockCompartir).toHaveBeenCalledWith(
      'file:///cache/c',
      expect.objectContaining({ mimeType: '*/*' }),
    );
  });

  it('sin URL: "Comprobante no disponible" y la pantalla sigue funcionando', async () => {
    datos.pago = pago('p1', { comprobante_url: null, comprobante_tipo: 'IMAGEN' });
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toContain('Comprobante no disponible');
    expect(hayBoton(raiz, 'Abrir comprobante')).toBe(false);
    expect(hayBoton(raiz, 'Ampliar')).toBe(false);
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(true);
  });

  it('si la descarga falla: mensaje en español sin la URL', async () => {
    datos.pago = pago('p1', {
      comprobante_tipo: 'PDF',
      comprobante_url: 'https://b.test/s/c.pdf?token=SECRETO3',
    });
    mockDescargar.mockRejectedValue(new Error('https://b.test/s/c.pdf?token=SECRETO3 falló'));
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Abrir comprobante');
    expect(todo(raiz)).toContain('No pudimos abrir el comprobante. Inténtalo de nuevo.');
    expect(todo(raiz)).not.toContain('SECRETO3');
  });
});

describe('aprobar un pago', () => {
  const aprobado = () => pago('p1', { estado: 'APROBADO' });

  it('confirmación con el resumen y el efecto esperado (Pagado)', async () => {
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje] = alerta.mock.calls[0];
    expect(titulo).toBe('Aprobar pago');
    expect(mensaje).toContain('Camilo Pardo');
    expect(mensaje).toContain('Octubre de 2026');
    expect(mensaje).toContain('$ 600.000');
    expect(mensaje).toContain('El período quedará Pagado.');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('con un monto menor, la confirmación dice que el período quedará Parcial', async () => {
    datos.pago = pago('p1', { monto_centavos: 40_000_000 });
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    expect(alerta.mock.calls[0][1]).toContain('El período quedará Parcial.');
  });

  it('éxito: PATCH sin cuerpo, vuelve a pedir el pago y queda en solo lectura con el mensaje', async () => {
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    const antes = llamadasA('/pagos/p1');
    datos.pago = aprobado();
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/pagos/p1/aprobar');
    expect(llamadasA('/pagos/p1')).toBeGreaterThan(antes);
    expect(todo(raiz)).toContain('Pago aprobado.');
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(false);
    expect(hayBoton(raiz, 'Rechazar pago')).toBe(false);
    await pulsar(raiz, 'Volver a la lista');
    expect(mockBack).toHaveBeenCalled();
  });

  it('doble toque en la confirmación: una sola llamada', async () => {
    mockPatch.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('409 PAGO_YA_PROCESADO: "Este pago ya fue procesado." y refresca el detalle', async () => {
    mockPatch.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'PAGO_YA_PROCESADO', mensaje: 'x' }),
    );
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    const antes = llamadasA('/pagos/p1');
    datos.pago = pago('p1', { estado: 'RECHAZADO', motivo_rechazo: 'PAGO_NO_VISIBLE' });
    await confirmarAlerta();
    expect(todo(raiz)).toContain('Este pago ya fue procesado.');
    expect(llamadasA('/pagos/p1')).toBeGreaterThan(antes);
    // ya no se puede aprobar y se ve cómo quedó
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(false);
    expect(todo(raiz)).toContain('No se ve el pago');
  });

  it('sin respuesta, pero el servidor sí lo aplicó: se informa como hecho y no se reenvía', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    datos.pago = aprobado();
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('Pago aprobado.');
  });

  it('sin respuesta y sigue PENDIENTE: avisa que no se aplicó y deja reintentar', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(true);
  });

  it('sin respuesta y sin poder comprobar: ofrece "Verificar"', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<DetallePago />);
    await pulsar(raiz, 'Aprobar pago');
    datos.pago = new ErrorSinConexion();
    await confirmarAlerta();
    expect(hayBoton(raiz, 'Verificar')).toBe(true);
  });
});

describe('rechazar un pago (siempre con motivo)', () => {
  const abrirFormulario = async (raiz: Raiz) => pulsar(raiz, 'Rechazar pago');

  it('"Rechazar pago" muestra los motivos y el campo de mensaje con contador (tope 200)', async () => {
    const { raiz } = await montar(<DetallePago />);
    expect(campoDe(raiz, 'Mensaje')).toBeUndefined();
    await abrirFormulario(raiz);
    for (const etiqueta of [
      'El monto no coincide',
      'No se ve el pago',
      'El comprobante no se lee',
      'Otro',
    ]) {
      expect(porEtiqueta(raiz, etiqueta)).toBeDefined();
    }
    expect(campoDe(raiz, 'Mensaje')?.props.maxLength).toBe(200);
    expect(todo(raiz)).toContain('0 / 200');
    await escribirEn(raiz, 'Mensaje', 'Faltan 50.000');
    expect(todo(raiz)).toContain('13 / 200');
  });

  it('sin motivo: no se pide confirmación ni se envía', async () => {
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await pulsar(raiz, 'Confirmar rechazo');
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Elige el motivo del rechazo.');
  });

  it('"Otro" exige mensaje', async () => {
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'Otro');
    await pulsar(raiz, 'Confirmar rechazo');
    expect(alerta).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Escribe un mensaje que explique el rechazo.');
    await escribirEn(raiz, 'Mensaje', '   ');
    await pulsar(raiz, 'Confirmar rechazo');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('con un motivo de la lista y sin mensaje: confirma y envía solo el motivo (mensaje omitido)', async () => {
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'No se ve el pago');
    await pulsar(raiz, 'Confirmar rechazo');
    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje] = alerta.mock.calls[0];
    expect(titulo).toBe('Rechazar pago');
    expect(mensaje).toContain('Camilo Pardo');
    expect(mensaje).toContain('Octubre de 2026');
    expect(mensaje).toContain('$ 600.000');
    expect(mensaje).toContain('No se ve el pago');
    expect(mockPatch).not.toHaveBeenCalled();
    datos.pago = pago('p1', { estado: 'RECHAZADO', motivo_rechazo: 'PAGO_NO_VISIBLE' });
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledWith('/pagos/p1/rechazar', { motivo: 'PAGO_NO_VISIBLE' });
    expect(todo(raiz)).toContain('Pago rechazado.');
  });

  it('con mensaje: se recorta y se envía junto al motivo', async () => {
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'El monto no coincide');
    await escribirEn(raiz, 'Mensaje', '  Faltan 50.000  ');
    await pulsar(raiz, 'Confirmar rechazo');
    expect(alerta.mock.calls[0][1]).toContain('Faltan 50.000');
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledWith('/pagos/p1/rechazar', {
      motivo: 'MONTO_NO_COINCIDE',
      mensaje: 'Faltan 50.000',
    });
  });

  it('"Otro" con mensaje: se envía motivo OTRO y el mensaje', async () => {
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'Otro');
    await escribirEn(raiz, 'Mensaje', 'La foto está borrosa');
    await pulsar(raiz, 'Confirmar rechazo');
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledWith('/pagos/p1/rechazar', {
      motivo: 'OTRO',
      mensaje: 'La foto está borrosa',
    });
  });

  it('doble toque en la confirmación: una sola llamada', async () => {
    mockPatch.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'No se ve el pago');
    await pulsar(raiz, 'Confirmar rechazo');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta, el servidor lo aplicó: se informa como hecho', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'No se ve el pago');
    await pulsar(raiz, 'Confirmar rechazo');
    datos.pago = pago('p1', { estado: 'RECHAZADO', motivo_rechazo: 'PAGO_NO_VISIBLE' });
    await confirmarAlerta();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('Pago rechazado.');
  });

  it('409 PAGO_YA_PROCESADO: explica y refresca', async () => {
    mockPatch.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'PAGO_YA_PROCESADO', mensaje: 'x' }),
    );
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'No se ve el pago');
    await pulsar(raiz, 'Confirmar rechazo');
    datos.pago = pago('p1', { estado: 'APROBADO' });
    await confirmarAlerta();
    expect(todo(raiz)).toContain('Este pago ya fue procesado.');
    expect(hayBoton(raiz, 'Rechazar pago')).toBe(false);
  });

  it.each([
    ['MOTIVO_REQUERIDO', 'Elige el motivo del rechazo.'],
    ['MENSAJE_REQUERIDO', 'Escribe un mensaje que explique el rechazo.'],
  ])('400 %s del servidor: mensaje en español', async (codigo, texto) => {
    mockPatch.mockRejectedValueOnce(new ErrorApi({ status: 400, codigo, mensaje: 'técnico' }));
    const { raiz } = await montar(<DetallePago />);
    await abrirFormulario(raiz);
    await elegir(raiz, 'No se ve el pago');
    await pulsar(raiz, 'Confirmar rechazo');
    await confirmarAlerta();
    expect(todo(raiz)).toContain(texto);
    expect(todo(raiz)).not.toContain('técnico');
  });
});

describe('pago ya procesado: solo lectura', () => {
  it.each(['APROBADO', 'REEMPLAZADO'] as const)('%s: sin acciones', async (estado) => {
    datos.pago = pago('p1', { estado });
    const { raiz } = await montar(<DetallePago />);
    expect(hayBoton(raiz, 'Aprobar pago')).toBe(false);
    expect(hayBoton(raiz, 'Rechazar pago')).toBe(false);
    expect(todo(raiz)).toContain(estado === 'APROBADO' ? 'Aprobado' : 'Reemplazado');
    expect(todo(raiz)).not.toContain('Saldo esperado');
  });

  it('RECHAZADO con motivo y mensaje: los muestra', async () => {
    datos.pago = pago('p1', {
      estado: 'RECHAZADO',
      motivo_rechazo: 'COMPROBANTE_ILEGIBLE',
      mensaje_rechazo: 'No se lee el valor',
    });
    const { raiz } = await montar(<DetallePago />);
    expect(hayBoton(raiz, 'Rechazar pago')).toBe(false);
    expect(todo(raiz)).toContain('El comprobante no se lee');
    expect(todo(raiz)).toContain('No se lee el valor');
  });

  it('RECHAZADO con motivo OTRO: solo el mensaje', async () => {
    datos.pago = pago('p1', {
      estado: 'RECHAZADO',
      motivo_rechazo: 'OTRO',
      mensaje_rechazo: 'Foto borrosa',
    });
    const { raiz } = await montar(<DetallePago />);
    expect(todo(raiz)).toContain('Foto borrosa');
    expect(todo(raiz)).not.toContain('Otro');
  });

  it('RECHAZADO sin motivo (anterior a B0.6-A1): no inventa uno', async () => {
    datos.pago = pago('p1', { estado: 'RECHAZADO' });
    const { raiz } = await montar(<DetallePago />);
    const t = todo(raiz);
    expect(t).toContain('Rechazado');
    expect(t).not.toMatch(/El monto no coincide|No se ve el pago|no se lee|Motivo del rechazo/);
  });
});
