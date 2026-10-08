// Inventario de entrega: zonas, varias fotos con subida secuencial, errores por foto, estado
// "incierta" y lista del servidor. El cliente de API y el selector de fotos se simulan.
import { Image } from 'expo-image';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import Inventario from '../../app/(arrendador)/contrato/[id]/inventario';
import { ErrorApi, ErrorArchivo, ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import type { FotoInventario } from '../api/inventario';
import { botonDe, campoDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';

// Con la suite completa en paralelo, montar la pantalla real puede tardar más de 5 s.
jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockSubir = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockElegir = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
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
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];
const FOTOS = [1, 2, 3].map((n) => ({
  uri: `file:///cache/foto${n}.jpg`,
  name: 'portada.jpg',
  type: 'image/jpeg' as const,
}));
const guardada = (extra: Partial<FotoInventario> = {}): FotoInventario => ({
  id: 'f1',
  contrato_id: 'c1',
  unidad_id: 'u1',
  momento: 'ENTREGA',
  zona: 'Sala',
  creado_en: '2026-10-01T15:00:00.000Z',
  foto_url: 'https://b.test/s/fotos-inventario/c1/1.jpg?token=A',
  ...extra,
});
let lista: FotoInventario[] = [];

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
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
/** El botón vive en la barra fija, no en el contenido que se desplaza (R4-D). */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};
const nativos = (raiz: Raiz, testID: string) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
const elegirZona = (raiz: Raiz, zona: string) =>
  act(async () => porEtiqueta(raiz, zona).props.onPress());

/** Agrega una foto: abre la galería simulada con la zona ya elegida. */
async function agregar(raiz: Raiz, foto: (typeof FOTOS)[number]) {
  mockElegir.mockResolvedValueOnce({ tipo: 'elegida', archivo: foto });
  await pulsar(raiz, 'Elegir de la galería');
}
async function montar(extra: Record<string, string> = {}) {
  mockParams = { id: 'c1', ...extra };
  const r = await renderizarPantalla(<Inventario />);
  await esperar();
  return r;
}

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [mockGet, mockSubir, mockBack, mockReplace, mockElegir]) m.mockReset();
  lista = [];
  mockGet.mockImplementation(async () => lista);
  mockSubir.mockResolvedValue(guardada());
});

describe('Inventario: pantalla', () => {
  it('pide las fotos de ENTREGA por defecto y muestra el título, las zonas y "Terminar"', async () => {
    const { raiz } = await montar();
    expect(mockGet).toHaveBeenCalledWith('/contratos/c1/fotos-inventario?momento=ENTREGA');
    expect(textosDe(raiz)).toContain('Inventario de entrega');
    for (const zona of ['Sala', 'Cocina', 'Baño', 'Habitación', 'Fachada', 'Otra']) {
      expect(porEtiqueta(raiz, zona)).toBeDefined();
    }
    expect(hayBoton(raiz, 'Terminar')).toBe(true);
  });

  it('con momento DEVOLUCION funciona igual (lo usará E5)', async () => {
    const { raiz } = await montar({ momento: 'DEVOLUCION' });
    expect(mockGet).toHaveBeenCalledWith('/contratos/c1/fotos-inventario?momento=DEVOLUCION');
    expect(textosDe(raiz)).toContain('Inventario de devolución');
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Subir fotos');
    expect(mockSubir.mock.calls[0][3]).toEqual({ momento: 'DEVOLUCION', zona: 'Sala' });
  });

  it('muestra las fotos ya subidas por zona, con miniatura', async () => {
    lista = [guardada(), guardada({ id: 'f2', zona: 'Cocina', foto_url: 'https://b.test/2.jpg' })];
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Sala');
    expect(textosDe(raiz)).toContain('Cocina');
    expect(raiz.root.findAllByType(Image)).toHaveLength(2);
  });

  it('si la URL firmada de una foto falla al cargar, refresca la lista UNA vez', async () => {
    lista = [guardada()];
    const { raiz } = await montar();
    const antes = mockGet.mock.calls.length;
    await act(async () => raiz.root.findAllByType(Image)[0].props.onError({}));
    await esperar();
    expect(mockGet.mock.calls.length).toBe(antes + 1);
    await act(async () => raiz.root.findAllByType(Image)[0]?.props.onError?.({}));
    await esperar();
    expect(mockGet.mock.calls.length).toBe(antes + 1);
  });

  it('error al cargar la lista: mensaje y Reintentar', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    );
    await pulsar(raiz, 'Reintentar');
    expect(hayBoton(raiz, 'Terminar')).toBe(true);
  });

  it('R4-D: "Terminar" en la barra fija; con fotos por subir, "Subir fotos" también', async () => {
    const { raiz } = await montar();
    expect(enBarraFija(raiz, 'Terminar')).toBe(true);
    expect(hayBoton(raiz, 'Subir fotos')).toBe(false);
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    expect(enBarraFija(raiz, 'Subir fotos')).toBe(true);
    expect(enBarraFija(raiz, 'Terminar')).toBe(true);
  });

  it('R4-D: las fotos por subir son filas de un mismo contenedor', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await elegirZona(raiz, 'Cocina');
    await agregar(raiz, FOTOS[1]);
    const [cola] = nativos(raiz, 'cola-fotos');
    const etiquetas = cola
      .findAll((n) => typeof n.type === 'string' && n.props.accessibilityLiveRegion === 'polite')
      .map((n) => n.props.accessibilityLabel);
    expect(etiquetas).toEqual(['Sala, pendiente', 'Cocina, pendiente']);
  });

  it('R4-D: las fotos subidas se agrupan por zona, en cuadrícula ampliable', async () => {
    lista = [
      guardada(),
      guardada({ id: 'f2', zona: 'Cocina', foto_url: 'https://b.test/2.jpg' }),
      guardada({ id: 'f3', foto_url: 'https://b.test/3.jpg' }),
    ];
    const { raiz } = await montar();
    const grupos = nativos(raiz, 'grupo-zona').map((g) => ({
      zona: g.props.accessibilityLabel,
      fotos: g.findAllByType(Image).length,
    }));
    expect(grupos).toEqual([
      { zona: 'Sala, 2 fotos', fotos: 2 },
      { zona: 'Cocina, 1 foto', fotos: 1 },
    ]);
    expect(
      raiz.root.findAll(
        (n) =>
          String(n.props.accessibilityLabel ?? '').startsWith('Ampliar Foto de inventario') &&
          typeof n.props.onPress === 'function',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('"Terminar" siempre está disponible y vuelve atrás; sin fotos no pregunta nada', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Terminar');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('Inventario: zona', () => {
  it('agregar una foto sin elegir zona muestra el error y no abre el selector', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Elegir de la galería');
    expect(mockElegir).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Elige la zona de la foto.');
  });

  it('"Otra": campo de texto libre validado (vacío o demasiado largo no sirven)', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Otra');
    expect(campoDe(raiz, 'Nombre de la zona')).toBeDefined();
    await pulsar(raiz, 'Elegir de la galería');
    expect(textosDe(raiz)).toContain('Escribe cuál es la zona.');
    await act(async () => campoDe(raiz, 'Nombre de la zona')?.props.onChangeText('x'.repeat(61)));
    await pulsar(raiz, 'Elegir de la galería');
    expect(textosDe(raiz).join('|')).toContain('hasta 60 caracteres');
    expect(mockElegir).not.toHaveBeenCalled();

    await act(async () => campoDe(raiz, 'Nombre de la zona')?.props.onChangeText(' Terraza '));
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Subir fotos');
    expect(mockSubir.mock.calls[0][3]).toEqual({ momento: 'ENTREGA', zona: 'Terraza' });
  });

  it('cada foto conserva la zona con la que se agregó', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Cocina');
    await agregar(raiz, FOTOS[0]);
    await elegirZona(raiz, 'Baño');
    await agregar(raiz, FOTOS[1]);
    await pulsar(raiz, 'Subir fotos');
    expect(mockSubir.mock.calls.map((c) => c[3].zona)).toEqual(['Cocina', 'Baño']);
  });
});

describe('Inventario: subida', () => {
  it('varias fotos suben UNA A UNA, en orden (la siguiente espera a la anterior)', async () => {
    const resueltas: ((v: unknown) => void)[] = [];
    mockSubir.mockImplementation(() => new Promise((r) => resueltas.push(r)));
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    for (const f of FOTOS) await agregar(raiz, f);

    await pulsar(raiz, 'Subir fotos');
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockSubir.mock.calls[0][2]).toEqual(FOTOS[0]);
    await act(async () => resueltas[0](guardada()));
    await esperar();
    expect(mockSubir).toHaveBeenCalledTimes(2);
    expect(mockSubir.mock.calls[1][2]).toEqual(FOTOS[1]);
    await act(async () => resueltas[1](guardada()));
    await esperar();
    await act(async () => resueltas[2](guardada()));
    await esperar();
    expect(mockSubir).toHaveBeenCalledTimes(3);
  });

  it('usa el cargador con la ruta del contrato (campo "foto") y refresca la lista al terminar', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    const antes = mockGet.mock.calls.length;
    await pulsar(raiz, 'Subir fotos');
    expect(mockSubir).toHaveBeenCalledWith('/contratos/c1/fotos-inventario', 'foto', FOTOS[0], {
      momento: 'ENTREGA',
      zona: 'Sala',
    });
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
  });

  it('doble toque en "Subir fotos": una sola llamada por foto y el botón se bloquea', async () => {
    let terminar!: (v: unknown) => void;
    mockSubir.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Subir fotos');
    const enCurso = botonDe(raiz, 'Subiendo…');
    expect(enCurso.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await act(async () => enCurso.props.onPress());
    await act(async () => enCurso.props.onPress());
    expect(mockSubir).toHaveBeenCalledTimes(1);
    await act(async () => terminar(guardada()));
    await esperar();
  });

  it('si una foto falla, las demás siguen; solo esa se reintenta', async () => {
    mockSubir
      .mockResolvedValueOnce(guardada())
      .mockRejectedValueOnce(
        new ErrorApi({ status: 415, codigo: 'ARCHIVO_CONTENIDO_INVALIDO', mensaje: 'x' }),
      )
      .mockResolvedValueOnce(guardada());
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    for (const f of FOTOS) await agregar(raiz, f);
    await pulsar(raiz, 'Subir fotos');

    expect(mockSubir).toHaveBeenCalledTimes(3);
    expect(textosDe(raiz)).toContain('Esa foto no es válida. Usa una imagen JPG o PNG.');

    mockSubir.mockResolvedValue(guardada());
    await pulsar(raiz, 'Reintentar');
    expect(mockSubir).toHaveBeenCalledTimes(4);
    expect(mockSubir.mock.calls[3][2]).toEqual(FOTOS[1]);
    expect(textosDe(raiz).join('|')).not.toContain('Esa foto no es válida');
  });

  it('413 muestra "demasiado grande" y una foto ilegible pide elegirla de nuevo', async () => {
    mockSubir
      .mockRejectedValueOnce(
        new ErrorApi({ status: 413, codigo: 'CARGA_DEMASIADO_GRANDE', mensaje: '' }),
      )
      .mockRejectedValueOnce(new ErrorArchivo('ilegible'));
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await agregar(raiz, FOTOS[1]);
    await pulsar(raiz, 'Subir fotos');
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('La foto es demasiado grande (máximo 10 MB).');
    expect(todo).toContain('No pudimos leer la foto. Elígela de nuevo.');
  });

  it('el error muestra "Detalle técnico" sin textos del servidor ni código de acceso', async () => {
    mockSubir.mockRejectedValue(new ApiError404());
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Subir fotos');
    const textos = textosDe(raiz);
    expect(textos).toContain('No encontrado. Puede que ya no exista o que no tengas acceso.');
    expect(textos).toContain('Detalle técnico: HTTP 404 · NO_ENCONTRADO');
    expect(textos.join('|')).not.toMatch(/RC-|secreto/);
  });

  it('tiempo agotado: estado "incierta", se recarga la lista y NO se reintenta sola', async () => {
    mockSubir.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    const antes = mockGet.mock.calls.length;
    await pulsar(raiz, 'Subir fotos');
    await esperar();
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
    expect(textosDe(raiz)).toContain('Puede haberse subido; revisa la lista antes de reintentar.');
    expect(mockSubir).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta (cargador nativo): también "incierta"; reintentar queda a elección de la persona', async () => {
    mockSubir.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValue(guardada());
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Subir fotos');
    expect(textosDe(raiz).join('|')).toContain('Puede haberse subido');
    await pulsar(raiz, 'Reintentar');
    expect(mockSubir).toHaveBeenCalledTimes(2);
  });

  it('una foto pendiente se puede quitar antes de subirla', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    expect(hayBoton(raiz, 'Subir fotos')).toBe(true);
    await pulsar(raiz, 'Quitar');
    expect(hayBoton(raiz, 'Subir fotos')).toBe(false);
  });

  it('el selector denegado o cancelado no agrega fotos', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    mockElegir.mockResolvedValueOnce({ tipo: 'cancelada' });
    await pulsar(raiz, 'Elegir de la galería');
    expect(hayBoton(raiz, 'Subir fotos')).toBe(false);
  });

  it('con fotos sin subir, "Terminar" pide confirmación', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    await pulsar(raiz, 'Terminar');
    expect(alerta).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('accesibilidad: cada foto anuncia su estado', async () => {
    const { raiz } = await montar();
    await elegirZona(raiz, 'Sala');
    await agregar(raiz, FOTOS[0]);
    const etiquetas = raiz.root
      .findAll((n) => typeof n.props.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel as string);
    expect(etiquetas.some((e) => e.includes('Sala') && e.includes('pendiente'))).toBe(true);
  });
});

class ApiError404 extends ErrorApi {
  constructor() {
    super({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'secreto RC-AB3D-9KPX' });
  }
}
