// Detalle del inmueble: datos, unidades en solo lectura ("Por completar"), 404, portada expirada
// y cambio de foto (picker simulado).
import { Image, Linking } from 'react-native';
import { act } from 'react-test-renderer';

import Detalle from '../../app/(arrendador)/inmueble/[id]/index';
import { ErrorApi } from '../api/cliente';
import { inmuebleEjemplo, unidadEjemplo, unidadPrincipalNueva } from '../pruebas/datosInmuebles';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockObtener = jest.fn();
const mockSubirFoto = jest.fn();
const mockElegir = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
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
jest.mock('../api/inmuebles', () => ({
  ...jest.requireActual('../api/inmuebles'),
  obtenerInmueble: (...a: unknown[]) => mockObtener(...a),
  subirFotoPortada: (...a: unknown[]) => mockSubirFoto(...a),
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

const FOTO = { uri: 'file:///cache/nueva.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const pulsar = (raiz: Raiz, titulo: string) =>
  act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
const imagenes = (raiz: Raiz) => raiz.root.findAllByType(Image);

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [mockPush, mockBack, mockReplace, mockObtener, mockSubirFoto, mockElegir]) {
    m.mockReset();
  }
  mockParams = { id: 'i1' };
  mockObtener.mockResolvedValue(inmuebleEjemplo());
});

describe('Detalle del inmueble', () => {
  it('muestra dirección, ciudad, estrato y matrícula, con "Editar" y "Cambiar foto"', async () => {
    const { raiz } = await renderizarPantalla(<Detalle />);
    const textos = textosDe(raiz);

    expect(mockObtener).toHaveBeenCalledWith('i1');
    expect(textos).toContain('Calle 45 # 12-30');
    expect(textos).toContain('Bogotá');
    expect(textos).toContain('Estrato 4');
    expect(textos).toContain('Matrícula inmobiliaria 50C-1234567');
    expect(hayBoton(raiz, 'Editar')).toBe(true);
    expect(hayBoton(raiz, 'Cambiar foto')).toBe(true);
  });

  it('"Editar" abre el formulario de edición de ese inmueble', async () => {
    const { raiz } = await renderizarPantalla(<Detalle />);
    await pulsar(raiz, 'Editar');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]/editar',
      params: { id: 'i1' },
    });
  });

  it('sin estrato (comercial): no escribe "Estrato" vacío', async () => {
    mockObtener.mockResolvedValue(inmuebleEjemplo({ estrato: null }));
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz).some((t) => t.startsWith('Estrato'))).toBe(false);
  });

  it('unidades en solo lectura: nombre, tipo, uso y canon base en pesos', async () => {
    const { raiz } = await renderizarPantalla(<Detalle />);
    const textos = textosDe(raiz);
    expect(textos).toContain('Apto 302');
    expect(textos).toContain('Apartamento · Residencial');
    expect(textos).toContain('$ 1.800.000');
    // Datos completos: ninguna etiqueta "Por completar".
    expect(textos).not.toContain('Por completar');
  });

  it('la unidad principal recién creada (área, habitaciones, baños y ocupantes en null) muestra "Por completar"', async () => {
    mockObtener.mockResolvedValue(
      inmuebleEjemplo({ unidades: [unidadPrincipalNueva(), unidadEjemplo()] }),
    );
    const { raiz } = await renderizarPantalla(<Detalle />);
    const textos = textosDe(raiz);
    expect(textos).toContain('Unidad principal');
    expect(textos.filter((t) => t === 'Por completar')).toHaveLength(1);
  });

  it('basta un solo dato en null para mostrar "Por completar"', async () => {
    mockObtener.mockResolvedValue(
      inmuebleEjemplo({ unidades: [unidadEjemplo({ numero_banos: null })] }),
    );
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz)).toContain('Por completar');
  });

  it('E3-B queda fuera: no hay acciones sobre las unidades', async () => {
    const { raiz } = await renderizarPantalla(<Detalle />);
    const todo = textosDe(raiz).join('|');
    expect(todo).not.toMatch(/Agregar unidad|Nueva unidad|Eliminar|Editar unidad/);
    expect(
      raiz.root.findAll(
        (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Apto 302',
      ),
    ).toHaveLength(0);
  });

  it('sin unidades: lo dice en vez de dejar un hueco', async () => {
    mockObtener.mockResolvedValue(inmuebleEjemplo({ unidades: [] }));
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz)).toContain('Este inmueble aún no tiene unidades.');
  });

  it('404 (inexistente o ajeno): "No encontrado" con botón Volver', async () => {
    mockObtener.mockRejectedValue(
      new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'Not Found' }),
    );
    const { raiz } = await renderizarPantalla(<Detalle />);

    expect(textosDe(raiz)).toContain('No encontrado');
    expect(hayBoton(raiz, 'Editar')).toBe(false);
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('otro error: mensaje por código y Reintentar', async () => {
    mockObtener.mockRejectedValueOnce(
      new ErrorApi({ status: 500, codigo: 'ERROR_INTERNO', mensaje: 'x' }),
    );
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz)).toContain(
      'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.',
    );
    expect(textosDe(raiz)).not.toContain('No encontrado');

    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(textosDe(raiz)).toContain('Calle 45 # 12-30');
  });

  it('tras crear con la foto fallida avisa cómo reintentar', async () => {
    mockParams = { id: 'i1', foto: 'fallida' };
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz)).toContain(
      'Inmueble creado, pero la foto no se pudo subir. Puedes volver a intentarlo con Cambiar foto.',
    );
  });

  it('sin ese parámetro no hay aviso', async () => {
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz).join('|')).not.toContain('la foto no se pudo subir');
  });
});

describe('Detalle: portada con URL firmada que expira', () => {
  it('muestra la portada; si la URL ya expiró, refresca el inmueble y usa la URL nueva (sin cuadro roto)', async () => {
    mockObtener
      .mockResolvedValueOnce(inmuebleEjemplo({ foto_portada_url: 'https://firmada/vencida' }))
      .mockResolvedValue(inmuebleEjemplo({ foto_portada_url: 'https://firmada/nueva' }));
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(imagenes(raiz)[0].props.source).toEqual({ uri: 'https://firmada/vencida' });

    await act(async () => imagenes(raiz)[0].props.onError({}));
    await esperar();

    expect(mockObtener).toHaveBeenCalledTimes(2);
    expect(imagenes(raiz)).toHaveLength(1);
    expect(imagenes(raiz)[0].props.source).toEqual({ uri: 'https://firmada/nueva' });
  });

  it('si el servidor sigue devolviendo una URL que no carga, queda el marcador y no se repite el refresco', async () => {
    mockObtener.mockResolvedValue(inmuebleEjemplo({ foto_portada_url: 'https://firmada/mala' }));
    const { raiz } = await renderizarPantalla(<Detalle />);

    await act(async () => imagenes(raiz)[0].props.onError({}));
    await esperar();
    // El refresco devolvió la misma URL: la imagen no se reintenta en bucle.
    expect(imagenes(raiz)).toHaveLength(0);
    expect(
      raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'portada-marcador'),
    ).toHaveLength(1);
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });
});

describe('Detalle: cambiar la foto de portada', () => {
  it('"Cambiar foto" ofrece cámara y galería; al elegir se sube DE INMEDIATO y se refresca', async () => {
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubirFoto.mockResolvedValue(inmuebleEjemplo({ foto_portada_url: 'https://firmada/nueva' }));
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(hayBoton(raiz, 'Tomar foto')).toBe(false);

    await pulsar(raiz, 'Cambiar foto');
    expect(hayBoton(raiz, 'Tomar foto')).toBe(true);
    expect(hayBoton(raiz, 'Elegir de la galería')).toBe(true);

    await pulsar(raiz, 'Elegir de la galería');
    await esperar();

    expect(mockSubirFoto).toHaveBeenCalledTimes(1);
    expect(mockSubirFoto).toHaveBeenCalledWith('i1', FOTO);
    // El detalle se vuelve a pedir tras subir.
    expect(mockObtener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('mientras sube muestra la vista previa local y "Subiendo foto…"', async () => {
    let terminar!: (v: unknown) => void;
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubirFoto.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Detalle />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Tomar foto');

    expect(imagenes(raiz)[0].props.source).toEqual({ uri: FOTO.uri });
    expect(textosDe(raiz)).toContain('Subiendo foto…');

    await act(async () => terminar(inmuebleEjemplo()));
    await esperar();
    expect(textosDe(raiz)).not.toContain('Subiendo foto…');
  });

  it('si la subida falla muestra el error de la foto y deja reintentar con la misma foto', async () => {
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubirFoto
      .mockRejectedValueOnce(
        new ErrorApi({ status: 415, codigo: 'ERROR_415', mensaje: 'Tipo no permitido' }),
      )
      .mockResolvedValue(inmuebleEjemplo());
    const { raiz } = await renderizarPantalla(<Detalle />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    await esperar();

    expect(textosDe(raiz)).toContain('Esa foto no es válida. Usa una imagen JPG o PNG.');

    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(mockSubirFoto).toHaveBeenCalledTimes(2);
    expect(mockSubirFoto).toHaveBeenLastCalledWith('i1', FOTO);
    expect(textosDe(raiz).join('|')).not.toContain('no es válida');
  });

  it('el aviso de "foto no se pudo subir" desaparece cuando la nueva subida funciona', async () => {
    mockParams = { id: 'i1', foto: 'fallida' };
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubirFoto.mockResolvedValue(inmuebleEjemplo());
    const { raiz } = await renderizarPantalla(<Detalle />);
    expect(textosDe(raiz).join('|')).toContain('la foto no se pudo subir');

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    await esperar();

    expect(textosDe(raiz).join('|')).not.toContain('la foto no se pudo subir');
  });

  it('permiso de cámara denegado: mensaje en español, no sube nada y la pantalla sigue viva', async () => {
    mockElegir.mockResolvedValue({ tipo: 'denegado', definitivo: false });
    const { raiz } = await renderizarPantalla(<Detalle />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Tomar foto');

    expect(textosDe(raiz).join('|')).toContain('necesita permiso para usar la cámara');
    expect(mockSubirFoto).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Calle 45 # 12-30');
    expect(hayBoton(raiz, 'Editar')).toBe(true);
  });

  it('permiso denegado para siempre: ofrece abrir los ajustes', async () => {
    mockElegir.mockResolvedValue({ tipo: 'denegado', definitivo: true });
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { raiz } = await renderizarPantalla(<Detalle />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Tomar foto');
    await pulsar(raiz, 'Abrir ajustes');

    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('cancelar el selector no sube nada ni muestra errores', async () => {
    mockElegir.mockResolvedValue({ tipo: 'cancelada' });
    const { raiz } = await renderizarPantalla(<Detalle />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Tomar foto');

    expect(mockSubirFoto).not.toHaveBeenCalled();
    expect(raiz.root.findAll((n) => n.props.accessibilityRole === 'alert')).toHaveLength(0);
  });
});
