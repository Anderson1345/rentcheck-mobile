// Alertas de ambos roles (E9-A, rediseño R3-B): lista (carga, vacíos, error con reintento, "Cargar
// más"), filtro Sin leer / Todas, grupos por día de Bogotá, tocar una alerta (marca leída sin bloquear
// y navega al destino; una informativa solo se marca), "Marcar todas" en el encabezado, la nota de
// retención y la campana con punto. La API y el router son dobles; el reloj está fijo (2 de octubre de
// 2026, 12:00 en Bogotá) y la hora de cada fila sale de instantes fijos.
import { View } from 'react-native';
import { act, type ReactTestRenderer } from 'react-test-renderer';

import AlertasArrendador from '../../app/(arrendador)/alertas-arrendador';
import PanelArrendador from '../../app/(arrendador)/(pestanas)/panel';
import MiPanel from '../../app/(inquilino)/(pestanas)/mi-panel';
import AlertasInquilino from '../../app/(inquilino)/alertas';
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
import { ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SIN_CONEXION } from '../api/errores';
import type { Alerta, FeedAlertas } from '../api/alertas';
import { BotonIcono } from '../componentes/BotonIcono';
import { CampanaAlertas } from '../componentes/alertas/CampanaAlertas';
import { crearToken } from '../pruebas/crearToken';
import { botonDe, hayBoton, pulsar, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { panelEjemplo } from '../pruebas/datosPanel';
import { fijarReloj, restaurarReloj } from '../pruebas/reloj';
import type { DatosSesion } from '../sesion/tipos';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useFocusEffect: () => undefined,
  // El encabezado nativo no existe en las pruebas: su acción derecha se pinta en el árbol.
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => unknown } }) =>
      options?.headerRight?.() ?? null,
  },
}));
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
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    post: jest.fn(),
  },
}));

const sesionArrendador: DatosSesion = {
  token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
};
const sesionInquilino: DatosSesion = {
  token: crearToken({ id: 'i1', exp: 4_102_444_800, rol: 'inquilino' }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// 15:04 UTC = 10:04 en Bogotá del 2 de octubre de 2026.
const EN_OCTUBRE = '2026-10-02T15:04:00.000Z';
// 03:30 UTC del 2 de octubre = 22:30 del 1 de octubre en Bogotá (el día no es el de UTC).
const MADRUGADA_UTC = '2026-10-02T03:30:00.000Z';

const alerta = (id: string, extra: Partial<Alerta> = {}): Alerta => ({
  id,
  tipo: 'PAGO_APROBADO',
  mensaje: `Mensaje de ${id}`,
  leida: false,
  creado_en: EN_OCTUBRE,
  recurso: null,
  ...extra,
});
const feed = (
  items: Alerta[],
  siguiente: string | null = null,
  noLeidas = items.filter((a) => !a.leida).length,
): FeedAlertas => ({ items, siguiente_cursor: siguiente, no_leidas: noLeidas });

/** Responde cada ruta; `feeds` se consume en orden (una respuesta por llamada al feed). */
function programar(rutas: { feeds?: unknown[]; conteo?: number } = {}) {
  const feeds = [...(rutas.feeds ?? [feed([])])];
  mockGet.mockImplementation(async (url: string) => {
    if (/\/conteo$/.test(url)) return { no_leidas: rutas.conteo ?? 0 };
    const siguiente = feeds.length > 1 ? feeds.shift() : feeds[0];
    if (siguiente instanceof Error) throw siguiente;
    return siguiente;
  });
}

const llamadasFeed = () =>
  mockGet.mock.calls.map((c) => c[0] as string).filter((u) => !/\/conteo$/.test(u));

/** La pestaña del filtro (rol "tab") por su etiqueta accesible. */
const pestana = (raiz: ReactTestRenderer, etiqueta: string) =>
  raiz.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'tab' &&
      n.props.accessibilityLabel === etiqueta &&
      typeof n.props.onPress === 'function',
  )[0];
const elegir = async (raiz: ReactTestRenderer, etiqueta: string) => {
  await act(async () => pestana(raiz, etiqueta).props.onPress());
};
const seleccionada = (raiz: ReactTestRenderer, etiqueta: string) =>
  pestana(raiz, etiqueta).props.accessibilityState.selected;
/** Resumen accesible de los grupos por día, en orden (solo nodos nativos). */
const grupos = (raiz: ReactTestRenderer) =>
  raiz.root
    .findAll((n) => typeof n.type === 'string' && n.props.testID === 'grupo-alertas')
    .map((n) => n.props.accessibilityLabel as string);

const sinLeer = (raiz: ReactTestRenderer) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Sin leer')
    .length;

async function esperar() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 20));
  });
}

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset().mockResolvedValue({});
  mockPush.mockReset();
  fijarReloj();
});
afterEach(() => restaurarReloj());

const ROLES = [
  {
    nombre: 'arrendador',
    Pantalla: AlertasArrendador,
    sesion: sesionArrendador,
    feedUrl: '/alertas/feed?limite=20',
    marcarUna: (id: string) => `/alertas/${id}/leida`,
    marcarTodas: '/alertas/leidas',
  },
  {
    nombre: 'inquilino',
    Pantalla: AlertasInquilino,
    sesion: sesionInquilino,
    feedUrl: '/inquilino/alertas?limite=20',
    marcarUna: (id: string) => `/inquilino/alertas/${id}/leida`,
    marcarTodas: '/inquilino/alertas/leidas',
  },
] as const;

describe.each(ROLES)('Pantalla de alertas del $nombre', (rol) => {
  it('muestra el esqueleto mientras carga', async () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'Cargando').length,
    ).toBeGreaterThan(0);
  });

  it('lista vacía: "No tienes alertas" y nada que marcar', async () => {
    programar({ feeds: [feed([])] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(textosDe(raiz)).toContain('No tienes alertas');
    expect(botonDe(raiz, 'Marcar todas').props.accessibilityState.disabled).toBe(true);
    expect(hayBoton(raiz, 'Cargar más')).toBe(false);
  });

  it('error al cargar: mensaje y "Reintentar", que vuelve a pedir y muestra la lista', async () => {
    programar({ feeds: [new ErrorSinConexion(), feed([alerta('a1')])] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);
    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(textosDe(raiz)).toContain('Mensaje de a1');
    expect(llamadasFeed()).toHaveLength(2);
  });

  it('muestra título corto, mensaje, hora de Bogotá y un punto solo en las no leídas', async () => {
    programar({
      feeds: [
        feed([
          alerta('a1', {
            tipo: 'PAGO_RECHAZADO',
            mensaje: 'Tu pago fue rechazado.',
          }),
          alerta('a2', {
            leida: true,
            creado_en: MADRUGADA_UTC,
            mensaje: 'Otra ya leída.',
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    // La leída se ve en "Todas" (con una sin leer, la pantalla abre en "Sin leer").
    await elegir(raiz, 'Todas');
    const textos = textosDe(raiz);
    expect(textos).toContain('Pago rechazado');
    expect(textos).toContain('Tu pago fue rechazado.');
    expect(textos).toContain('10:04');
    expect(textos).toContain('Otra ya leída.');
    // El instante de la madrugada del 2 (UTC) es todavía el 1 en Bogotá: "Ayer", 22:30.
    expect(textos).toContain('22:30');
    expect(grupos(raiz)).toEqual(['Hoy: 1 alerta, 1 sin leer', 'Ayer: 1 alerta']);
    expect(sinLeer(raiz)).toBe(1);
  });

  it('pide el feed de su rol y "Cargar más" envía el cursor y acumula las páginas', async () => {
    programar({
      feeds: [
        feed([alerta('a1'), alerta('a2')], 'CURSOR_2', 3),
        feed([alerta('a3', { leida: true })], null, 2),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(llamadasFeed()[0]).toBe(rol.feedUrl);
    expect(hayBoton(raiz, 'Cargar más')).toBe(true);

    await pulsar(raiz, 'Cargar más');
    await esperar();
    expect(llamadasFeed()[1]).toBe(`${rol.feedUrl}&cursor=CURSOR_2`);
    // a3 ya está leída: se ve en "Todas".
    await elegir(raiz, 'Todas');
    const textos = textosDe(raiz);
    expect(textos).toEqual(
      expect.arrayContaining(['Mensaje de a1', 'Mensaje de a2', 'Mensaje de a3']),
    );
    expect(hayBoton(raiz, 'Cargar más')).toBe(false);
  });

  it('si "Cargar más" falla conserva la lista y avisa', async () => {
    programar({
      feeds: [feed([alerta('a1')], 'CURSOR_2'), new ErrorSinConexion()],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await pulsar(raiz, 'Cargar más');
    await esperar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Mensaje de a1');
    expect(textos).toContain(MENSAJE_SIN_CONEXION);
    expect(hayBoton(raiz, 'Cargar más')).toBe(true);
  });

  it('tocar una alerta no leída con destino la marca leída y navega', async () => {
    programar({
      feeds: [
        feed([
          alerta('a1', {
            tipo: 'CONTRATO_PROXIMO_A_VENCER',
            mensaje: 'El contrato vence pronto.',
            recurso: { tipo: 'CONTRATO', id: 'c1', contrato_id: 'c1' },
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await act(async () => {
      botonDe(raiz, 'Contrato por vencer').props.onPress();
    });
    expect(mockPatch).toHaveBeenCalledWith(rol.marcarUna('a1'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      rol.nombre === 'arrendador'
        ? { pathname: '/contrato/[id]', params: { id: 'c1' } }
        : { pathname: '/mi-contrato/[id]', params: { id: 'c1' } },
    );
  });

  it('si marcar leída falla, navega igual y no muestra error', async () => {
    mockPatch.mockRejectedValue(new ErrorSinConexion());
    programar({
      feeds: [
        feed([
          alerta('a1', {
            tipo: 'SOLICITUD_MANTENIMIENTO_CREADA',
            recurso: {
              tipo: 'SOLICITUD_MANTENIMIENTO',
              id: 's1',
              contrato_id: null,
            },
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await act(async () => {
      botonDe(raiz, 'Nueva solicitud').props.onPress();
    });
    await esperar();
    expect(mockPush).toHaveBeenCalledWith(
      rol.nombre === 'arrendador'
        ? { pathname: '/mantenimiento/[id]', params: { id: 's1' } }
        : { pathname: '/solicitud/[id]', params: { id: 's1' } },
    );
    expect(textosDe(raiz)).not.toContain(MENSAJE_SIN_CONEXION);
  });

  it('una alerta informativa (sin recurso) no leída solo se marca leída', async () => {
    programar({ feeds: [feed([alerta('a1', { mensaje: 'Aviso general.' })])] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await act(async () => {
      botonDe(raiz, 'Pago aprobado').props.onPress();
    });
    expect(mockPatch).toHaveBeenCalledWith(rol.marcarUna('a1'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('una informativa ya leída no es un botón (no hay nada que hacer)', async () => {
    programar({
      feeds: [feed([alerta('a1', { leida: true, mensaje: 'Aviso viejo.' })])],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(textosDe(raiz)).toContain('Aviso viejo.');
    expect(hayBoton(raiz, 'Pago aprobado')).toBe(false);
  });

  it('una alerta ya leída con destino navega sin volver a marcarla', async () => {
    programar({
      feeds: [
        feed([
          alerta('a1', {
            leida: true,
            tipo: 'INQUILINO_EN_MORA',
            recurso: {
              tipo: 'PERIODO',
              id: null,
              contrato_id: 'c9',
              periodo: '2026-10-01',
            },
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await act(async () => {
      botonDe(raiz, 'Pago en mora').props.onPress();
    });
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      rol.nombre === 'arrendador'
        ? { pathname: '/contrato/[id]/estado-cuenta', params: { id: 'c9' } }
        : { pathname: '/mi-contrato/[id]/estado-cuenta', params: { id: 'c9' } },
    );
  });

  it('"Marcar todas" (encabezado) llama a la API de su rol y vuelve a pedir el feed', async () => {
    programar({
      feeds: [
        feed([alerta('a1'), alerta('a2')], null, 2),
        feed([alerta('a1', { leida: true }), alerta('a2', { leida: true })], null, 0),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(botonDe(raiz, 'Marcar todas').props.accessibilityState.disabled).toBe(false);
    await pulsar(raiz, 'Marcar todas');
    await esperar();
    expect(mockPatch).toHaveBeenCalledWith(rol.marcarTodas);
    expect(llamadasFeed()).toHaveLength(2);
    expect(sinLeer(raiz)).toBe(0);
    expect(botonDe(raiz, 'Marcar todas').props.accessibilityState.disabled).toBe(true);
  });

  it('"Marcar todas" está deshabilitado si no hay alertas sin leer', async () => {
    programar({ feeds: [feed([alerta('a1', { leida: true })], null, 0)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(botonDe(raiz, 'Marcar todas').props.accessibilityState.disabled).toBe(true);
  });

  it('si "Marcar todas" falla, avisa y conserva la lista', async () => {
    mockPatch.mockRejectedValue(new ErrorSinConexion());
    programar({ feeds: [feed([alerta('a1')])] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await pulsar(raiz, 'Marcar todas');
    await esperar();
    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);
    expect(textosDe(raiz)).toContain('Mensaje de a1');
  });
});

describe.each(ROLES)('Alertas del $nombre: filtro, grupos por día y nota (R3-B)', (rol) => {
  // Hoy es el viernes 2 de octubre de 2026 (12:00 en Bogotá).
  const DEL_DIA = [
    alerta('hoy', { creado_en: '2026-10-02T15:04:00.000Z', mensaje: 'De hoy.' }),
    alerta('ayer', { creado_en: '2026-10-01T23:40:00.000Z', mensaje: 'De ayer.', leida: true }),
    alerta('semana', {
      creado_en: '2026-09-28T15:00:00.000Z',
      mensaje: 'Del lunes.',
      leida: true,
    }),
    alerta('antes', { creado_en: '2026-09-20T15:00:00.000Z', mensaje: 'De antes.', leida: true }),
  ];

  it('con alertas sin leer abre en "Sin leer · N" (N del servidor) y solo muestra las no leídas', async () => {
    programar({ feeds: [feed(DEL_DIA, null, 1)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(seleccionada(raiz, 'Sin leer · 1')).toBe(true);
    expect(seleccionada(raiz, 'Todas')).toBe(false);
    const textos = textosDe(raiz);
    expect(textos).toContain('De hoy.');
    expect(textos).not.toContain('De ayer.');
    expect(sinLeer(raiz)).toBe(1);
  });

  it('el contador es el del servidor aunque haya no leídas en páginas sin cargar', async () => {
    programar({ feeds: [feed([alerta('a1')], 'CURSOR_2', 7)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(pestana(raiz, 'Sin leer · 7')).toBeDefined();
    expect(hayBoton(raiz, 'Cargar más')).toBe(true);
  });

  it('"Todas" las agrupa por día: Hoy, Ayer, Esta semana y Antes, con su hora o fecha', async () => {
    programar({ feeds: [feed(DEL_DIA, null, 1)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await elegir(raiz, 'Todas');
    expect(seleccionada(raiz, 'Todas')).toBe(true);
    expect(grupos(raiz)).toEqual([
      'Hoy: 1 alerta, 1 sin leer',
      'Ayer: 1 alerta',
      'Esta semana: 1 alerta',
      'Antes: 1 alerta',
    ]);
    const textos = textosDe(raiz);
    expect(textos).toEqual(expect.arrayContaining(['Hoy', 'Ayer', 'Esta semana', 'Antes']));
    expect(textos).toEqual(expect.arrayContaining(['10:04', '18:40', 'lun.', '20/09/2026']));
    expect(textos).toEqual(
      expect.arrayContaining(['De hoy.', 'De ayer.', 'Del lunes.', 'De antes.']),
    );
  });

  it('sin alertas sin leer abre en "Todas"', async () => {
    programar({ feeds: [feed(DEL_DIA.slice(1), null, 0)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(seleccionada(raiz, 'Todas')).toBe(true);
    expect(pestana(raiz, 'Sin leer · 0')).toBeDefined();
    expect(textosDe(raiz)).toContain('De ayer.');
  });

  it('"Sin leer" vacío: "Estás al día" (distinto de no tener alertas)', async () => {
    programar({ feeds: [feed(DEL_DIA.slice(1), null, 0)] });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await elegir(raiz, 'Sin leer · 0');
    const textos = textosDe(raiz);
    expect(textos).toContain('Estás al día');
    expect(textos).not.toContain('No tienes alertas');
    expect(textos).not.toContain('De ayer.');
  });

  it('con alertas, la nota de retención al final; sin alertas no hay nota', async () => {
    programar({ feeds: [feed(DEL_DIA, null, 1)] });
    const con = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(textosDe(con.raiz)).toContain('Las alertas leídas se ocultan a los 7 días.');
    programar({ feeds: [feed([])] });
    const sin = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    expect(textosDe(sin.raiz)).not.toContain('Las alertas leídas se ocultan a los 7 días.');
  });

  it('tocar una no leída marca sin esperar la respuesta: navega mientras la marca sigue en curso', async () => {
    let soltar: (v: unknown) => void = () => undefined;
    mockPatch.mockImplementation(() => new Promise((r) => (soltar = r)));
    programar({
      feeds: [
        feed([
          alerta('a1', {
            tipo: 'CONTRATO_PROXIMO_A_VENCER',
            recurso: { tipo: 'CONTRATO', id: 'c1', contrato_id: 'c1' },
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<rol.Pantalla />, rol.sesion);
    await act(async () => {
      botonDe(raiz, 'Contrato por vencer').props.onPress();
    });
    expect(mockPatch).toHaveBeenCalledWith(rol.marcarUna('a1'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    await act(async () => soltar({}));
  });
});

describe('PAGO del inquilino sin contrato_id', () => {
  it('lleva a la pestaña /pagos', async () => {
    programar({
      feeds: [
        feed([
          alerta('a1', {
            tipo: 'PAGO_APROBADO',
            recurso: {
              tipo: 'PAGO',
              id: 'p1',
              contrato_id: null,
              periodo: null,
            },
          }),
        ]),
      ],
    });
    const { raiz } = await renderizarPantalla(<AlertasInquilino />, sesionInquilino);
    await act(async () => {
      botonDe(raiz, 'Pago aprobado').props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/pagos' });
  });
});

describe('CampanaAlertas', () => {
  const campana = (raiz: ReactTestRenderer) => raiz.root.findByType(BotonIcono);
  const punto = (raiz: ReactTestRenderer) => campana(raiz).props.conPunto;

  it.each([
    ['arrendador', sesionArrendador, '/alertas/conteo', '/alertas-arrendador'],
    ['inquilino', sesionInquilino, '/inquilino/alertas/conteo', '/alertas'],
  ] as const)(
    'con alertas sin leer muestra el punto y abre la pantalla del %s',
    async (rol, sesion, rutaConteo, rutaPantalla) => {
      programar({ conteo: 3 });
      const { raiz } = await renderizarPantalla(<CampanaAlertas rol={rol} />, sesion);
      expect(mockGet).toHaveBeenCalledWith(rutaConteo);
      expect(punto(raiz)).toBe(true);
      expect(campana(raiz).props.etiqueta).toBe('Alertas, hay sin leer');
      await act(async () => {
        campana(raiz).props.onPress();
      });
      expect(mockPush).toHaveBeenCalledWith(rutaPantalla);
    },
  );

  it('sin alertas sin leer el punto está oculto', async () => {
    programar({ conteo: 0 });
    const { raiz } = await renderizarPantalla(
      <CampanaAlertas rol="arrendador" />,
      sesionArrendador,
    );
    expect(punto(raiz)).toBe(false);
    expect(campana(raiz).props.etiqueta).toBe('Alertas');
  });

  it('mientras carga o si el conteo falla no hay punto (y tampoco error)', async () => {
    mockGet.mockRejectedValue(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<CampanaAlertas rol="inquilino" />, sesionInquilino);
    expect(punto(raiz)).toBe(false);
    expect(raiz.root.findAllByType(View).length).toBeGreaterThan(0);
  });
});

// R3-A: el Panel completo y en cero del helper de pruebas (con los campos de B0.7-B).
const PANEL_VACIO = panelEjemplo();

describe('la campana está en la cabecera de cada rol', () => {
  it('Panel del arrendador: campana con el punto del conteo de alertas del arrendador', async () => {
    // El Panel real pide también /arrendadores/panel: un Panel vacío basta para esta prueba.
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/alertas/conteo') return { no_leidas: 2 };
      if (url === '/arrendadores/panel') return PANEL_VACIO;
      throw new Error(`ruta inesperada ${url}`);
    });
    const { raiz } = await renderizarPantalla(<PanelArrendador />, sesionArrendador);
    expect(mockGet).toHaveBeenCalledWith('/alertas/conteo');
    const campana = raiz.root.findByType(BotonIcono);
    expect(campana.props.icono).toBe('alerta');
    expect(campana.props.conPunto).toBe(true);
  });

  it('Mi panel del inquilino: campana con el punto del conteo de alertas del inquilino', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/inquilino/alertas/conteo') return { no_leidas: 1 };
      if (url === '/inquilino/contratos') return [];
      throw new Error(`ruta inesperada ${url}`);
    });
    const { raiz } = await renderizarPantalla(
      <ContratoSeleccionadoProvider>
        <MiPanel />
      </ContratoSeleccionadoProvider>,
      sesionInquilino,
    );
    await esperar();
    const campana = raiz.root.findByType(BotonIcono);
    expect(campana.props.icono).toBe('alerta');
    expect(campana.props.conPunto).toBe(true);
  });
});
