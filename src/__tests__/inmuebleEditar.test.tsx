// Editar inmueble: valores actuales, solo se envía lo que cambió y errores del servidor por código.
import { act } from 'react-test-renderer';

import Editar from '../../app/(arrendador)/inmueble/[id]/editar';
import { ErrorApi } from '../api/cliente';
import { inmuebleEjemplo } from '../pruebas/datosInmuebles';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({ id: 'i1' }),
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
    post: jest.fn(),
    patch: (...a: unknown[]) => mockPatch(...a),
    subirArchivo: jest.fn(),
  },
}));

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
const guardar = async (raiz: Raiz) => {
  await act(async () => botonDe(raiz, 'Guardar cambios').props.onPress());
  await esperar();
};

beforeEach(() => {
  for (const m of [mockGet, mockPatch, mockBack, mockReplace]) m.mockReset();
  mockGet.mockResolvedValue(inmuebleEjemplo());
  mockPatch.mockResolvedValue(inmuebleEjemplo());
});

describe('Editar inmueble', () => {
  it('trae los valores actuales y NO ofrece cambiar el uso de la unidad principal', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);

    expect(mockGet).toHaveBeenCalledWith('/inmuebles/i1');
    expect(campoDe(raiz, 'Dirección')?.props.value).toBe('Calle 45 # 12-30');
    expect(campoDe(raiz, 'Ciudad')?.props.value).toBe('Bogotá');
    expect(campoDe(raiz, 'Matrícula inmobiliaria')?.props.value).toBe('50C-1234567');
    expect(porEtiqueta(raiz, 'Estrato 4')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(textosDe(raiz)).not.toContain('Uso de la unidad principal');
    expect(porEtiqueta(raiz, 'Comercial')).toHaveLength(0);
  });

  it('solo envía el campo que cambió', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await escribirEn(raiz, 'Ciudad', '  Cali ');

    await guardar(raiz);

    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1', { ciudad: 'Cali' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('cambiar el estrato envía solo el estrato', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await tocar(raiz, 'Estrato 6');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1', { estrato: 6 });
  });

  it('sin cambios no envía nada y lo avisa', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('un campo obligatorio vaciado se rechaza localmente', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await escribirEn(raiz, 'Dirección', '   ');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz).join('|')).toContain('dirección');
  });

  it('"Quitar estrato" envía null y, si el servidor lo rechaza por código, muestra el mensaje', async () => {
    mockPatch.mockRejectedValue(
      new ErrorApi({ status: 400, codigo: 'ESTRATO_REQUERIDO', mensaje: 'x' }),
    );
    const { raiz } = await renderizarPantalla(<Editar />);

    await act(async () => botonDe(raiz, 'Quitar estrato').props.onPress());
    await guardar(raiz);

    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1', { estrato: null });
    expect(textosDe(raiz)).toContain('Debes indicar el estrato del inmueble.');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('un 409 solo con texto: muestra el mensaje en español del servidor', async () => {
    mockPatch.mockRejectedValue(
      new ErrorApi({
        status: 409,
        codigo: 'CONFLICTO',
        mensaje: 'No se puede quitar el estrato: hay unidades residenciales.',
      }),
    );
    const { raiz } = await renderizarPantalla(<Editar />);
    await tocar(raiz, 'Estrato 2');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('No se puede quitar el estrato: hay unidades residenciales.');
  });

  it('sin estrato todavía no ofrece "Quitar estrato"', async () => {
    mockGet.mockResolvedValue(inmuebleEjemplo({ estrato: null }));
    const { raiz } = await renderizarPantalla(<Editar />);
    expect(hayBoton(raiz, 'Quitar estrato')).toBe(false);
  });

  it('inmueble inexistente o ajeno: "No encontrado" y volver', async () => {
    mockGet.mockRejectedValue(
      new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'Not Found' }),
    );
    const { raiz } = await renderizarPantalla(<Editar />);
    expect(textosDe(raiz)).toContain('No encontrado');
    await act(async () => botonDe(raiz, 'Volver').props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('el botón se bloquea mientras guarda', async () => {
    let terminar!: (v: unknown) => void;
    mockPatch.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Editar />);
    await escribirEn(raiz, 'Ciudad', 'Cali');

    await act(async () => botonDe(raiz, 'Guardar cambios').props.onPress());
    const enCurso = botonDe(raiz, 'Guardando…');
    expect(enCurso.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await act(async () => enCurso.props.onPress());
    expect(mockPatch).toHaveBeenCalledTimes(1);

    await act(async () => terminar(inmuebleEjemplo()));
    await esperar();
  });
});

/** R4-E: el botón vive en la barra fija, no en el contenido que se desplaza. */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};
const encabezadosDe = (raiz: Raiz) =>
  raiz.root
    .findAll((n) => n.props.accessibilityRole === 'header' && typeof n.props.children === 'string')
    .map((n) => n.props.children as string);

describe('Editar inmueble: rediseño (R4-E)', () => {
  it('secciones con encabezado y "Guardar cambios" en la barra fija', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await esperar();
    expect(encabezadosDe(raiz)).toEqual(expect.arrayContaining(['Datos del inmueble', 'Estrato']));
    expect(enBarraFija(raiz, 'Guardar cambios')).toBe(true);
  });

  it('sin cambios: no llama al servidor', async () => {
    const { raiz } = await renderizarPantalla(<Editar />);
    await esperar();
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });
});
