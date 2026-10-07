// Mantenimiento del arrendador (E8-B): lista por estado con contadores y filtros, detalle con foto o
// video y cambio de estado con confirmación (doble toque, 409, "sin respuesta"), y la fila en Más.
import { Alert, Linking, RefreshControl } from 'react-native';
import { act } from 'react-test-renderer';

import MasArrendador from '../../app/(arrendador)/(pestanas)/mas-arrendador';
import ListaMantenimiento from '../../app/(arrendador)/mantenimiento/index';
import DetalleMantenimiento from '../../app/(arrendador)/mantenimiento/[id]';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { SolicitudArrendador } from '../api/mantenimiento';
import { Icono } from '../componentes/iconos/Icono';
import { Texto } from '../componentes/Texto';
import { crearToken } from '../pruebas/crearToken';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { fijarReloj, restaurarReloj } from '../pruebas/reloj';
import type { DatosSesion } from '../sesion/tipos';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
let mockParams: Record<string, string> = {};
let mockFuente: string | null = null;
let mockEscuchas: ((p: { status: string }) => void)[] = [];

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
jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (fuente: string) => {
      mockFuente = fuente;
      return {
        addListener: (_evento: string, escucha: (p: { status: string }) => void) => {
          mockEscuchas.push(escucha);
          return { remove: () => undefined };
        },
      };
    },
    VideoView: (props: Record<string, unknown>) => <View testID="video" {...props} />,
  };
});
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    post: jest.fn(),
    subirArchivo: jest.fn(),
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDescargar(...a),
  deleteAsync: async () => undefined,
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...a: unknown[]) => mockCompartir(...a),
}));

const sesion: DatosSesion = {
  token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Gómez', correo: 'marta@ejemplo.com' },
};

// ---- Datos ----

const URL_UNO = 'https://b.test/s/adjunto.jpg?token=PRIMERO';
const URL_FRESCA = 'https://b.test/s/adjunto.jpg?token=FRESCO';

const solicitud = (id: string, extra: Partial<SolicitudArrendador> = {}): SolicitudArrendador => ({
  id,
  arrendador_id: 'a1',
  unidad_id: 'u1',
  inquilino_id: 'i1',
  descripcion: 'La llave del lavamanos gotea.',
  urgencia: 'MEDIO',
  estado: 'PENDIENTE',
  creado_en: '2026-10-01T15:00:00.000Z',
  actualizado_en: '2026-10-02T15:00:00.000Z',
  adjunto_url: null,
  adjunto_tipo: null,
  unidad: {
    id: 'u1',
    inmueble_id: 'm1',
    nombre: 'Apto 101',
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
    inmueble: {
      id: 'm1',
      direccion: 'Calle 45 # 12-30',
      ciudad: 'Bogotá',
      estrato: 4,
      matricula_inmobiliaria: 'M-1',
      creado_en: '2026-01-01T00:00:00.000Z',
    },
  },
  inquilino: { id: 'i1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
  ...extra,
});

const INMUEBLES = [
  {
    id: 'm1',
    direccion: 'Calle 45 # 12-30',
    ciudad: 'Bogotá',
    unidades: [
      { id: 'u1', nombre: 'Apto 101' },
      { id: 'u2', nombre: 'Apto 102' },
    ],
  },
  {
    id: 'm2',
    direccion: 'Carrera 7 # 80-10',
    ciudad: 'Bogotá',
    unidades: [{ id: 'u3', nombre: 'Local 5' }],
  },
];

/** Un 409 TRANSICION_INVALIDA como lo responde el servidor. */
const error409 = () =>
  new ErrorApi({ status: 409, codigo: 'TRANSICION_INVALIDA', mensaje: 'Transición no válida' });

const datos: {
  /** Respuesta por URL de la lista (sin clave: la lista a secas). */
  listas: Record<string, unknown>;
  detalle: unknown[];
  inmuebles: unknown;
} = { listas: {}, detalle: [], inmuebles: INMUEBLES };

const LISTA_BASE = '/solicitudes-mantenimiento';
function responder(url: string): Promise<unknown> {
  if (url === '/inmuebles') return Promise.resolve(datos.inmuebles);
  if (url.startsWith(`${LISTA_BASE}/`)) {
    const siguiente = datos.detalle.length > 1 ? datos.detalle.shift() : datos.detalle[0];
    return siguiente instanceof Error ? Promise.reject(siguiente) : Promise.resolve(siguiente);
  }
  if (url === LISTA_BASE || url.startsWith(`${LISTA_BASE}?`)) {
    const valor = url in datos.listas ? datos.listas[url] : [];
    return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
  }
  return Promise.reject(new Error(`Ruta inesperada: ${url}`));
}
const llamadasA = (inicio: string) =>
  mockGet.mock.calls.filter(([u]) => String(u).startsWith(inicio)).length;
const llamadasDetalle = () => llamadasA(`${LISTA_BASE}/`);
const llamadasLista = () =>
  mockGet.mock.calls.filter(([u]) => u === LISTA_BASE || String(u).startsWith(`${LISTA_BASE}?`))
    .length;

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
/** El botón principal vive en la barra fija, no en el contenido que se desplaza (R4-C). */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};
const pestana = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find(
    (n) => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === etiqueta,
  );
const tocarPestana = async (raiz: Raiz, etiqueta: string) => {
  await act(async () => pestana(raiz, etiqueta).props.onPress());
  await esperar();
};
const opcionUnidad = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find(
    (n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === etiqueta,
  );
let alerta: jest.SpyInstance;
const confirmarAlerta = async (n = 0) => {
  await act(async () => {
    alerta.mock.calls[n][2][1].onPress();
  });
  await esperar();
};

beforeEach(() => {
  fijarReloj();
  jest.restoreAllMocks();
  for (const m of [mockGet, mockPatch, mockPush, mockBack, mockReplace]) m.mockReset();
  mockDescargar.mockReset().mockResolvedValue({ status: 200, uri: 'file:///cache/c' });
  mockCompartir.mockReset().mockResolvedValue(undefined);
  mockGet.mockImplementation(responder);
  mockPatch.mockResolvedValue({});
  mockParams = { id: 's1' };
  mockFuente = null;
  mockEscuchas = [];
  datos.listas = {};
  datos.detalle = [solicitud('s1')];
  datos.inmuebles = INMUEBLES;
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(restaurarReloj);

// ---------------------------------------------------------------------------------------------

describe('Más del arrendador (R4-C): filas agrupadas con icono', () => {
  it('"Tu trabajo" (Mantenimiento) y "Tu cuenta" (Mi perfil); "Cerrar sesión" al final, en su grupo', async () => {
    const { raiz } = await montar(<MasArrendador />);
    const grupos = raiz.root
      .findAll((n) => typeof n.type === 'string' && /^grupo-/.test(String(n.props.testID ?? '')))
      .map((n) => n.props.testID);
    expect(grupos).toEqual(['grupo-trabajo', 'grupo-cuenta', 'grupo-sesion']);
    const t = textosDe(raiz);
    expect(t.indexOf('Cerrar sesión')).toBeGreaterThan(t.indexOf('Mi perfil'));
    expect(t.indexOf('Cerrar sesión')).toBeGreaterThan(t.indexOf('Mantenimiento'));
    expect(hayBoton(raiz, 'Cerrar sesión')).toBe(true);
    await act(async () => botonDe(raiz, 'Mi perfil').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/perfil');
  });
});

describe('fila "Mantenimiento" en Más', () => {
  it('aparece con su subtítulo y abre la lista de mantenimiento', async () => {
    const { raiz } = await montar(<MasArrendador />);
    expect(todo(raiz)).toContain('Mantenimiento');
    expect(todo(raiz)).toContain('Mi perfil');
    const fila = raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Mantenimiento').length > 0,
    );
    await act(async () => fila.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/mantenimiento');
  });
});

// ---------------------------------------------------------------------------------------------

describe('lista de mantenimiento del arrendador', () => {
  const variasSolicitudes = () => [
    solicitud('s1', {
      estado: 'PENDIENTE',
      urgencia: 'ALTO',
      adjunto_tipo: 'IMAGEN',
      adjunto_url: URL_UNO,
    }),
    solicitud('s2', {
      estado: 'EN_PROCESO',
      descripcion: 'Se dañó la cerradura.',
      adjunto_tipo: 'VIDEO',
      adjunto_url: 'https://b.test/v.mp4',
    }),
    solicitud('s3', { estado: 'RESUELTO', descripcion: 'Cambio de bombillo.', urgencia: 'BAJO' }),
    solicitud('s4', { estado: 'PENDIENTE', descripcion: 'Humedad en el techo.' }),
  ];

  it('pide UNA lista sin filtro de estado y abre en Pendiente con los tres contadores', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(llamadasLista()).toBe(1);
    expect(mockGet).toHaveBeenCalledWith(LISTA_BASE);
    expect(JSON.stringify(mockGet.mock.calls)).not.toContain('estado=');
    expect(
      pestana(raiz, 'Pendiente, ordenado por urgencia, 2').props.accessibilityState.selected,
    ).toBe(true);
    expect(pestana(raiz, 'En proceso, 1').props.accessibilityState.selected).toBe(false);
    expect(pestana(raiz, 'Resuelta, 1').props.accessibilityState.selected).toBe(false);
    const t = todo(raiz);
    expect(t).toContain('La llave del lavamanos gotea.');
    expect(t).toContain('Humedad en el techo.');
    expect(t).not.toContain('Se dañó la cerradura.');
  });

  it('cambiar de segmento no pide nada y no cambia los contadores', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'En proceso, 1');
    expect(todo(raiz)).toContain('Se dañó la cerradura.');
    expect(todo(raiz)).not.toContain('Humedad en el techo.');
    await tocarPestana(raiz, 'Resuelta, 1');
    expect(todo(raiz)).toContain('Cambio de bombillo.');
    expect(llamadasLista()).toBe(1);
    for (const etiqueta of [
      'Pendiente, ordenado por urgencia, 2',
      'En proceso, 1',
      'Resuelta, 1',
    ]) {
      expect(pestana(raiz, etiqueta)).toBeTruthy();
    }
  });

  it('R4-C: cada fila: miniatura de la foto, descripción en 2 líneas, "unidad · Urgencia X · hace N días", inquilino y chip', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    const t = todo(raiz);
    // Creadas el 1 de octubre; hoy es el 2 (reloj fijo).
    expect(t).toContain('Apto 101 · Urgencia alta · ayer');
    expect(t).toContain('Apto 101 · Urgencia media · ayer');
    expect(t).toContain('Camilo Pardo');
    expect(t).toContain('Pendiente');
    const descripcion = raiz.root
      .findAllByType(Texto)
      .find((n) => n.props.children === 'La llave del lavamanos gotea.');
    expect(descripcion?.props.numberOfLines).toBe(2);
    expect(
      raiz.root.findAll(
        (n) => typeof n.type === 'string' && n.props.testID === 'miniatura-solicitud',
      ),
    ).toHaveLength(1);
  });

  it('R4-C (a8): un video tiene su icono propio (no el de la cámara)', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'En proceso, 1');
    const video = raiz.root.find(
      (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Tiene video',
    );
    expect(video.findAllByType(Icono).map((i) => i.props.nombre)).toEqual(['video']);
  });

  it('R4-C (a8): "Pendiente" va por urgencia (alta → media → baja) y, a igual urgencia, la más antigua primero', async () => {
    const creada = (dia: string) => `2026-09-${dia}T15:00:00.000Z`;
    datos.listas[LISTA_BASE] = [
      solicitud('n-baja', {
        descripcion: 'Baja nueva.',
        urgencia: 'BAJO',
        creado_en: creada('20'),
      }),
      solicitud('n-alta', {
        descripcion: 'Alta nueva.',
        urgencia: 'ALTO',
        creado_en: creada('19'),
      }),
      solicitud('v-media', {
        descripcion: 'Media vieja.',
        urgencia: 'MEDIO',
        creado_en: creada('02'),
      }),
      solicitud('v-alta', {
        descripcion: 'Alta vieja.',
        urgencia: 'ALTO',
        creado_en: creada('01'),
      }),
    ];
    const { raiz } = await montar(<ListaMantenimiento />);
    const orden = textosDe(raiz).filter((x) => / (nueva|vieja)\.$/.test(x));
    expect(orden).toEqual(['Alta vieja.', 'Alta nueva.', 'Media vieja.', 'Baja nueva.']);
    // El segmento lo anuncia.
    expect(pestana(raiz, 'Pendiente, ordenado por urgencia, 4')).toBeTruthy();
  });

  it('R4-C (a8): al cambiar un filtro se conserva la lista mientras llega la nueva', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    mockGet.mockImplementation((url: string) =>
      url === `${LISTA_BASE}?urgencia=BAJO` ? new Promise(() => undefined) : responder(url),
    );
    await tocarPestana(raiz, 'Baja');
    expect(mockGet).toHaveBeenCalledWith(`${LISTA_BASE}?urgencia=BAJO`);
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
    expect(raiz.root.findAll((n) => n.props.accessibilityLabel === 'Cargando')).toHaveLength(0);
  });

  it('un inquilino sin datos del contrato no rompe la fila', async () => {
    datos.listas[LISTA_BASE] = [
      solicitud('s1', { inquilino: { id: 'i1', nombre: null, cedula: null, telefono: null } }),
    ];
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(todo(raiz)).toContain('Inquilino sin datos');
  });

  it('tocar una fila abre el detalle', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    const fila = raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Humedad en el techo.').length > 0,
    );
    await act(async () => fila.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/mantenimiento/[id]',
      params: { id: 's4' },
    });
  });

  it('filtro de urgencia: pide la lista con ?urgencia= (en el servidor) y los contadores se recalculan', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    datos.listas[`${LISTA_BASE}?urgencia=ALTO`] = [variasSolicitudes()[0]];
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'Alta');
    expect(mockGet).toHaveBeenCalledWith(`${LISTA_BASE}?urgencia=ALTO`);
    expect(pestana(raiz, 'Pendiente, ordenado por urgencia, 1')).toBeTruthy();
    expect(pestana(raiz, 'En proceso, 0')).toBeTruthy();
    expect(pestana(raiz, 'Resuelta, 0')).toBeTruthy();
    await tocarPestana(raiz, 'Todas');
    expect(pestana(raiz, 'Pendiente, ordenado por urgencia, 2')).toBeTruthy();
  });

  it('filtro de unidad: ofrece solo las unidades de los inmuebles del arrendador y pide ?unidadId=', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    datos.listas[`${LISTA_BASE}?unidadId=u3`] = [solicitud('s9', { descripcion: 'Vidrio roto.' })];
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(mockGet).toHaveBeenCalledWith('/inmuebles');
    await pulsar(raiz, 'Unidad: Todas las unidades');
    for (const etiqueta of [
      'Todas las unidades',
      'Apto 101 · Calle 45 # 12-30',
      'Apto 102 · Calle 45 # 12-30',
      'Local 5 · Carrera 7 # 80-10',
    ]) {
      expect(opcionUnidad(raiz, etiqueta)).toBeTruthy();
    }
    await act(async () => opcionUnidad(raiz, 'Local 5 · Carrera 7 # 80-10').props.onPress());
    await esperar();
    expect(mockGet).toHaveBeenCalledWith(`${LISTA_BASE}?unidadId=u3`);
    expect(todo(raiz)).toContain('Vidrio roto.');
    expect(todo(raiz)).toContain('Unidad: Local 5 · Carrera 7 # 80-10');
  });

  it('urgencia y unidad juntas van en la misma petición', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'Baja');
    await pulsar(raiz, 'Unidad: Todas las unidades');
    await act(async () => opcionUnidad(raiz, 'Apto 102 · Calle 45 # 12-30').props.onPress());
    await esperar();
    expect(mockGet).toHaveBeenCalledWith(`${LISTA_BASE}?urgencia=BAJO&unidadId=u2`);
  });

  it('vacío sin filtros: "Aún no hay solicitudes de mantenimiento"', async () => {
    datos.listas[LISTA_BASE] = [];
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(todo(raiz)).toContain('Aún no hay solicitudes de mantenimiento');
    expect(hayBoton(raiz, 'Quitar filtros')).toBe(false);
  });

  it('un segmento vacío (sin filtros) lo dice con su estado', async () => {
    datos.listas[LISTA_BASE] = [solicitud('s1')];
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'En proceso, 0');
    expect(todo(raiz)).toContain('No hay solicitudes en proceso');
    await tocarPestana(raiz, 'Resuelta, 0');
    expect(todo(raiz)).toContain('No hay solicitudes resueltas');
    expect(hayBoton(raiz, 'Quitar filtros')).toBe(false);
  });

  it('vacío CON filtros: "No hay solicitudes con estos filtros" y "Quitar filtros" los limpia', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    datos.listas[`${LISTA_BASE}?urgencia=BAJO`] = [];
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'Baja');
    expect(todo(raiz)).toContain('No hay solicitudes con estos filtros');
    expect(todo(raiz)).not.toContain('Aún no hay solicitudes de mantenimiento');
    await pulsar(raiz, 'Quitar filtros');
    expect(pestana(raiz, 'Todas').props.accessibilityState.selected).toBe(true);
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });

  it('con filtros y el segmento sin resultados también ofrece "Quitar filtros"', async () => {
    datos.listas[LISTA_BASE] = variasSolicitudes();
    datos.listas[`${LISTA_BASE}?urgencia=ALTO`] = [variasSolicitudes()[0]];
    const { raiz } = await montar(<ListaMantenimiento />);
    await tocarPestana(raiz, 'Alta');
    await tocarPestana(raiz, 'En proceso, 0');
    expect(todo(raiz)).toContain('No hay solicitudes con estos filtros');
    expect(hayBoton(raiz, 'Quitar filtros')).toBe(true);
  });

  it('error: mensaje en español y "Reintentar" vuelve a pedir la lista', async () => {
    datos.listas[LISTA_BASE] = new ErrorApi({ status: 500, codigo: 'ERROR_INTERNO', mensaje: 'x' });
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(todo(raiz)).toContain('Ocurrió un error en el servidor');
    expect(hayBoton(raiz, 'Reintentar')).toBe(true);
    const antes = llamadasLista();
    datos.listas[LISTA_BASE] = [solicitud('s1')];
    await pulsar(raiz, 'Reintentar');
    expect(llamadasLista()).toBe(antes + 1);
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });

  it('arrastrar para refrescar vuelve a pedir la lista', async () => {
    datos.listas[LISTA_BASE] = [solicitud('s1')];
    const { raiz } = await montar(<ListaMantenimiento />);
    const antes = llamadasLista();
    await act(async () => {
      await raiz.root.findByType(RefreshControl).props.onRefresh();
    });
    await esperar();
    expect(llamadasLista()).toBeGreaterThan(antes);
  });

  it('si los inmuebles no cargan, la lista sigue funcionando (solo falta el filtro de unidad)', async () => {
    datos.inmuebles = new Error('sin red');
    mockGet.mockImplementation((url: string) =>
      url === '/inmuebles' ? Promise.reject(new ErrorSinConexion()) : responder(url),
    );
    datos.listas[LISTA_BASE] = [solicitud('s1')];
    const { raiz } = await montar(<ListaMantenimiento />);
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
    expect(hayBoton(raiz, 'Unidad: Todas las unidades')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------

describe('detalle de la solicitud (arrendador)', () => {
  it('muestra descripción, urgencia, estado con su frase, fechas, unidad e inquilino con su teléfono (solo texto)', async () => {
    datos.detalle = [solicitud('s1', { urgencia: 'ALTO' })];
    const { raiz } = await montar(<DetalleMantenimiento />);
    const t = todo(raiz);
    expect(t).toContain('La llave del lavamanos gotea.');
    expect(t).toContain('alta');
    expect(t).toContain('Pendiente');
    expect(t).toContain('Está esperando que la atiendas');
    expect(t).toContain('Creada el 01/10/2026');
    expect(t).toContain('Última actualización: 02/10/2026');
    expect(t).toContain('Apto 101 · Calle 45 # 12-30');
    expect(t).toContain('Camilo Pardo');
    expect(t).toContain('Teléfono 3001234567');
    expect(t).not.toContain('Adjunto');
  });

  it('R4-C (a8): "Llamar" abre tel: con el teléfono del inquilino', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { raiz } = await montar(<DetalleMantenimiento />);
    await pulsar(raiz, 'Llamar');
    expect(abrir).toHaveBeenCalledWith('tel:3001234567');
  });

  it('R4-C: el protagonista va arriba y el cambio de estado en la barra fija', async () => {
    datos.detalle = [solicitud('s1', { estado: 'PENDIENTE' })];
    const { raiz } = await montar(<DetalleMantenimiento />);
    const [protagonista] = raiz.root.findAll(
      (n) => typeof n.type === 'string' && n.props.testID === 'protagonista-solicitud',
    );
    expect(protagonista.findAllByType(Texto).map((n) => n.props.children)).toEqual(
      expect.arrayContaining(['Está esperando que la atiendas', 'La llave del lavamanos gotea.']),
    );
    expect(enBarraFija(raiz, 'Marcar en proceso')).toBe(true);
    expect(enBarraFija(raiz, 'Marcar resuelta')).toBe(true);
  });

  it('R4-C: resuelta, sin barra de acciones', async () => {
    datos.detalle = [solicitud('s1', { estado: 'RESUELTO' })];
    const { raiz } = await montar(<DetalleMantenimiento />);
    expect(raiz.root.findAll((n) => n.props.testID === 'accion-fija')).toHaveLength(0);
  });

  it('un inquilino sin datos del contrato se dice sin inventar un teléfono', async () => {
    datos.detalle = [
      solicitud('s1', { inquilino: { id: 'i1', nombre: null, cedula: null, telefono: null } }),
    ];
    const { raiz } = await montar(<DetalleMantenimiento />);
    expect(todo(raiz)).toContain('Inquilino sin datos');
    expect(todo(raiz)).not.toContain('Teléfono');
    expect(hayBoton(raiz, 'Llamar')).toBe(false);
  });

  it('PENDIENTE ofrece dos botones; EN_PROCESO uno; RESUELTO ninguno, con su texto', async () => {
    datos.detalle = [solicitud('s1', { estado: 'PENDIENTE' })];
    const a = await montar(<DetalleMantenimiento />);
    expect(hayBoton(a.raiz, 'Marcar en proceso')).toBe(true);
    expect(hayBoton(a.raiz, 'Marcar resuelta')).toBe(true);

    datos.detalle = [solicitud('s1', { estado: 'EN_PROCESO' })];
    const b = await montar(<DetalleMantenimiento />);
    expect(hayBoton(b.raiz, 'Marcar en proceso')).toBe(false);
    expect(hayBoton(b.raiz, 'Marcar resuelta')).toBe(true);
    expect(todo(b.raiz)).toContain('La estás atendiendo');

    datos.detalle = [solicitud('s1', { estado: 'RESUELTO' })];
    const c = await montar(<DetalleMantenimiento />);
    expect(hayBoton(c.raiz, 'Marcar en proceso')).toBe(false);
    expect(hayBoton(c.raiz, 'Marcar resuelta')).toBe(false);
    expect(todo(c.raiz)).toContain('Esta solicitud ya está resuelta');
    expect(todo(c.raiz)).toContain('La marcaste como resuelta');
  });

  describe('cambio de estado', () => {
    it('"Marcar en proceso" pide confirmación y no envía hasta confirmar', async () => {
      datos.detalle = [solicitud('s1'), solicitud('s1', { estado: 'EN_PROCESO' })];
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar en proceso');
      expect(alerta).toHaveBeenCalledTimes(1);
      expect(alerta.mock.calls[0][0]).toBe('Marcar en proceso');
      expect(alerta.mock.calls[0][1]).toContain('En proceso');
      expect(mockPatch).not.toHaveBeenCalled();
      await confirmarAlerta();
      expect(mockPatch).toHaveBeenCalledWith('/solicitudes-mantenimiento/s1/estado', {
        estado: 'EN_PROCESO',
      });
      expect(todo(raiz)).toContain('Solicitud marcada en proceso.');
      expect(todo(raiz)).toContain('La estás atendiendo');
      expect(hayBoton(raiz, 'Marcar en proceso')).toBe(false);
      expect(hayBoton(raiz, 'Marcar resuelta')).toBe(true);
    });

    it('"Marcar resuelta" avisa que queda cerrada, sin prometer notificaciones, y deja el detalle en solo lectura', async () => {
      datos.detalle = [
        solicitud('s1', { estado: 'EN_PROCESO' }),
        solicitud('s1', { estado: 'RESUELTO' }),
      ];
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar resuelta');
      const mensaje = alerta.mock.calls[0][1] as string;
      expect(mensaje).toContain('cerrada');
      expect(mensaje).toContain('No se puede volver atrás');
      expect(mensaje.toLowerCase()).not.toMatch(/notific|alert/);
      await confirmarAlerta();
      expect(mockPatch).toHaveBeenCalledWith('/solicitudes-mantenimiento/s1/estado', {
        estado: 'RESUELTO',
      });
      expect(todo(raiz)).toContain('Solicitud marcada como resuelta.');
      expect(todo(raiz)).toContain('Esta solicitud ya está resuelta');
      expect(hayBoton(raiz, 'Marcar resuelta')).toBe(false);
    });

    it('cancelar la confirmación no envía nada', async () => {
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar resuelta');
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('un éxito vuelve a pedir el detalle y las listas del arrendador', async () => {
      datos.detalle = [solicitud('s1'), solicitud('s1', { estado: 'EN_PROCESO' })];
      const { raiz, cliente } = await montar(<DetalleMantenimiento />);
      const invalidar = jest.spyOn(cliente, 'invalidateQueries');
      await pulsar(raiz, 'Marcar en proceso');
      await confirmarAlerta();
      expect(invalidar).toHaveBeenCalledWith({ queryKey: ['arrendador', 'solicitudes'] });
    });

    it('doble toque: una sola llamada', async () => {
      mockPatch.mockReturnValue(new Promise(() => undefined));
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar en proceso');
      await act(async () => {
        alerta.mock.calls[0][2][1].onPress();
        alerta.mock.calls[0][2][1].onPress();
      });
      expect(mockPatch).toHaveBeenCalledTimes(1);
    });

    it('409 TRANSICION_INVALIDA: refresca la solicitud y muestra el estado REAL (no queda desactualizada)', async () => {
      mockPatch.mockRejectedValue(error409());
      datos.detalle = [solicitud('s1'), solicitud('s1', { estado: 'RESUELTO' })];
      const { raiz } = await montar(<DetalleMantenimiento />);
      const antes = llamadasDetalle();
      await pulsar(raiz, 'Marcar en proceso');
      await confirmarAlerta();
      expect(llamadasDetalle()).toBeGreaterThan(antes);
      expect(todo(raiz)).toContain(
        'La solicitud ya cambió de estado. Te mostramos el estado actual.',
      );
      expect(todo(raiz)).toContain('La marcaste como resuelta');
      expect(hayBoton(raiz, 'Marcar en proceso')).toBe(false);
      expect(hayBoton(raiz, 'Marcar resuelta')).toBe(false);
    });

    it('404 al cambiar el estado: habla de la solicitud, no del contrato', async () => {
      mockPatch.mockRejectedValue(
        new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' }),
      );
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar resuelta');
      await confirmarAlerta();
      expect(todo(raiz)).toContain('No encontramos esa solicitud');
      expect(todo(raiz)).not.toContain('Contrato no encontrado');
    });

    it('sin respuesta y SÍ se aplicó: lo comprueba leyendo la solicitud y da el éxito, sin reenviar', async () => {
      mockPatch.mockRejectedValue(new ErrorSinConexion());
      datos.detalle = [solicitud('s1'), solicitud('s1', { estado: 'EN_PROCESO' })];
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar en proceso');
      await confirmarAlerta();
      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(todo(raiz)).toContain('Solicitud marcada en proceso.');
      expect(todo(raiz)).not.toContain('No hay conexión');
    });

    it('sin respuesta y NO se aplicó: lo dice, deja reintentar y no reenvía solo', async () => {
      mockPatch.mockRejectedValue(new ErrorSinConexion());
      datos.detalle = [solicitud('s1')];
      const { raiz } = await montar(<DetalleMantenimiento />);
      await pulsar(raiz, 'Marcar en proceso');
      await confirmarAlerta();
      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(todo(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
      expect(todo(raiz)).not.toContain('Solicitud marcada');
      expect(hayBoton(raiz, 'Marcar en proceso')).toBe(true);
    });

    it('sin respuesta y sin poder comprobar: no afirma nada y ofrece "Verificar" (que no reenvía)', async () => {
      mockPatch.mockRejectedValue(new ErrorSinConexion());
      const { raiz } = await montar(<DetalleMantenimiento />);
      datos.detalle = [new ErrorSinConexion()];
      await pulsar(raiz, 'Marcar en proceso');
      await confirmarAlerta();
      expect(todo(raiz)).toContain('No sabemos si se aplicó');
      expect(todo(raiz)).not.toContain('Solicitud marcada');
      expect(hayBoton(raiz, 'Verificar')).toBe(true);

      datos.detalle = [solicitud('s1', { estado: 'EN_PROCESO' })];
      await pulsar(raiz, 'Verificar');
      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(todo(raiz)).toContain('Solicitud marcada en proceso.');
    });
  });

  describe('adjunto', () => {
    const conAdjunto = (tipo: 'IMAGEN' | 'VIDEO' | null, url: string | null) =>
      solicitud('s1', { adjunto_tipo: tipo, adjunto_url: url });

    it('imagen: vista previa y "Ampliar" vuelve a pedir la solicitud (URL fresca) antes de abrir', async () => {
      datos.detalle = [conAdjunto('IMAGEN', URL_UNO), conAdjunto('IMAGEN', URL_FRESCA)];
      const { raiz } = await montar(<DetalleMantenimiento />);
      expect(todo(raiz)).toContain('Adjunto');
      const antes = llamadasDetalle();
      await pulsar(raiz, 'Ampliar');
      expect(llamadasDetalle()).toBe(antes + 1);
      expect(hayBoton(raiz, 'Cerrar')).toBe(true);
      const fuentes = raiz.root
        .findAll((n) => n.props.accessibilityLabel === 'Foto de la solicitud' && n.props.source)
        .map((n) => (n.props.source as { uri: string }).uri);
      expect(fuentes).toContain(URL_FRESCA);
    });

    it('video: no se carga hasta pedirlo y "Reproducir video" usa la URL fresca', async () => {
      datos.detalle = [
        conAdjunto('VIDEO', 'https://b.test/v.mp4?token=PRIMERO'),
        conAdjunto('VIDEO', 'https://b.test/v.mp4?token=FRESCO'),
      ];
      const { raiz } = await montar(<DetalleMantenimiento />);
      expect(mockFuente).toBeNull();
      await pulsar(raiz, 'Reproducir video');
      expect(mockFuente).toBe('https://b.test/v.mp4?token=FRESCO');
      expect(raiz.root.findAll((n) => n.props.testID === 'video').length).toBeGreaterThan(0);
    });

    it('sin adjunto no hay bloque; con tipo pero sin URL, "Adjunto no disponible"', async () => {
      datos.detalle = [conAdjunto('VIDEO', null)];
      const { raiz } = await montar(<DetalleMantenimiento />);
      expect(todo(raiz)).toContain('Adjunto no disponible');
      expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
    });
  });

  it('404: "Solicitud no encontrada" con botón Volver', async () => {
    datos.detalle = [new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' })];
    const { raiz } = await montar(<DetalleMantenimiento />);
    expect(todo(raiz)).toContain('Solicitud no encontrada');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('error al cargar: mensaje y "Reintentar"', async () => {
    datos.detalle = [new ErrorSinConexion()];
    const { raiz } = await montar(<DetalleMantenimiento />);
    expect(todo(raiz)).toContain('No hay conexión a internet');
    datos.detalle = [solicitud('s1')];
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });
});
