// Mantenimiento del inquilino (E8-A): pestaña Solicitudes (lista por segmentos), detalle con foto o
// video y formulario de nueva solicitud (adjunto, progreso, cancelación e idempotencia).
import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';
import { act } from 'react-test-renderer';

import NuevaSolicitud from '../../app/(inquilino)/nueva-solicitud';
import SolicitudesInquilino from '../../app/(inquilino)/(pestanas)/solicitudes';
import DetalleSolicitudInquilino from '../../app/(inquilino)/solicitud/[id]';
import { ErrorApi, ErrorCancelado, ErrorSinConexion } from '../api/cliente';
import type { SolicitudInquilino } from '../api/mantenimiento';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';
import { fijarReloj, restaurarReloj } from '../pruebas/reloj';
import type { DatosSesion } from '../sesion/tipos';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockSubir = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockElegirFoto = jest.fn();
const mockElegirVideo = jest.fn();
const mockPrepararFoto = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
const mockBorrar = jest.fn();
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
    post: jest.fn(),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegirFoto(...a),
}));
jest.mock('../utilidades/adjuntoSolicitud', () => ({
  ...jest.requireActual('../utilidades/adjuntoSolicitud'),
  elegirVideo: (...a: unknown[]) => mockElegirVideo(...a),
  prepararAdjuntoFoto: (...a: unknown[]) => mockPrepararFoto(...a),
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDescargar(...a),
  deleteAsync: (...a: unknown[]) => mockBorrar(...a),
  getInfoAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...a: unknown[]) => mockCompartir(...a),
}));

const sesion: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// ---- Datos ----

const MB = 1024 * 1024;
const URL_UNO = 'https://b.test/s/adjunto.jpg?token=PRIMERO';
const URL_FRESCA = 'https://b.test/s/adjunto.jpg?token=FRESCO';

const solicitud = (id: string, extra: Partial<SolicitudInquilino> = {}): SolicitudInquilino => ({
  id,
  arrendador_id: 'a1',
  unidad_id: 'u1',
  inquilino_id: 'i1',
  descripcion: 'La llave del lavamanos gotea.',
  urgencia: 'MEDIO',
  estado: 'PENDIENTE',
  creado_en: '2026-10-01T15:00:00.000Z',
  actualizado_en: '2026-10-01T15:00:00.000Z',
  adjunto_url: null,
  adjunto_tipo: null,
  ...extra,
});

const resumen = (estado: string) => ({
  id: 'c1',
  estado,
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2027-12-31T00:00:00.000Z',
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
  estado_pago: estado === 'ACTIVO' ? 'al_dia' : null,
});

const datos: {
  estadoContrato: string;
  lista: unknown;
  detalle: unknown[];
  errorLista: unknown;
} = { estadoContrato: 'ACTIVO', lista: [], detalle: [], errorLista: null };

function responder(url: string): Promise<unknown> {
  if (url === '/inquilino/contratos') return Promise.resolve([resumen(datos.estadoContrato)]);
  if (url === '/inquilino/solicitudes?contratoId=c1') {
    return datos.errorLista ? Promise.reject(datos.errorLista) : Promise.resolve(datos.lista);
  }
  if (url.startsWith('/inquilino/solicitudes/')) {
    const siguiente = datos.detalle.length > 1 ? datos.detalle.shift() : datos.detalle[0];
    return siguiente instanceof Error ? Promise.reject(siguiente) : Promise.resolve(siguiente);
  }
  return Promise.reject(new Error(`Ruta inesperada: ${url}`));
}
const llamadasA = (inicio: string) =>
  mockGet.mock.calls.filter(([u]) => String(u).startsWith(inicio)).length;

// ---- Ayudas ----

const montar = (pantalla: ReactNode) =>
  renderizarPantalla(
    <ContratoSeleccionadoProvider>{pantalla}</ContratoSeleccionadoProvider>,
    sesion,
  );
type Montada = Awaited<ReturnType<typeof montar>>;
type Raiz = Montada['raiz'];
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
const pestana = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find(
    (n) => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === etiqueta,
  );
const tocarPestana = async (raiz: Raiz, etiqueta: string) => {
  await act(async () => pestana(raiz, etiqueta).props.onPress());
  await esperar();
};
const claveDe = (llamada: number) =>
  (mockSubir.mock.calls[llamada][4] as { encabezados: Record<string, string> }).encabezados[
    'Idempotency-Key'
  ];
const adjuntoDe = (llamada: number) => mockSubir.mock.calls[llamada][2] as { tipo: string } | null;

const FOTO = {
  uri: 'file:///cache/reducida.jpg',
  name: 'foto.jpg',
  type: 'image/jpeg',
  tipo: 'IMAGEN',
  nombreVisible: 'foto.jpg',
};
const VIDEO = {
  uri: 'file:///cache/ImagePicker/clip.mp4',
  name: 'video.mp4',
  type: 'video/mp4',
  tipo: 'VIDEO',
  nombreVisible: 'clip.mp4',
  tamanoBytes: 8 * MB,
  duracionMs: 12_000,
};

beforeEach(() => {
  fijarReloj();
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockSubir,
    mockPush,
    mockBack,
    mockReplace,
    mockElegirFoto,
    mockElegirVideo,
    mockPrepararFoto,
  ])
    m.mockReset();
  mockDescargar.mockReset().mockResolvedValue({ status: 200, uri: 'file:///cache/c' });
  mockCompartir.mockReset().mockResolvedValue(undefined);
  mockBorrar.mockReset().mockResolvedValue(undefined);
  mockGet.mockImplementation(responder);
  mockSubir.mockResolvedValue(solicitud('nueva'));
  mockPrepararFoto.mockResolvedValue(FOTO);
  mockParams = { id: 's1' };
  mockFuente = null;
  mockEscuchas = [];
  datos.estadoContrato = 'ACTIVO';
  datos.lista = [];
  datos.detalle = [solicitud('s1')];
  datos.errorLista = null;
});
afterEach(restaurarReloj);

// ---------------------------------------------------------------------------------------------

describe('pestaña Solicitudes', () => {
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
  ];

  it('pide las solicitudes del contrato seleccionado y muestra las abiertas por defecto, con contadores', async () => {
    datos.lista = variasSolicitudes();
    const { raiz } = await montar(<SolicitudesInquilino />);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/solicitudes?contratoId=c1');
    expect(pestana(raiz, 'Abiertas, 2').props.accessibilityState.selected).toBe(true);
    expect(pestana(raiz, 'Resueltas, 1').props.accessibilityState.selected).toBe(false);
    const t = todo(raiz);
    expect(t).toContain('La llave del lavamanos gotea.');
    expect(t).toContain('Se dañó la cerradura.');
    expect(t).not.toContain('Cambio de bombillo.');
  });

  it('cada fila trae chip de urgencia, chip de estado, fecha de creación y señal de adjunto', async () => {
    datos.lista = variasSolicitudes();
    const { raiz } = await montar(<SolicitudesInquilino />);
    const t = todo(raiz);
    expect(t).toContain('Pendiente');
    expect(t).toContain('En proceso');
    expect(t).toContain('alta');
    expect(t).toContain('media');
    expect(t).toContain('Creada el 01/10/2026');
    expect(t).toContain('Foto');
    expect(t).toContain('Video');
  });

  it('un cambio de segmento muestra las resueltas', async () => {
    datos.lista = variasSolicitudes();
    const { raiz } = await montar(<SolicitudesInquilino />);
    await tocarPestana(raiz, 'Resueltas, 1');
    expect(todo(raiz)).toContain('Cambio de bombillo.');
    expect(todo(raiz)).not.toContain('Se dañó la cerradura.');
  });

  it('tocar una fila abre su detalle', async () => {
    datos.lista = variasSolicitudes();
    const { raiz } = await montar(<SolicitudesInquilino />);
    const fila = raiz.root.find(
      (n) =>
        n.props.accessibilityRole === 'button' &&
        n.findAll((h) => h.props.children === 'Se dañó la cerradura.').length > 0,
    );
    await act(async () => fila.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/solicitud/[id]', params: { id: 's2' } });
  });

  it('vacío: cada segmento tiene su mensaje útil', async () => {
    datos.lista = [];
    const { raiz } = await montar(<SolicitudesInquilino />);
    expect(todo(raiz)).toContain('No tienes solicitudes abiertas');
    await tocarPestana(raiz, 'Resueltas, 0');
    expect(todo(raiz)).toContain('No tienes solicitudes resueltas');
  });

  it('error: mensaje en español y "Reintentar" vuelve a pedir la lista', async () => {
    datos.errorLista = new ErrorApi({ status: 500, codigo: 'ERROR_INTERNO', mensaje: 'x' });
    const { raiz } = await montar(<SolicitudesInquilino />);
    expect(todo(raiz)).toContain('Ocurrió un error en el servidor');
    const antes = llamadasA('/inquilino/solicitudes?');
    datos.errorLista = null;
    datos.lista = [solicitud('s1')];
    await pulsar(raiz, 'Reintentar');
    expect(llamadasA('/inquilino/solicitudes?')).toBe(antes + 1);
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });

  it('arrastrar para refrescar vuelve a pedir la lista', async () => {
    datos.lista = [solicitud('s1')];
    const { raiz } = await montar(<SolicitudesInquilino />);
    const antes = llamadasA('/inquilino/solicitudes?');
    await act(async () => {
      await raiz.root.findByType(RefreshControl).props.onRefresh();
    });
    await esperar();
    expect(llamadasA('/inquilino/solicitudes?')).toBeGreaterThan(antes);
  });

  it('con contrato ACTIVO ofrece "Nueva solicitud" y abre el formulario', async () => {
    const { raiz } = await montar(<SolicitudesInquilino />);
    await pulsar(raiz, 'Nueva solicitud');
    expect(mockPush).toHaveBeenCalledWith('/nueva-solicitud');
  });

  it('con contrato PROGRAMADO no hay botón y explica por qué; la lista sigue visible', async () => {
    datos.estadoContrato = 'PROGRAMADO';
    datos.lista = [solicitud('s1')];
    const { raiz } = await montar(<SolicitudesInquilino />);
    expect(hayBoton(raiz, 'Nueva solicitud')).toBe(false);
    expect(todo(raiz)).toContain('Podrás crear solicitudes cuando tu contrato esté activo.');
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });

  it.each([
    [
      'VENCIDO',
      'Tu contrato finalizó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.',
    ],
    [
      'TERMINADO_ANTICIPADAMENTE',
      'Tu contrato terminó: ya no puedes crear solicitudes, pero puedes consultar las que hiciste.',
    ],
  ])('con contrato %s: sin botón y con el texto correspondiente', async (estado, texto) => {
    datos.estadoContrato = estado;
    datos.lista = [solicitud('s1', { estado: 'RESUELTO' })];
    const { raiz } = await montar(<SolicitudesInquilino />);
    expect(hayBoton(raiz, 'Nueva solicitud')).toBe(false);
    expect(todo(raiz)).toContain(texto);
    await tocarPestana(raiz, 'Resueltas, 1');
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });
});

// ---------------------------------------------------------------------------------------------

describe('detalle de la solicitud', () => {
  const conAdjunto = (tipo: 'IMAGEN' | 'VIDEO' | null, url: string | null, extra = {}) =>
    solicitud('s1', { adjunto_tipo: tipo, adjunto_url: url, ...extra });

  it('muestra la descripción, urgencia, estado con su frase y las fechas; es de solo lectura', async () => {
    datos.detalle = [
      solicitud('s1', {
        estado: 'EN_PROCESO',
        urgencia: 'ALTO',
        actualizado_en: '2026-10-02T15:00:00.000Z',
      }),
    ];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    const t = todo(raiz);
    expect(t).toContain('La llave del lavamanos gotea.');
    expect(t).toContain('En proceso');
    expect(t).toContain('alta');
    expect(t).toContain('El arrendador la está atendiendo');
    expect(t).toContain('Creada el 01/10/2026');
    expect(t).toContain('Última actualización: 02/10/2026');
    expect(t).not.toContain('Adjunto');
    for (const accion of ['Cancelar solicitud', 'Editar', 'Agregar foto']) {
      expect(hayBoton(raiz, accion)).toBe(false);
    }
  });

  it.each([
    ['PENDIENTE', 'El arrendador aún no la ha atendido'],
    ['RESUELTO', 'El arrendador la marcó como resuelta'],
  ] as const)('estado %s: "%s"', async (estado, frase) => {
    datos.detalle = [solicitud('s1', { estado })];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(todo(raiz)).toContain(frase);
  });

  it('imagen: vista previa y "Ampliar" vuelve a pedir la solicitud (URL fresca) antes de abrir', async () => {
    datos.detalle = [conAdjunto('IMAGEN', URL_UNO), conAdjunto('IMAGEN', URL_FRESCA)];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'Foto de la solicitud').length,
    ).toBeGreaterThan(0);
    const antes = llamadasA('/inquilino/solicitudes/s1');
    await pulsar(raiz, 'Ampliar');
    expect(llamadasA('/inquilino/solicitudes/s1')).toBe(antes + 1);
    expect(hayBoton(raiz, 'Cerrar')).toBe(true);
    const fuentes = raiz.root
      .findAll((n) => n.props.accessibilityLabel === 'Foto de la solicitud' && n.props.source)
      .map((n) => (n.props.source as { uri: string }).uri);
    expect(fuentes).toContain(URL_FRESCA);
  });

  it('video: "Reproducir video" vuelve a pedir la solicitud y crea el reproductor con la URL fresca', async () => {
    datos.detalle = [
      conAdjunto('VIDEO', 'https://b.test/v.mp4?token=PRIMERO'),
      conAdjunto('VIDEO', 'https://b.test/v.mp4?token=FRESCO'),
    ];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(mockFuente).toBeNull(); // no se carga el video hasta que la persona lo pide
    const antes = llamadasA('/inquilino/solicitudes/s1');
    await pulsar(raiz, 'Reproducir video');
    expect(llamadasA('/inquilino/solicitudes/s1')).toBe(antes + 1);
    expect(mockFuente).toBe('https://b.test/v.mp4?token=FRESCO');
    expect(raiz.root.findAll((n) => n.props.testID === 'video').length).toBeGreaterThan(0);
    expect(raiz.root.findAll((n) => n.props.testID === 'video')[0].props.nativeControls).toBe(true);
  });

  it('si el reproductor falla se reintenta UNA vez con una URL nueva; si vuelve a fallar, lo dice', async () => {
    datos.detalle = [
      conAdjunto('VIDEO', 'https://b.test/v.mp4?token=1'),
      conAdjunto('VIDEO', 'https://b.test/v.mp4?token=2'),
      conAdjunto('VIDEO', 'https://b.test/v.mp4?token=3'),
    ];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    await pulsar(raiz, 'Reproducir video');
    expect(mockFuente).toBe('https://b.test/v.mp4?token=2');

    await act(async () => mockEscuchas[mockEscuchas.length - 1]({ status: 'error' }));
    await esperar();
    expect(mockFuente).toBe('https://b.test/v.mp4?token=3');

    await act(async () => mockEscuchas[mockEscuchas.length - 1]({ status: 'error' }));
    await esperar();
    expect(todo(raiz)).toContain('No pudimos reproducir el video. Inténtalo de nuevo.');
    expect(JSON.stringify(textosDe(raiz))).not.toMatch(/token=/);
  });

  it('un adjunto con URL pero sin tipo conocido se abre como archivo, sin suponer el tipo', async () => {
    datos.detalle = [conAdjunto(null, URL_UNO), conAdjunto(null, URL_FRESCA)];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    await pulsar(raiz, 'Abrir archivo');
    expect(mockDescargar).toHaveBeenCalledWith(URL_FRESCA, expect.any(String));
    expect(mockCompartir).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ mimeType: '*/*' }),
    );
  });

  it('con tipo pero sin URL: "Adjunto no disponible", sin romper la pantalla', async () => {
    datos.detalle = [conAdjunto('VIDEO', null)];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(todo(raiz)).toContain('Adjunto no disponible');
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });

  it('si al volver a pedir ya no hay URL, lo dice', async () => {
    datos.detalle = [conAdjunto('IMAGEN', URL_UNO), conAdjunto('IMAGEN', null)];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    await pulsar(raiz, 'Ampliar');
    expect(todo(raiz)).toContain('Adjunto no disponible');
  });

  it('404: "Solicitud no encontrada" con botón para volver', async () => {
    datos.detalle = [new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' })];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(todo(raiz)).toContain('Solicitud no encontrada');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('error al cargar: mensaje y "Reintentar"', async () => {
    datos.detalle = [new ErrorSinConexion()];
    const { raiz } = await montar(<DetalleSolicitudInquilino />);
    expect(todo(raiz)).toContain('No hay conexión a internet');
    datos.detalle = [solicitud('s1')];
    await pulsar(raiz, 'Reintentar');
    expect(todo(raiz)).toContain('La llave del lavamanos gotea.');
  });
});

// ---------------------------------------------------------------------------------------------

describe('nueva solicitud', () => {
  const escribirDescripcion = (raiz: Raiz, texto = 'La llave del lavamanos gotea.') =>
    escribirEn(raiz, 'Descripción', texto);
  const enviar = (raiz: Raiz) => pulsar(raiz, 'Enviar solicitud');

  it('muestra la unidad y el inmueble del contrato seleccionado y nunca pide el id de la unidad', async () => {
    const { raiz } = await montar(<NuevaSolicitud />);
    expect(todo(raiz)).toContain('Apto 302 · Calle 45 # 12-30');
    expect(campoDe(raiz, 'unidadId')).toBeUndefined();
    expect(campoDe(raiz, 'Unidad')).toBeUndefined();
  });

  it('"Enviar solicitud" está deshabilitado mientras no haya una descripción válida', async () => {
    const { raiz } = await montar(<NuevaSolicitud />);
    expect(botonDe(raiz, 'Enviar solicitud').props.disabled).toBe(true);
    await escribirDescripcion(raiz, '    ');
    expect(botonDe(raiz, 'Enviar solicitud').props.disabled).toBe(true);
    await escribirDescripcion(raiz);
    expect(botonDe(raiz, 'Enviar solicitud').props.disabled).toBe(false);
  });

  it('urgencia con tres niveles, MEDIO por defecto y una frase por nivel', async () => {
    const { raiz } = await montar(<NuevaSolicitud />);
    expect(pestana(raiz, 'Media').props.accessibilityState.selected).toBe(true);
    expect(todo(raiz)).toContain('Conviene arreglarlo pronto.');
    await tocarPestana(raiz, 'Alta');
    expect(todo(raiz)).toContain('Es urgente');
    await tocarPestana(raiz, 'Baja');
    expect(todo(raiz)).toContain('Puede esperar unos días.');
  });

  it('sin adjunto: manda la unidad del contrato, la descripción recortada y la urgencia, con clave válida', async () => {
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz, '  La llave gotea  ');
    await tocarPestana(raiz, 'Alta');
    await enviar(raiz);
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockSubir.mock.calls[0][0]).toBe('/solicitudes-mantenimiento');
    expect(mockSubir.mock.calls[0][2]).toBeNull();
    expect(mockSubir.mock.calls[0][3]).toEqual({
      unidadId: 'u1',
      descripcion: 'La llave gotea',
      urgencia: 'ALTO',
    });
    expect(claveDe(0)).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });

  it('éxito: mensaje claro, lista refrescada y vuelta a Solicitudes', async () => {
    const { raiz, cliente } = await montar(<NuevaSolicitud />);
    const invalidar = jest.spyOn(cliente, 'invalidateQueries');
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).toContain('Solicitud enviada. Tu arrendador la verá en su lista.');
    expect(invalidar).toHaveBeenCalled();
    await pulsar(raiz, 'Volver a Solicitudes');
    expect(mockBack).toHaveBeenCalled();
  });

  it('doble toque: una sola llamada', async () => {
    mockSubir.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await act(async () => {
      const boton = botonDe(raiz, 'Enviar solicitud');
      boton.props.onPress();
      boton.props.onPress();
    });
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('Enviando…');
  });

  it('sin respuesta: dice que no sabe si llegó y reintentar usa LA MISMA clave (no duplica)', async () => {
    mockSubir.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).toContain(
      'No sabemos si tu solicitud llegó. Puedes volver a enviarla: no se duplicará.',
    );
    await enviar(raiz);
    expect(mockSubir).toHaveBeenCalledTimes(2);
    expect(claveDe(1)).toBe(claveDe(0));
    expect(todo(raiz)).toContain('Solicitud enviada.');
  });

  it('cambiar la descripción, la urgencia o el adjunto cambia la clave; volver atrás no la recupera', async () => {
    mockSubir.mockRejectedValue(new ErrorSinConexion());
    mockElegirFoto.mockResolvedValue({
      tipo: 'elegida',
      archivo: { uri: 'file:///o.jpg', name: 'p.jpg', type: 'image/jpeg' },
    });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    await escribirDescripcion(raiz, 'Otra descripción distinta.');
    await enviar(raiz);
    await tocarPestana(raiz, 'Alta');
    await enviar(raiz);
    await pulsar(raiz, 'Tomar foto');
    await enviar(raiz);
    const claves = new Set([0, 1, 2, 3].map(claveDe));
    expect(claves.size).toBe(4);
  });

  it('422 (clave reutilizada con otro contenido): informa y la siguiente vez usa una clave nueva', async () => {
    mockSubir.mockRejectedValueOnce(
      new ErrorApi({ status: 422, codigo: 'IDEMPOTENCY_KEY_REUTILIZADA', mensaje: 'x' }),
    );
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).toContain('cambiaron mientras se enviaba');
    await enviar(raiz);
    expect(claveDe(1)).not.toBe(claveDe(0));
  });

  it('409 SOLICITUD_EN_PROCESO: informa, no reenvía solo y conserva la clave', async () => {
    mockSubir.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'SOLICITUD_EN_PROCESO', mensaje: 'x' }),
    );
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).toContain('ya se está enviando');
    expect(mockSubir).toHaveBeenCalledTimes(1);
    await enviar(raiz);
    expect(claveDe(1)).toBe(claveDe(0));
  });

  it.each([
    [
      new ErrorApi({ status: 409, codigo: 'CONTRATO_NO_ACTIVO', mensaje: 'x' }),
      'Solo puedes crear solicitudes con un contrato activo.',
    ],
    [
      new ErrorApi({ status: 413, codigo: 'CARGA_DEMASIADO_GRANDE', mensaje: 'File too large' }),
      'El archivo es demasiado grande (máximo 20 MB).',
    ],
    [
      new ErrorApi({ status: 415, codigo: 'ARCHIVO_CONTENIDO_INVALIDO', mensaje: 'x' }),
      'Ese archivo no es válido. Usa una foto JPG o PNG, o un video MP4.',
    ],
  ])('error %#: mensaje por código, en español', async (error, texto) => {
    mockSubir.mockRejectedValueOnce(error);
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).toContain(texto);
  });

  it('foto: se prepara UNA vez al elegirla y esa misma uri se usa en todos los envíos', async () => {
    mockSubir.mockRejectedValueOnce(new ErrorSinConexion());
    mockElegirFoto.mockResolvedValue({
      tipo: 'elegida',
      archivo: { uri: 'file:///o.jpg', name: 'p.jpg', type: 'image/jpeg' },
    });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Tomar foto');
    expect(mockElegirFoto).toHaveBeenCalledWith('camara');
    await enviar(raiz);
    await enviar(raiz);
    expect(mockPrepararFoto).toHaveBeenCalledTimes(1);
    expect(mockSubir.mock.calls.map((c) => (c[2] as { uri: string }).uri)).toEqual([
      FOTO.uri,
      FOTO.uri,
    ]);
    expect(claveDe(1)).toBe(claveDe(0));
  });

  it('galería de fotos', async () => {
    mockElegirFoto.mockResolvedValue({
      tipo: 'elegida',
      archivo: { uri: 'file:///o.jpg', name: 'p.jpg', type: 'image/jpeg' },
    });
    const { raiz } = await montar(<NuevaSolicitud />);
    await pulsar(raiz, 'Elegir foto de la galería');
    expect(mockElegirFoto).toHaveBeenCalledWith('galeria');
  });

  it('video: muestra nombre, duración y tamaño ANTES de enviar y se manda como video/mp4', async () => {
    mockElegirVideo.mockResolvedValue({ tipo: 'elegido', adjunto: VIDEO });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Grabar video');
    expect(mockElegirVideo).toHaveBeenCalledWith('camara');
    const t = todo(raiz);
    expect(t).toContain('clip.mp4');
    expect(t).toContain('Video · 0:12 · 8,0 MB');
    await enviar(raiz);
    expect(adjuntoDe(0)).toMatchObject({ tipo: 'VIDEO', type: 'video/mp4', uri: VIDEO.uri });
  });

  it('video de galería', async () => {
    mockElegirVideo.mockResolvedValue({ tipo: 'elegido', adjunto: VIDEO });
    const { raiz } = await montar(<NuevaSolicitud />);
    await pulsar(raiz, 'Elegir video de la galería');
    expect(mockElegirVideo).toHaveBeenCalledWith('galeria');
  });

  it('un video de más de 20 MB se bloquea con su tamaño real y no queda adjunto', async () => {
    mockElegirVideo.mockResolvedValue({ tipo: 'grande', tamanoBytes: 25 * MB });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Elegir video de la galería');
    expect(todo(raiz)).toContain('25,0 MB');
    expect(todo(raiz)).toContain('máximo es 20 MB');
    expect(hayBoton(raiz, 'Quitar adjunto')).toBe(false);
    await enviar(raiz);
    expect(adjuntoDe(0)).toBeNull();
  });

  it('un video que no es MP4 se bloquea con un mensaje claro', async () => {
    mockElegirVideo.mockResolvedValue({ tipo: 'formato' });
    const { raiz } = await montar(<NuevaSolicitud />);
    await pulsar(raiz, 'Elegir video de la galería');
    expect(todo(raiz)).toContain('Solo se admiten videos MP4.');
  });

  it('un solo adjunto: elegir otro reemplaza al anterior y "Quitar adjunto" lo borra', async () => {
    mockElegirFoto.mockResolvedValue({
      tipo: 'elegida',
      archivo: { uri: 'file:///o.jpg', name: 'p.jpg', type: 'image/jpeg' },
    });
    mockElegirVideo.mockResolvedValue({ tipo: 'elegido', adjunto: VIDEO });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Tomar foto');
    await pulsar(raiz, 'Elegir video de la galería');
    await enviar(raiz);
    expect(adjuntoDe(0)).toMatchObject({ tipo: 'VIDEO' });
    expect(mockPrepararFoto).toHaveBeenCalledTimes(1);
  });

  it('"Quitar adjunto" envía sin adjunto y con otra clave', async () => {
    mockSubir.mockRejectedValue(new ErrorSinConexion());
    mockElegirVideo.mockResolvedValue({ tipo: 'elegido', adjunto: VIDEO });
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Grabar video');
    await enviar(raiz);
    await pulsar(raiz, 'Quitar adjunto');
    expect(hayBoton(raiz, 'Quitar adjunto')).toBe(false);
    await enviar(raiz);
    expect(adjuntoDe(1)).toBeNull();
    expect(claveDe(1)).not.toBe(claveDe(0));
  });

  it('progreso de la subida y "Cancelar envío": se aborta y se informa "Envío cancelado." sin error de red', async () => {
    mockElegirVideo.mockResolvedValue({ tipo: 'elegido', adjunto: VIDEO });
    mockSubir.mockImplementation(
      (
        _r: string,
        _c: string,
        _a: unknown,
        _e: unknown,
        opciones: { alProgreso: (e: number, t: number) => void; senal: AbortSignal },
      ) =>
        new Promise((_ok, rechazar) => {
          opciones.alProgreso(25, 100);
          opciones.senal.addEventListener('abort', () => rechazar(new ErrorCancelado()));
        }),
    );
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await pulsar(raiz, 'Grabar video');
    expect(todo(raiz)).not.toContain('Subiendo');
    expect(hayBoton(raiz, 'Cancelar envío')).toBe(false);
    await enviar(raiz);
    expect(todo(raiz)).toContain('Subiendo… 25 %');
    await pulsar(raiz, 'Cancelar envío');
    const t = todo(raiz);
    expect(t).toContain('Envío cancelado.');
    expect(t).not.toContain('No hay conexión');
    expect(t).not.toContain('No sabemos si tu solicitud llegó');
    expect(hayBoton(raiz, 'Enviar solicitud')).toBe(true);
    expect(botonDe(raiz, 'Enviar solicitud').props.disabled).toBe(false);
  });

  it('sin adjunto no hay barra de progreso, pero sí se puede cancelar el envío', async () => {
    mockSubir.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<NuevaSolicitud />);
    await escribirDescripcion(raiz);
    await enviar(raiz);
    expect(todo(raiz)).not.toContain('Subiendo');
    expect(hayBoton(raiz, 'Cancelar envío')).toBe(true);
  });

  it('contrato que no está ACTIVO: no se puede abrir el formulario y explica por qué', async () => {
    datos.estadoContrato = 'PROGRAMADO';
    const { raiz } = await montar(<NuevaSolicitud />);
    expect(todo(raiz)).toContain('No puedes crear solicitudes');
    expect(todo(raiz)).toContain('Podrás crear solicitudes cuando tu contrato esté activo.');
    expect(hayBoton(raiz, 'Enviar solicitud')).toBe(false);
    expect(campoDe(raiz, 'Descripción')).toBeUndefined();
    await pulsar(raiz, 'Volver a Solicitudes');
    expect(mockBack).toHaveBeenCalled();
  });
});
