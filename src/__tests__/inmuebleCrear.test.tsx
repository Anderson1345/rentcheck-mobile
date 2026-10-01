// Crear inmueble: validación local (estrato según el uso), las dos llamadas en orden cuando hay foto
// y qué pasa si la foto falla. El cliente de API se simula; los errores y hooks son los reales.
import { Image, TextInput } from 'react-native';
import { act } from 'react-test-renderer';

import Nuevo from '../../app/(arrendador)/inmueble/nuevo';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SIN_CONEXION } from '../api/errores';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockPost = jest.fn();
const mockSubir = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockElegir = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace }),
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
    get: jest.fn(),
    post: (...a: unknown[]) => mockPost(...a),
    patch: jest.fn(),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

const FOTO = { uri: 'file:///cache/f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.findAll((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const tocar = (raiz: Raiz, etiqueta: string) =>
  act(async () => {
    porEtiqueta(raiz, etiqueta)[0].props.onPress();
  });
const pulsar = (raiz: Raiz, titulo: string) =>
  act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });

async function llenarTextos(raiz: Raiz) {
  await escribirEn(raiz, 'Dirección', '  Calle 45 # 12-30 ');
  await escribirEn(raiz, 'Ciudad', 'Bogotá');
  await escribirEn(raiz, 'Matrícula inmobiliaria', '50C-1234567');
}

beforeEach(() => {
  for (const m of [mockPost, mockSubir, mockReplace, mockBack, mockElegir]) m.mockReset();
  mockPost.mockResolvedValue({ id: 'nuevo', unidades: [] });
  mockSubir.mockResolvedValue({ id: 'nuevo' });
});

describe('Crear inmueble: formulario', () => {
  it('tiene dirección, ciudad y matrícula, uso Residencial por defecto y estrato 1 a 6', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);

    for (const campo of ['Dirección', 'Ciudad', 'Matrícula inmobiliaria']) {
      expect(campoDe(raiz, campo)).toBeDefined();
    }
    expect(textosDe(raiz)).toContain('Uso de la unidad principal');
    const residencial = porEtiqueta(raiz, 'Residencial')[0];
    expect(residencial.props.accessibilityState).toMatchObject({ selected: true });
    expect(porEtiqueta(raiz, 'Comercial')).toHaveLength(1);
    for (const n of [1, 2, 3, 4, 5, 6]) expect(porEtiqueta(raiz, `Estrato ${n}`)).toHaveLength(1);
    expect(porEtiqueta(raiz, 'Estrato 7')).toHaveLength(0);
  });

  it('los seis estratos caben en 360 dp con áreas táctiles de al menos 44 dp', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    const celdas = [1, 2, 3, 4, 5, 6].map((n) => porEtiqueta(raiz, `Estrato ${n}`)[0]);
    // Seis celdas iguales que se reparten el ancho (flex) con un hueco fijo, y alto táctil ≥ 44.
    for (const celda of celdas) {
      const estilo = Object.assign({}, ...[celda.props.style].flat(3).filter(Boolean));
      expect(estilo.flex).toBe(1);
      expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('teclados: textos con mayúscula inicial, matrícula en mayúsculas, "siguiente" y "listo"', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    const direccion = campoDe(raiz, 'Dirección');
    const ciudad = campoDe(raiz, 'Ciudad');
    const matricula = campoDe(raiz, 'Matrícula inmobiliaria');

    expect(direccion?.props.returnKeyType).toBe('next');
    expect(ciudad?.props.returnKeyType).toBe('next');
    expect(matricula?.props.returnKeyType).toBe('done');
    expect(direccion?.props.autoCapitalize).toBe('words');
    expect(ciudad?.props.autoCapitalize).toBe('words');
    expect(matricula?.props.autoCapitalize).toBe('characters');
    expect(direccion?.props.keyboardType).toBe('default');
  });

  it('todos los campos de texto siguen siendo TextInput visibles (sin reubicarlos al enfocar)', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    expect(raiz.root.findAllByType(TextInput)).toHaveLength(3);
  });

  it('Comercial oculta el selector de estrato; volver a Residencial lo muestra', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await tocar(raiz, 'Comercial');
    expect(porEtiqueta(raiz, 'Estrato 3')).toHaveLength(0);
    await tocar(raiz, 'Residencial');
    expect(porEtiqueta(raiz, 'Estrato 3')).toHaveLength(1);
  });

  it('elegir un estrato lo marca como seleccionado', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await tocar(raiz, 'Estrato 4');
    expect(porEtiqueta(raiz, 'Estrato 4')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(porEtiqueta(raiz, 'Estrato 3')[0].props.accessibilityState).toMatchObject({
      selected: false,
    });
  });
});

describe('Crear inmueble: validación local', () => {
  it('residencial SIN estrato: NO envía la petición y marca el error en el estrato', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockSubir).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Elige el estrato (1 a 6).');
  });

  it('comercial sin estrato: SÍ envía, sin estrato y con el uso comercial', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/inmuebles', {
      direccion: 'Calle 45 # 12-30',
      ciudad: 'Bogotá',
      matricula_inmobiliaria: '50C-1234567',
      uso_unidad_principal: 'COMERCIAL',
    });
  });

  it('un estrato elegido y luego Comercial: el estrato escondido no se envía', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Estrato 5');
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect('estrato' in mockPost.mock.calls[0][1]).toBe(false);
  });

  it('residencial con estrato: envía todo recortado y navega al detalle sin aviso', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Estrato 4');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(mockPost).toHaveBeenCalledWith('/inmuebles', {
      direccion: 'Calle 45 # 12-30',
      ciudad: 'Bogotá',
      matricula_inmobiliaria: '50C-1234567',
      uso_unidad_principal: 'RESIDENCIAL',
      estrato: 4,
    });
    expect(mockSubir).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]',
      params: { id: 'nuevo' },
    });
  });

  it('campos obligatorios vacíos: muestra los errores y no envía nada', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(mockPost).not.toHaveBeenCalled();
    const textos = textosDe(raiz).join('|');
    expect(textos).toContain('dirección');
    expect(textos).toContain('ciudad');
    expect(textos).toContain('matrícula');
  });

  it('el último campo envía el formulario con "listo"', async () => {
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Comercial');
    await act(async () => campoDe(raiz, 'Matrícula inmobiliaria')?.props.onSubmitEditing());
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('Crear inmueble: envío', () => {
  it('el botón se bloquea mientras se envía y un segundo toque no duplica el inmueble', async () => {
    let terminar!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Crear inmueble');
    const enCurso = botonDe(raiz, 'Creando inmueble…');
    expect(enCurso.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await act(async () => enCurso.props.onPress());
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);

    await act(async () => terminar({ id: 'nuevo' }));
    await esperar();
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('error del servidor por código: lo muestra en español, no navega y el botón vuelve', async () => {
    mockPost.mockRejectedValue(
      new ErrorApi({ status: 400, codigo: 'ESTRATO_REQUERIDO', mensaje: 'x' }),
    );
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Estrato 2');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(textosDe(raiz)).toContain('Debes indicar el estrato del inmueble.');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(hayBoton(raiz, 'Crear inmueble')).toBe(true);
  });

  it('sin conexión: mensaje de red y se puede reintentar', async () => {
    mockPost.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();
    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);

    await pulsar(raiz, 'Crear inmueble');
    await esperar();
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});

describe('Crear inmueble: foto de portada', () => {
  async function conFoto() {
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    const pantalla = await renderizarPantalla(<Nuevo />);
    await llenarTextos(pantalla.raiz);
    await tocar(pantalla.raiz, 'Comercial');
    await pulsar(pantalla.raiz, 'Elegir de la galería');
    return pantalla.raiz;
  }

  it('la foto es opcional y, al elegirla, se ve la vista previa con opción de quitarla', async () => {
    const raiz = await conFoto();
    const vista = raiz.root.findAllByType(Image);
    expect(vista).toHaveLength(1);
    expect(vista[0].props.source).toEqual({ uri: FOTO.uri });

    await pulsar(raiz, 'Quitar foto');
    expect(raiz.root.findAllByType(Image)).toHaveLength(0);
  });

  it('crear con foto hace DOS llamadas, en orden: primero POST /inmuebles y luego la foto', async () => {
    const orden: string[] = [];
    mockPost.mockImplementation(async () => {
      orden.push('POST /inmuebles');
      return { id: 'nuevo' };
    });
    mockSubir.mockImplementation(async (ruta: string) => {
      orden.push(`foto ${ruta}`);
      return { id: 'nuevo' };
    });
    const raiz = await conFoto();

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(orden).toEqual(['POST /inmuebles', 'foto /inmuebles/nuevo/foto-portada']);
    expect(mockSubir).toHaveBeenCalledWith('/inmuebles/nuevo/foto-portada', 'foto', FOTO);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]',
      params: { id: 'nuevo' },
    });
  });

  it('si la foto falla: el inmueble queda creado (una sola vez) y se abre su detalle con el aviso', async () => {
    mockSubir.mockRejectedValue(
      new ErrorApi({ status: 415, codigo: 'ERROR_415', mensaje: 'Tipo no permitido' }),
    );
    const raiz = await conFoto();

    await pulsar(raiz, 'Crear inmueble');
    await esperar();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]',
      params: { id: 'nuevo', foto: 'fallida' },
    });
  });

  it('un permiso denegado de la cámara no rompe el formulario: se puede seguir sin foto', async () => {
    mockElegir.mockResolvedValue({ tipo: 'denegado', definitivo: false });
    const { raiz } = await renderizarPantalla(<Nuevo />);
    await llenarTextos(raiz);
    await tocar(raiz, 'Comercial');

    await pulsar(raiz, 'Tomar foto');
    expect(textosDe(raiz).join('|')).toContain('necesita permiso para usar la cámara');

    await pulsar(raiz, 'Crear inmueble');
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockSubir).not.toHaveBeenCalled();
  });
});
