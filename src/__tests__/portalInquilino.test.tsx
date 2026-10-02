// Portal del inquilino, lectura (E6-A): contrato seleccionado, selector, agregar con código, Mi panel
// (ACTIVO / PROGRAMADO / finalizado), Mi contrato, estado de cuenta, aislamiento (404) y sin conexión.
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { act } from 'react-test-renderer';

import MiPanel from '../../app/(inquilino)/(pestanas)/mi-panel';
import MasInquilino from '../../app/(inquilino)/(pestanas)/mas';
import PagosInquilino from '../../app/(inquilino)/(pestanas)/pagos';
import SolicitudesInquilino from '../../app/(inquilino)/(pestanas)/solicitudes';
import AgregarContrato from '../../app/(inquilino)/agregar-contrato';
import MiContrato from '../../app/(inquilino)/mi-contrato/[id]/index';
import EstadoCuentaInquilino from '../../app/(inquilino)/mi-contrato/[id]/estado-cuenta';
import MisContratos from '../../app/(inquilino)/mis-contratos';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { DocumentoContrato, EstadoCuenta } from '../api/contratos';
import type {
  ContratoInquilinoDetalle,
  ContratoInquilinoResumen,
  PanelContratoInquilino,
} from '../api/inquilino';
import {
  ContratoSeleccionadoProvider,
  useContratoSeleccionado,
} from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { guardarCodigoPendiente, limpiarCodigoPendiente } from '../sesion/codigoPendiente';
import type { DatosSesion } from '../sesion/tipos';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCopiar = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
const mockBorrar = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    dismissAll: mockDismissAll,
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

const sesion: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// ---- Datos de prueba ----

const resumen = (
  id: string,
  extra: Partial<ContratoInquilinoResumen> = {},
): ContratoInquilinoResumen => ({
  id,
  estado: 'ACTIVO',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  unidad: { id: `u-${id}`, nombre: id === 'c1' ? 'Apto 302' : 'Apto 401', tipo: 'APARTAMENTO' },
  inmueble: { direccion: id === 'c1' ? 'Calle 45 # 12-30' : 'Carrera 7 # 80-10', ciudad: 'Bogotá' },
  estado_pago: 'al_dia',
  ...extra,
});

const PANEL_ACTIVO: PanelContratoInquilino = {
  contrato_id: 'c1',
  estado: 'ACTIVO',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  dias_restantes: 45,
  canon_vigente_centavos: 150_000_000,
  estado_pago: 'al_dia',
  proximo_periodo: {
    periodo: '2026-11-01T00:00:00.000Z',
    fecha_limite: '2026-11-05T00:00:00.000Z',
    monto_centavos: 150_000_000,
    estado: 'PENDIENTE',
  },
  periodos_vencidos: { cantidad: 0, total_pendiente_centavos: 0 },
};
const PANEL_PROGRAMADO: PanelContratoInquilino = {
  contratoFinalizado: false,
  programado: true,
  estado: 'PROGRAMADO',
  fecha_inicio: '2027-02-01T00:00:00.000Z',
  fecha_fin: '2028-01-31T00:00:00.000Z',
};

const DOC: DocumentoContrato = {
  id: 'd1',
  tipo: 'CONTRATO_ORIGINAL',
  version: 1,
  generado_en: '2026-01-01T15:00:00.000Z',
  hash_sha256: 'abc',
  url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO1',
};

const DETALLE: ContratoInquilinoDetalle = {
  contratoId: 'c1',
  unidad: { id: 'u-c1' },
  estado: 'ACTIVO',
  programado: false,
  canon_centavos: 150_000_000,
  dia_pago: 5,
  forma_pago: 'Transferencia',
  deposito_centavos: 300_000_000,
  datos_recaudo: 'Bancolombia ahorros 123-456',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  pdf_contrato_url: 'https://obsoleto.test/viejo.pdf?token=VIEJO',
  documentos: [DOC],
  incrementos_ipc: [
    {
      id: 'i1',
      fecha_aplicacion: '2026-06-01T00:00:00.000Z',
      canon_anterior_centavos: 142_857_143,
      canon_nuevo_centavos: 150_000_000,
      porcentaje_ipc_aplicado: '5.00',
    },
  ],
  terminacion_anticipada: {
    estado: 'NINGUNA',
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
    confirmada_por: null,
    confirmada_en: null,
    puede_confirmar: false,
    puede_cancelar: false,
  },
  aviso_no_renovacion: {
    estado: 'NINGUNO',
    dado_por: null,
    dado_en: null,
    motivo: null,
    puede_dar: true,
    puede_cancelar: false,
  },
  fotos_entrega: [
    {
      id: 'f1',
      contrato_id: 'c1',
      unidad_id: 'u1',
      momento: 'ENTREGA',
      zona: 'Sala',
      creado_en: '2026-01-01T15:00:00.000Z',
      foto_url: 'https://b.test/f1.jpg?token=FOTO1',
    },
    {
      id: 'f2',
      contrato_id: 'c1',
      unidad_id: 'u1',
      momento: 'ENTREGA',
      zona: 'Cocina',
      creado_en: '2026-01-01T15:00:00.000Z',
      foto_url: null,
    },
  ],
  fotos_devolucion: [
    {
      id: 'f9',
      contrato_id: 'c1',
      unidad_id: 'u1',
      momento: 'DEVOLUCION',
      zona: 'Baño devuelto',
      creado_en: '2026-12-31T15:00:00.000Z',
      foto_url: 'https://b.test/f9.jpg?token=FOTO9',
    },
  ],
};

const CUENTA: EstadoCuenta = {
  estadoPago: 'en_mora',
  periodos: [
    {
      periodo: '2026-10-01T00:00:00.000Z',
      fechaLimite: '2026-10-05T00:00:00.000Z',
      canonVigenteCentavos: 150_000_000,
      estado: 'VENCIDO',
      montoAprobadoCentavos: 0,
    },
  ],
};

type Parte = 'detalle' | 'panel' | 'estado-cuenta' | 'documentos';
/** Lo que responde cada ruta; un Error se lanza (para simular 404 o falta de red). */
const respuestas: {
  lista: unknown;
  porContrato: Record<string, Partial<Record<Parte, unknown>>>;
} = { lista: [], porContrato: {} };

const error404 = () => new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });

function responderGet(url: string): Promise<unknown> {
  if (url === '/inquilino/contratos') {
    return respuestas.lista instanceof Error
      ? Promise.reject(respuestas.lista)
      : Promise.resolve(respuestas.lista);
  }
  const m = /^\/inquilino\/contratos\/([^/]+)(?:\/(panel|estado-cuenta|documentos))?$/.exec(url);
  if (!m) return Promise.reject(new Error(`Ruta inesperada: ${url}`));
  const valor = respuestas.porContrato[m[1]]?.[(m[2] as Parte | undefined) ?? 'detalle'];
  if (valor === undefined) return Promise.reject(error404());
  return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
}

const llamadasA = (ruta: string) => mockGet.mock.calls.filter(([url]) => url === ruta).length;

function montarContrato(id: string, partes: Partial<Record<Parte, unknown>>) {
  respuestas.porContrato[id] = partes;
}

// ---- Ayudas de render ----

function Envoltura({ children }: { children: ReactNode }) {
  return <ContratoSeleccionadoProvider>{children}</ContratoSeleccionadoProvider>;
}
const montar = (pantalla: ReactNode) =>
  renderizarPantalla(<Envoltura>{pantalla}</Envoltura>, sesion);

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
const cabecera = (raiz: Raiz) =>
  raiz.root.find(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.startsWith('Cambiar de contrato') &&
      typeof n.props.onPress === 'function',
  );

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPost,
    mockPush,
    mockBack,
    mockReplace,
    mockDismissAll,
    mockCopiar,
    mockDescargar,
    mockCompartir,
    mockBorrar,
  ])
    m.mockReset();
  mockGet.mockImplementation(responderGet);
  mockCopiar.mockResolvedValue(true);
  mockDescargar.mockResolvedValue({ status: 200, uri: 'file:///cache/c.pdf' });
  mockCompartir.mockResolvedValue(undefined);
  mockBorrar.mockResolvedValue(undefined);
  mockParams = {};
  respuestas.lista = [resumen('c1'), resumen('c2', { estado: 'PROGRAMADO', estado_pago: null })];
  respuestas.porContrato = {
    c1: { panel: PANEL_ACTIVO, detalle: DETALLE, documentos: [DOC], 'estado-cuenta': CUENTA },
    c2: { panel: PANEL_PROGRAMADO, detalle: { ...DETALLE, contratoId: 'c2' } },
  };
  limpiarCodigoPendiente();
});

// ---------------------------------------------------------------------------------------------

describe('pestañas Pagos y Solicitudes', () => {
  it('Pagos (E7-A) y Solicitudes (E8-A) ya son reales: ninguna es un "Próximamente"', async () => {
    const pagos = await montar(<PagosInquilino />);
    expect(todo(pagos.raiz)).not.toContain('Próximamente');
    expect(todo(pagos.raiz)).toContain('Pagos');
    const solicitudes = await montar(<SolicitudesInquilino />);
    expect(todo(solicitudes.raiz)).not.toContain('Próximamente');
    expect(todo(solicitudes.raiz)).toContain('Solicitudes');
  });
});

describe('Mi panel: contrato seleccionado y selector', () => {
  it('sin contratos: estado vacío con "Agregar contrato con código"', async () => {
    respuestas.lista = [];
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toContain('Aún no tienes contratos');
    await pulsar(raiz, 'Agregar contrato con código');
    expect(mockPush).toHaveBeenCalledWith('/agregar-contrato');
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('/panel'));
  });

  it('por defecto elige el primero de la lista: cabecera con unidad · dirección y su panel', async () => {
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toContain('Apto 302 · Calle 45 # 12-30');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/panel');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c2/panel');
  });

  it('tocar la cabecera abre "Mis contratos"', async () => {
    const { raiz } = await montar(<MiPanel />);
    await act(async () => cabecera(raiz).props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/mis-contratos');
  });

  it('no usa los alias obsoletos /inquilino/mi-*', async () => {
    await montar(<MiPanel />);
    for (const [url] of mockGet.mock.calls) expect(String(url)).not.toContain('/mi-');
  });

  it('error al cargar la lista: aviso y "Reintentar"', async () => {
    respuestas.lista = new ErrorSinConexion();
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    respuestas.lista = [resumen('c1')];
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Apto 302 · Calle 45 # 12-30');
  });
});

describe('Mis contratos', () => {
  it('lista unidad, dirección, ciudad, fechas y chips; al final "Agregar contrato con código"', async () => {
    const { raiz } = await montar(<MisContratos />);
    const t = todo(raiz);
    expect(t).toContain('Apto 302');
    expect(t).toContain('Calle 45 # 12-30');
    expect(t).toContain('Bogotá');
    expect(t).toContain('01/01/2026');
    expect(t).toContain('31/12/2026');
    expect(t).toContain('Activo');
    expect(t).toContain('Programado');
    // estado_pago solo del ACTIVO (el PROGRAMADO trae null)
    expect(textosDe(raiz).filter((x) => x === 'Al día')).toHaveLength(1);
    expect(hayBoton(raiz, 'Agregar contrato con código')).toBe(true);
    await pulsar(raiz, 'Agregar contrato con código');
    expect(mockPush).toHaveBeenCalledWith('/agregar-contrato');
  });

  it('sin contratos: estado vacío con el botón de agregar', async () => {
    respuestas.lista = [];
    const { raiz } = await montar(<MisContratos />);
    expect(todo(raiz)).toContain('Aún no tienes contratos');
    expect(hayBoton(raiz, 'Agregar contrato con código')).toBe(true);
  });

  it('con 2 contratos, elegir el segundo cambia el panel sin mezclar datos y vuelve atrás', async () => {
    const { raiz } = await montar(
      <>
        <MiPanel />
        <MisContratos />
      </>,
    );
    expect(todo(raiz)).toContain('Canon vigente');
    expect(todo(raiz)).toContain('$ 1.500.000');

    await pulsar(raiz, 'Apto 401');

    expect(mockBack).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c2/panel');
    const t = todo(raiz);
    expect(t).toContain('Tu contrato empieza el 1 de febrero de 2027');
    // Nada del contrato anterior en el panel del programado.
    expect(t).not.toContain('Canon vigente');
    expect(t).not.toContain('Bancolombia ahorros 123-456');
  });
});

describe('Mi panel ACTIVO', () => {
  it('estado de pago, canon vigente, días restantes y fecha de fin', async () => {
    const { raiz } = await montar(<MiPanel />);
    const t = todo(raiz);
    expect(t).toContain('Al día');
    expect(t).toContain('Canon vigente');
    expect(t).toContain('$ 1.500.000');
    expect(t).toContain('Faltan 45 días para que termine tu contrato');
    expect(t).toContain('31/12/2026');
  });

  it('próximo período: período, fecha límite, monto y estado', async () => {
    const { raiz } = await montar(<MiPanel />);
    const t = todo(raiz);
    expect(t).toContain('Próximo período');
    expect(t).toContain('Noviembre de 2026');
    expect(t).toContain('05/11/2026');
    expect(t).toContain('Por vencer');
  });

  it('proximo_periodo null: "Sin períodos pendientes"', async () => {
    montarContrato('c1', { panel: { ...PANEL_ACTIVO, proximo_periodo: null }, detalle: DETALLE });
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toContain('Sin períodos pendientes');
    expect(todo(raiz)).not.toContain('Próximo período');
  });

  it('períodos vencidos: cantidad y total pendiente; con 0 no se muestra la tarjeta', async () => {
    montarContrato('c1', {
      panel: {
        ...PANEL_ACTIVO,
        estado_pago: 'en_mora',
        periodos_vencidos: { cantidad: 2, total_pendiente_centavos: 300_000_000 },
      },
      detalle: DETALLE,
    });
    const con = await montar(<MiPanel />);
    expect(todo(con.raiz)).toContain('En mora');
    expect(todo(con.raiz)).toContain('Períodos vencidos');
    expect(todo(con.raiz)).toContain('2 períodos · Total pendiente $ 3.000.000');

    montarContrato('c1', { panel: PANEL_ACTIVO, detalle: DETALLE });
    const sin = await montar(<MiPanel />);
    expect(todo(sin.raiz)).not.toContain('Períodos vencidos');
  });

  it('datos de recaudo (texto libre) con "Copiar"', async () => {
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toContain('Datos de recaudo');
    expect(todo(raiz)).toContain('Bancolombia ahorros 123-456');
    await pulsar(raiz, 'Copiar');
    expect(mockCopiar).toHaveBeenCalledWith('Bancolombia ahorros 123-456');
  });

  it('datos_recaudo null: no se muestra la tarjeta', async () => {
    montarContrato('c1', { panel: PANEL_ACTIVO, detalle: { ...DETALLE, datos_recaudo: null } });
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).not.toContain('Datos de recaudo');
    expect(hayBoton(raiz, 'Copiar')).toBe(false);
  });

  it('no ofrece reportar pagos (llega en E7)', async () => {
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).not.toMatch(/reportar|Pagar/i);
  });

  it('accesos: Ver mi contrato, Estado de cuenta y Mis documentos', async () => {
    const { raiz } = await montar(<MiPanel />);
    await pulsar(raiz, 'Ver mi contrato');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Estado de cuenta');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Mis documentos');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]',
      params: { id: 'c1', seccion: 'documentos' },
    });
  });
});

describe('Mi panel PROGRAMADO y finalizado', () => {
  it('PROGRAMADO: "Tu contrato empieza el …", sin recaudo ni períodos y sin pedir el detalle', async () => {
    respuestas.lista = [resumen('c2', { estado: 'PROGRAMADO', estado_pago: null })];
    const { raiz } = await montar(<MiPanel />);
    const t = todo(raiz);
    expect(t).toContain('Tu contrato empieza el 1 de febrero de 2027');
    expect(t).not.toContain('Datos de recaudo');
    expect(t).not.toContain('Próximo período');
    expect(t).not.toContain('Períodos vencidos');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c2');
  });

  it.each([
    ['VENCIDO', 'Tu contrato finalizó.'],
    ['TERMINADO_ANTICIPADAMENTE', 'Tu contrato terminó de forma anticipada.'],
  ] as const)(
    '%s: mensaje y enlace a Mi contrato, sin acta ni liquidación',
    async (estado, msg) => {
      respuestas.lista = [resumen('c1', { estado, estado_pago: null })];
      montarContrato('c1', { panel: { contratoFinalizado: true, estado }, detalle: DETALLE });
      const { raiz } = await montar(<MiPanel />);
      expect(todo(raiz)).toContain(msg);
      expect(todo(raiz)).not.toMatch(/acta|liquidaci/i);
      expect(todo(raiz)).not.toContain('Datos de recaudo');
      await pulsar(raiz, 'Ver mi contrato');
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: '/mi-contrato/[id]',
        params: { id: 'c1' },
      });
    },
  );
});

describe('aislamiento y sin conexión', () => {
  it('404 del panel: "No encontramos este contrato", refresca la lista y ofrece elegir otro', async () => {
    delete respuestas.porContrato.c1.panel;
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toContain('No encontramos este contrato');
    expect(llamadasA('/inquilino/contratos')).toBeGreaterThanOrEqual(2);
    expect(todo(raiz)).not.toContain('Canon vigente');
    await pulsar(raiz, 'Ver mis contratos');
    expect(mockPush).toHaveBeenCalledWith('/mis-contratos');
  });

  it('tras el 404 el contrato que ya no está en la lista se reemplaza por el primero', async () => {
    delete respuestas.porContrato.c1.panel;
    montarContrato('c2', { panel: { ...PANEL_ACTIVO, contrato_id: 'c2' }, detalle: DETALLE });
    let pedidas = 0;
    mockGet.mockImplementation((url: string) => {
      if (url !== '/inquilino/contratos') return responderGet(url);
      pedidas += 1;
      return Promise.resolve(
        pedidas === 1 ? [resumen('c1'), resumen('c2')] : [resumen('c2', { estado: 'ACTIVO' })],
      );
    });
    const { raiz } = await montar(<MiPanel />);
    // panel 404 → lista nueva → contrato nuevo → su panel
    await esperar();
    await esperar();
    await esperar();
    expect(todo(raiz)).toContain('Apto 401 · Carrera 7 # 80-10');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c2/panel');
    expect(todo(raiz)).toContain('Canon vigente');
  });

  it('el panel sin conexión: aviso y "Reintentar" (lectura: se puede repetir)', async () => {
    montarContrato('c1', { panel: new ErrorSinConexion(), detalle: DETALLE });
    const { raiz } = await montar(<MiPanel />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    montarContrato('c1', { panel: PANEL_ACTIVO, detalle: DETALLE });
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Canon vigente');
  });
});

describe('Agregar contrato con código', () => {
  const VINCULADO = {
    id: 'c2',
    estado: 'ACTIVO',
    fecha_inicio: '2026-09-01T00:00:00.000Z',
    fecha_fin: '2027-08-31T00:00:00.000Z',
    vinculado_en: '2026-10-01T10:00:00.000Z',
    datos_recaudo: null,
    unidad: { id: 'u2', nombre: 'Apto 401', tipo: 'APARTAMENTO' },
    inmueble: { id: 'm2', direccion: 'Carrera 7 # 80-10', ciudad: 'Bogotá' },
  };
  const escribir = (raiz: Raiz, texto: string) =>
    act(async () => {
      raiz.root
        .findAll(
          (n) => n.props.accessibilityLabel === 'Código de acceso' && n.props.onChangeText,
        )[0]
        .props.onChangeText(texto);
    });

  it('un código mal formado no se envía y avisa', async () => {
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'abc');
    await pulsar(raiz, 'Agregar contrato');
    expect(mockPost).not.toHaveBeenCalled();
    expect(todo(raiz)).toMatch(/revisa el código/i);
  });

  it('envía el código normalizado (RC-XXXX-XXXX)', async () => {
    mockPost.mockResolvedValueOnce(VINCULADO);
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'rc ab3d 9kpx');
    await pulsar(raiz, 'Agregar contrato');
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/vincular', {
      codigo: 'RC-AB3D-9KPX',
    });
  });

  it('éxito: resumen, lista invalidada, contrato seleccionado y "Ver mi panel"', async () => {
    mockPost.mockResolvedValueOnce(VINCULADO);
    montarContrato('c2', { panel: { ...PANEL_ACTIVO, contrato_id: 'c2' }, detalle: DETALLE });
    const antes = llamadasA('/inquilino/contratos');
    const { raiz } = await montar(
      <>
        <MiPanel />
        <AgregarContrato />
      </>,
    );
    const llamadasIniciales = llamadasA('/inquilino/contratos');
    expect(llamadasIniciales).toBeGreaterThan(antes);
    await escribir(raiz, 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Agregar contrato');

    const t = todo(raiz);
    expect(t).toContain('Apto 401');
    expect(t).toContain('Carrera 7 # 80-10');
    expect(llamadasA('/inquilino/contratos')).toBeGreaterThan(llamadasIniciales);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c2/panel');

    await pulsar(raiz, 'Ver mi panel');
    expect(mockDismissAll).toHaveBeenCalled();
  });

  it('PROGRAMADO: avisa que verá los datos de pago cuando empiece', async () => {
    mockPost.mockResolvedValueOnce({ ...VINCULADO, estado: 'PROGRAMADO' });
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Agregar contrato');
    expect(todo(raiz)).toContain('Verás los datos de pago cuando el contrato empiece.');
  });

  it('404: "Código de acceso no válido." (mensaje genérico)', async () => {
    mockPost.mockRejectedValueOnce(error404());
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Agregar contrato');
    expect(todo(raiz)).toContain('Código de acceso no válido.');
  });

  it('429 DEMASIADOS_INTENTOS: mensaje claro con el bloqueo', async () => {
    mockPost.mockRejectedValueOnce(
      new ErrorApi({ status: 429, codigo: 'DEMASIADOS_INTENTOS', mensaje: 'x' }),
    );
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Agregar contrato');
    expect(todo(raiz)).toContain('15 minutos');
  });

  it('el doble toque hace una sola llamada', async () => {
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'RC-AB3D-9KPX');
    const boton = botonDe(raiz, 'Agregar contrato');
    await act(async () => {
      boton.props.onPress();
      boton.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta: avisa y se puede reintentar directo (la ruta es idempotente)', async () => {
    mockPost.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValueOnce(VINCULADO);
    const { raiz } = await montar(<AgregarContrato />);
    await escribir(raiz, 'RC-AB3D-9KPX');
    await pulsar(raiz, 'Agregar contrato');
    expect(todo(raiz)).toMatch(/No hay conexión/);
    await pulsar(raiz, 'Agregar contrato');
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(todo(raiz)).toContain('Carrera 7 # 80-10');
  });
});

describe('vinculación pendiente tras "ya tengo cuenta"', () => {
  it('al terminar invalida la lista y selecciona el contrato vinculado', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    respuestas.lista = [resumen('c1')];
    mockPost.mockImplementationOnce(async () => {
      // La lista inicial ya se pidió con solo c1; el servidor agrega c2 al vincular.
      await new Promise<void>((r) => setTimeout(r, 5));
      respuestas.lista = [resumen('c1'), resumen('c2')];
      montarContrato('c2', { panel: { ...PANEL_ACTIVO, contrato_id: 'c2' }, detalle: DETALLE });
      return {
        id: 'c2',
        estado: 'ACTIVO',
        fecha_inicio: '2026-09-01T00:00:00.000Z',
        fecha_fin: '2027-08-31T00:00:00.000Z',
        vinculado_en: '2026-10-01T10:00:00.000Z',
        datos_recaudo: null,
        unidad: { id: 'u2', nombre: 'Apto 401', tipo: 'APARTAMENTO' },
        inmueble: { id: 'm2', direccion: 'Carrera 7 # 80-10', ciudad: 'Bogotá' },
      };
    });
    const { raiz } = await montar(<MiPanel />);
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c2/panel');
    expect(todo(raiz)).toContain('Apto 401 · Carrera 7 # 80-10');
  });
});

describe('Mi contrato', () => {
  beforeEach(() => {
    mockParams = { id: 'c1' };
  });

  it('condiciones: canon, día y forma de pago, depósito, fechas y estado', async () => {
    const { raiz } = await montar(<MiContrato />);
    const t = todo(raiz);
    expect(t).toContain('Activo');
    expect(t).toContain('$ 1.500.000');
    expect(t).toContain('Día de pago: 5');
    expect(t).toContain('Forma de pago: Transferencia');
    expect(t).toContain('Depósito: $ 3.000.000');
    expect(t).toContain('1 de enero de 2026');
    expect(t).toContain('31 de diciembre de 2026');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1');
  });

  it('sin depósito: no se muestra la línea; sin recaudo (null): no se muestra la tarjeta', async () => {
    montarContrato('c1', { detalle: { ...DETALLE, deposito_centavos: null, datos_recaudo: null } });
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).not.toContain('Depósito');
    expect(todo(raiz)).not.toContain('Datos de recaudo');
  });

  it('con datos de recaudo: tarjeta con "Copiar"', async () => {
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('Datos de recaudo');
    await pulsar(raiz, 'Copiar');
    expect(mockCopiar).toHaveBeenCalledWith('Bancolombia ahorros 123-456');
  });

  it('incrementos de IPC', async () => {
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('Incrementos de IPC');
    expect(todo(raiz)).toContain('$ 1.428.571,43 → $ 1.500.000');
    expect(todo(raiz)).toContain('IPC 5%');
  });

  it('fotos de entrega con su zona; sin URL: "Foto no disponible"; ignora las de devolución', async () => {
    const { raiz } = await montar(<MiContrato />);
    const t = todo(raiz);
    expect(t).toContain('Fotos de entrega');
    expect(t).toContain('Sala');
    expect(t).toContain('Cocina');
    expect(textosDe(raiz).filter((x) => x === 'Foto no disponible')).toHaveLength(1);
    expect(t).not.toContain('Baño devuelto');
  });

  it('documentos: pide la lista fresca antes de descargar y comparte; una URL nula es "Archivo no disponible"', async () => {
    montarContrato('c1', {
      detalle: {
        ...DETALLE,
        documentos: [
          DOC,
          { ...DOC, id: 'd2', tipo: 'OTROSI_INCREMENTO', version: 2, url_firmada: null },
        ],
      },
      documentos: [{ ...DOC, url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO2' }],
    });
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('Contrato original');
    expect(todo(raiz)).toContain('Archivo no disponible');

    await pulsar(raiz, 'Ver y compartir');

    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/documentos');
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    expect(mockDescargar.mock.calls[0][0]).toContain('SECRETO2');
    expect(mockCompartir).toHaveBeenCalled();
  });

  it('nunca usa pdf_contrato_url (obsoleto)', async () => {
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Ver y compartir');
    for (const [url] of mockDescargar.mock.calls) expect(String(url)).not.toContain('VIEJO');
    expect(todo(raiz)).not.toContain('obsoleto');
  });

  it('terminación y aviso se ven como información; con el contrato finalizado no hay botones', async () => {
    montarContrato('c1', {
      detalle: {
        ...DETALLE,
        estado: 'VENCIDO',
        terminacion_anticipada: {
          estado: 'SOLICITADA',
          solicitada_por: 'ARRENDADOR',
          solicitada_en: '2026-10-01T15:00:00.000Z',
          motivo: 'Mudanza',
          fecha_efectiva: '2026-11-30T00:00:00.000Z',
          confirmada_por: null,
          confirmada_en: null,
          puede_confirmar: true,
          puede_cancelar: false,
        },
        aviso_no_renovacion: {
          estado: 'DADO',
          dado_por: 'INQUILINO',
          dado_en: '2026-09-01T15:00:00.000Z',
          motivo: null,
          puede_dar: false,
          puede_cancelar: true,
        },
      },
    });
    const { raiz } = await montar(<MiContrato />);
    const t = todo(raiz);
    expect(t).toContain('Terminación anticipada solicitada por el arrendador');
    expect(t).toContain('Fecha efectiva: 30/11/2026');
    expect(t).toContain('Motivo: Mudanza');
    expect(t).toContain('Aviso de no renovación dado por el inquilino');
    for (const titulo of [
      'Confirmar terminación',
      'Cancelar solicitud',
      'Solicitar terminación anticipada',
      'Dar aviso de no renovación',
      'Cancelar aviso',
    ]) {
      expect(hayBoton(raiz, titulo)).toBe(false);
    }
  });

  it('seccion=documentos: los documentos van primero', async () => {
    mockParams = { id: 'c1', seccion: 'documentos' };
    const { raiz } = await montar(<MiContrato />);
    const t = textosDe(raiz);
    expect(t.indexOf('Documentos')).toBeGreaterThan(-1);
    expect(t.indexOf('Documentos')).toBeLessThan(t.indexOf('Fotos de entrega'));
  });

  it('404: "No encontramos este contrato", refresca la lista y "Volver"', async () => {
    mockParams = { id: 'zzz' };
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('No encontramos este contrato');
    expect(llamadasA('/inquilino/contratos')).toBeGreaterThanOrEqual(1);
    expect(todo(raiz)).not.toContain('Bancolombia');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('sin conexión: aviso y "Reintentar"', async () => {
    montarContrato('c1', { detalle: new ErrorSinConexion() });
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    montarContrato('c1', { detalle: DETALLE });
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Día de pago: 5');
  });

  it('cada contrato pide solo lo suyo: c2 no muestra el recaudo de c1', async () => {
    mockParams = { id: 'c2' };
    montarContrato('c2', {
      detalle: { ...DETALLE, contratoId: 'c2', datos_recaudo: null, forma_pago: 'Efectivo' },
    });
    const { raiz } = await montar(<MiContrato />);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c2');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c1');
    expect(todo(raiz)).toContain('Forma de pago: Efectivo');
    expect(todo(raiz)).not.toContain('Bancolombia');
  });
});

describe('Estado de cuenta del inquilino', () => {
  beforeEach(() => {
    mockParams = { id: 'c1' };
  });

  it('reutiliza la vista del arrendador: estado de pago y períodos', async () => {
    const { raiz } = await montar(<EstadoCuentaInquilino />);
    const t = todo(raiz);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/estado-cuenta');
    expect(t).toContain('Estado de cuenta');
    expect(t).toContain('En mora');
    expect(t).toContain('Octubre de 2026');
    expect(t).toContain('Vencido');
  });

  it('404: "No encontramos este contrato" y refresca la lista', async () => {
    mockParams = { id: 'zzz' };
    const { raiz } = await montar(<EstadoCuentaInquilino />);
    expect(todo(raiz)).toContain('No encontramos este contrato');
    expect(llamadasA('/inquilino/contratos')).toBeGreaterThanOrEqual(1);
  });

  it('sin conexión: aviso y "Reintentar"', async () => {
    montarContrato('c1', { 'estado-cuenta': new ErrorSinConexion() });
    const { raiz } = await montar(<EstadoCuentaInquilino />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    montarContrato('c1', { 'estado-cuenta': CUENTA });
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('Octubre de 2026');
  });
});

describe('Más y cierre de sesión', () => {
  function Sonda({ alLeer }: { alLeer: (v: ReturnType<typeof useContratoSeleccionado>) => void }) {
    alLeer(useContratoSeleccionado());
    return <Text>sonda</Text>;
  }

  it('ofrece "Mi perfil" y "Cerrar sesión"', async () => {
    const { raiz } = await montar(<MasInquilino />);
    expect(hayBoton(raiz, 'Cerrar sesión')).toBe(true);
    expect(hayBoton(raiz, 'Mi perfil')).toBe(true);
  });

  it('cerrar sesión limpia el contrato seleccionado', async () => {
    let valor!: ReturnType<typeof useContratoSeleccionado>;
    const { raiz } = await montar(
      <>
        <Sonda alLeer={(v) => (valor = v)} />
        <MasInquilino />
      </>,
    );
    await act(async () => valor.seleccionar('c2'));
    expect(valor.contratoId).toBe('c2');

    await pulsar(raiz, 'Cerrar sesión');

    expect(valor.contratoId).toBe('c1');
  });
});

describe('contrato seleccionado: Provider', () => {
  function Sonda({ alLeer }: { alLeer: (v: ReturnType<typeof useContratoSeleccionado>) => void }) {
    alLeer(useContratoSeleccionado());
    return <Text>sonda</Text>;
  }

  it('por defecto el primero; seleccionar cambia; un id que sale de la lista vuelve al primero', async () => {
    let valor!: ReturnType<typeof useContratoSeleccionado>;
    const { cliente } = await montar(<Sonda alLeer={(v) => (valor = v)} />);
    expect(valor.contratoId).toBe('c1');
    await act(async () => valor.seleccionar('c2'));
    expect(valor.contratoId).toBe('c2');

    respuestas.lista = [resumen('c1')];
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ['inquilino', 'contratos'] });
    });
    await esperar();
    expect(valor.contratoId).toBe('c1');
  });

  it('sin contratos: contratoId es null', async () => {
    respuestas.lista = [];
    let valor!: ReturnType<typeof useContratoSeleccionado>;
    await montar(<Sonda alLeer={(v) => (valor = v)} />);
    expect(valor.contratoId).toBeNull();
  });
});
