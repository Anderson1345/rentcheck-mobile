import { Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { botonDe, hayBoton, textosDe } from '../../pruebas/pantallas';
import { OpcionesFoto } from '../inmuebles/OpcionesFoto';

const mockElegir = jest.fn();
jest.mock('../../utilidades/foto', () => ({
  ...jest.requireActual('../../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));
jest.mock('../Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});

const ARCHIVO = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };

async function montar(props: Partial<React.ComponentProps<typeof OpcionesFoto>> = {}) {
  const alElegir = jest.fn();
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = create(<OpcionesFoto onElegida={alElegir} {...props} />);
  });
  return { raiz, alElegir };
}

const pulsar = (raiz: ReactTestRenderer, titulo: string) =>
  act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });

beforeEach(() => {
  mockElegir.mockReset().mockResolvedValue({ tipo: 'elegida', archivo: ARCHIVO });
  jest.restoreAllMocks();
});

describe('OpcionesFoto', () => {
  it('ofrece "Tomar foto" y "Elegir de la galería"', async () => {
    const { raiz } = await montar();
    expect(hayBoton(raiz, 'Tomar foto')).toBe(true);
    expect(hayBoton(raiz, 'Elegir de la galería')).toBe(true);
    expect(hayBoton(raiz, 'Abrir ajustes')).toBe(false);
  });

  it('"Tomar foto" abre la cámara y entrega el archivo elegido', async () => {
    const { raiz, alElegir } = await montar();
    await pulsar(raiz, 'Tomar foto');
    expect(mockElegir).toHaveBeenCalledWith('camara');
    expect(alElegir).toHaveBeenCalledWith(ARCHIVO);
  });

  it('"Elegir de la galería" abre la galería', async () => {
    const { raiz, alElegir } = await montar();
    await pulsar(raiz, 'Elegir de la galería');
    expect(mockElegir).toHaveBeenCalledWith('galeria');
    expect(alElegir).toHaveBeenCalledWith(ARCHIVO);
  });

  it('permiso denegado: explica cómo activarlo, no entrega nada y la pantalla sigue usable', async () => {
    mockElegir.mockResolvedValue({ tipo: 'denegado', definitivo: false });
    const { raiz, alElegir } = await montar();

    await pulsar(raiz, 'Tomar foto');

    expect(textosDe(raiz)).toContain(
      'Para tomar la foto, RentCheck necesita permiso para usar la cámara. También puedes elegir una foto de la galería.',
    );
    expect(alElegir).not.toHaveBeenCalled();
    expect(hayBoton(raiz, 'Abrir ajustes')).toBe(false);

    // Sigue funcionando: la galería elige bien y el mensaje desaparece.
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: ARCHIVO });
    await pulsar(raiz, 'Elegir de la galería');
    expect(alElegir).toHaveBeenCalledWith(ARCHIVO);
    expect(textosDe(raiz).join(' ')).not.toContain('necesita permiso');
  });

  it('permiso denegado para siempre: ofrece abrir los ajustes del teléfono', async () => {
    mockElegir.mockResolvedValue({ tipo: 'denegado', definitivo: true });
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { raiz } = await montar();

    await pulsar(raiz, 'Tomar foto');
    expect(textosDe(raiz)).toContain(
      'El permiso de la cámara está desactivado. Actívalo en los ajustes del teléfono para tomar fotos, o elige una de la galería.',
    );

    await pulsar(raiz, 'Abrir ajustes');
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('cancelada: ni mensaje ni entrega', async () => {
    mockElegir.mockResolvedValue({ tipo: 'cancelada' });
    const { raiz, alElegir } = await montar();
    await pulsar(raiz, 'Tomar foto');
    expect(alElegir).not.toHaveBeenCalled();
    expect(raiz.root.findAll((n) => n.props.accessibilityRole === 'alert')).toHaveLength(0);
  });

  it.each([
    ['formato', 'Esa imagen no es JPG ni PNG. Elige otra foto o tómala con la cámara.'],
    ['grande', 'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.'],
    ['error', 'No pudimos abrir la cámara o la galería. Inténtalo de nuevo.'],
  ])('%s: muestra el mensaje en español', async (tipo, mensaje) => {
    mockElegir.mockResolvedValue({ tipo });
    const { raiz, alElegir } = await montar();
    await pulsar(raiz, 'Elegir de la galería');
    expect(textosDe(raiz)).toContain(mensaje);
    expect(alElegir).not.toHaveBeenCalled();
  });

  it('deshabilitado: los botones no responden', async () => {
    const { raiz } = await montar({ deshabilitado: true });
    expect(botonDe(raiz, 'Tomar foto').props.accessibilityState).toMatchObject({ disabled: true });
    expect(botonDe(raiz, 'Elegir de la galería').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('mientras el selector está abierto no admite un segundo toque', async () => {
    let resolver!: (v: unknown) => void;
    mockElegir.mockReturnValue(new Promise((r) => (resolver = r)));
    const { raiz } = await montar();

    await pulsar(raiz, 'Tomar foto');
    await pulsar(raiz, 'Elegir de la galería');
    expect(mockElegir).toHaveBeenCalledTimes(1);

    await act(async () => resolver({ tipo: 'cancelada' }));
  });
});
