// Lista de inmuebles del arrendador: cargando, vacío, error con reintento, con datos y refresco.
import { Image, RefreshControl, ScrollView } from 'react-native';
import { act } from 'react-test-renderer';

import Inmuebles from '../../app/(arrendador)/(pestanas)/inmuebles';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SIN_CONEXION } from '../api/errores';
import { inmuebleEjemplo, unidadEjemplo } from '../pruebas/datosInmuebles';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';

const mockPush = jest.fn();
const mockListar = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
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
  listarInmuebles: (...a: unknown[]) => mockListar(...a),
}));

const estaCargando = (raiz: Awaited<ReturnType<typeof renderizarPantalla>>['raiz']) =>
  raiz.root.findAll(
    (n) => n.props.accessibilityRole === 'progressbar' && n.props.accessibilityLabel === 'Cargando',
  ).length > 0;

beforeEach(() => {
  mockPush.mockReset();
  mockListar.mockReset();
});

describe('Inmuebles (lista)', () => {
  it('cargando: muestra el esqueleto de la lista, no la pantalla vacía', async () => {
    mockListar.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(estaCargando(raiz)).toBe(true);
    expect(textosDe(raiz)).not.toContain('Aún no tienes inmuebles');
  });

  it('vacío: "Aún no tienes inmuebles" y el botón "Agregar inmueble" abre el formulario', async () => {
    mockListar.mockResolvedValue([]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    expect(textosDe(raiz)).toContain('Aún no tienes inmuebles');
    expect(estaCargando(raiz)).toBe(false);
    await act(async () => botonDe(raiz, 'Agregar inmueble').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/inmueble/nuevo');
  });

  it('error: mensaje por código y "Reintentar" vuelve a pedir la lista', async () => {
    mockListar.mockRejectedValueOnce(new ErrorSinConexion());
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);
    expect(textosDe(raiz)).not.toContain('Aún no tienes inmuebles');

    await act(async () => botonDe(raiz, 'Reintentar').props.onPress());
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });

    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(textosDe(raiz)).toContain('Calle 45 # 12-30');
  });

  it('error del servidor con código: usa el mensaje en español de ese código', async () => {
    mockListar.mockRejectedValue(
      new ErrorApi({ status: 403, codigo: 'PROHIBIDO', mensaje: 'Forbidden' }),
    );
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(textosDe(raiz)).toContain('No tienes permiso para hacer esto.');
  });

  it('con datos: dirección, ciudad y cantidad de unidades; abre el detalle al tocar', async () => {
    mockListar.mockResolvedValue([
      inmuebleEjemplo({ unidades: [unidadEjemplo(), unidadEjemplo({ id: 'u2' })] }),
      inmuebleEjemplo({
        id: 'i2',
        direccion: 'Carrera 7 # 80-12',
        ciudad: 'Medellín',
        unidades: [unidadEjemplo()],
      }),
    ]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    const textos = textosDe(raiz);
    expect(textos).toContain('Calle 45 # 12-30');
    expect(textos).toContain('Bogotá · 2 unidades');
    expect(textos).toContain('Carrera 7 # 80-12');
    expect(textos).toContain('Medellín · 1 unidad');

    await act(async () => botonDe(raiz, 'Carrera 7 # 80-12').props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/inmueble/[id]', params: { id: 'i2' } });
  });

  it('la lista no trae ocupación: no se inventa Libre/Ocupada', async () => {
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const todo = textosDe(raiz).join(' ');
    expect(todo).not.toMatch(/Libre|Ocupada/);
  });

  it('con datos hay un botón para agregar otro inmueble', async () => {
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const agregar = raiz.root.find(
      (n) => n.props.accessibilityLabel === 'Agregar inmueble' && !!n.props.onPress,
    );
    await act(async () => agregar.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/inmueble/nuevo');
  });

  it('muestra la portada con su URL firmada y, sin portada, el marcador', async () => {
    mockListar.mockResolvedValue([
      inmuebleEjemplo({ foto_portada_url: 'https://firmada/portada' }),
      inmuebleEjemplo({ id: 'i2', direccion: 'Sin foto', foto_portada_url: null }),
    ]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const imagenes = raiz.root.findAllByType(Image);
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0].props.source).toEqual({ uri: 'https://firmada/portada' });
    expect(
      raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'portada-marcador'),
    ).toHaveLength(1);
  });

  it('arrastrar para refrescar vuelve a pedir la lista', async () => {
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(mockListar).toHaveBeenCalledTimes(1);

    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    expect(control.type).toBe(RefreshControl);
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockListar).toHaveBeenCalledTimes(2);
  });

  it('con la lista vacía también se puede arrastrar para refrescar', async () => {
    mockListar.mockResolvedValue([]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(hayBoton(raiz, 'Agregar inmueble')).toBe(true);
  });
});
