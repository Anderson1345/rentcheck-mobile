// Visor de imágenes (R1): tocar la imagen la abre a pantalla completa; se cierra con el botón, el gesto
// de bajar o el botón atrás del sistema; admite pellizco y doble toque (lo que decide el zoom está en
// utilidades/zoomImagen y se prueba aparte). Solo con piezas de React Native y expo-image.
import { Image } from 'expo-image';
import { Modal, Text, View } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ImagenAmpliable, VisorImagen } from '../VisorImagen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

function renderizar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = create(elemento);
  });
  return raiz;
}

const modal = (raiz: ReactTestRenderer) => raiz.root.findByType(Modal);
const gestos = (raiz: ReactTestRenderer) => raiz.root.findByProps({ testID: 'visor-gestos' });
const hayBoton = (raiz: ReactTestRenderer, titulo: string) =>
  raiz.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.findAll((h) => h.props.children === titulo).length > 0,
  );

const toque = (x: number, y: number) => ({ pageX: x, pageY: y });
const evento = (toques: { pageX: number; pageY: number }[], timestamp: number) => ({
  nativeEvent: { touches: toques, timestamp },
});
const zoomDe = (raiz: ReactTestRenderer) => gestos(raiz).props.accessibilityValue?.text as string;

describe('VisorImagen', () => {
  it('cerrado no muestra nada (la ventana no está visible)', () => {
    const raiz = renderizar(
      <VisorImagen
        visible={false}
        uri="https://b.test/f.jpg"
        descripcion="Foto"
        onCerrar={() => undefined}
      />,
    );
    expect(modal(raiz).props.visible).toBe(false);
  });

  it('abierto muestra la imagen completa (contain) con su descripción y el botón Cerrar', () => {
    const raiz = renderizar(
      <VisorImagen
        visible
        uri="https://b.test/f.jpg"
        descripcion="Foto del inmueble"
        onCerrar={() => undefined}
      />,
    );
    expect(modal(raiz).props.visible).toBe(true);
    const imagen = raiz.root.findByType(Image);
    expect(imagen.props.source).toEqual({ uri: 'https://b.test/f.jpg' });
    expect(imagen.props.contentFit).toBe('contain');
    expect(imagen.props.accessibilityLabel).toBe('Foto del inmueble');
    expect(hayBoton(raiz, 'Cerrar').length).toBeGreaterThan(0);
  });

  it('sin uri no dibuja imagen (no hay cuadro roto)', () => {
    const raiz = renderizar(
      <VisorImagen visible uri={null} descripcion="Foto" onCerrar={() => undefined} />,
    );
    expect(raiz.root.findAllByType(Image)).toHaveLength(0);
  });

  it('el botón Cerrar y el botón atrás del sistema llaman a onCerrar', () => {
    const alCerrar = jest.fn();
    const raiz = renderizar(
      <VisorImagen visible uri="https://b.test/f.jpg" descripcion="Foto" onCerrar={alCerrar} />,
    );
    act(() => hayBoton(raiz, 'Cerrar')[0].props.onPress());
    expect(alCerrar).toHaveBeenCalledTimes(1);
    act(() => modal(raiz).props.onRequestClose());
    expect(alCerrar).toHaveBeenCalledTimes(2);
  });

  it('un error de la imagen avisa a quien lo pidió (para renovar la URL firmada)', () => {
    const alFallar = jest.fn();
    const raiz = renderizar(
      <VisorImagen
        visible
        uri="https://b.test/f.jpg"
        descripcion="Foto"
        onCerrar={() => undefined}
        onError={alFallar}
      />,
    );
    act(() => raiz.root.findByType(Image).props.onError());
    expect(alFallar).toHaveBeenCalledTimes(1);
  });

  it('arrastrar hacia abajo sin zoom cierra', () => {
    const alCerrar = jest.fn();
    const raiz = renderizar(
      <VisorImagen visible uri="https://b.test/f.jpg" descripcion="Foto" onCerrar={alCerrar} />,
    );
    act(() => gestos(raiz).props.onTouchStart(evento([toque(200, 300)], 0)));
    act(() => gestos(raiz).props.onTouchMove(evento([toque(200, 520)], 50)));
    act(() => gestos(raiz).props.onTouchEnd(evento([], 100)));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('un arrastre corto no cierra', () => {
    const alCerrar = jest.fn();
    const raiz = renderizar(
      <VisorImagen visible uri="https://b.test/f.jpg" descripcion="Foto" onCerrar={alCerrar} />,
    );
    act(() => gestos(raiz).props.onTouchStart(evento([toque(200, 300)], 0)));
    act(() => gestos(raiz).props.onTouchMove(evento([toque(200, 340)], 50)));
    act(() => gestos(raiz).props.onTouchEnd(evento([], 100)));
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it('el doble toque acerca y otro doble toque vuelve (el zoom se anuncia al lector de pantalla)', () => {
    const raiz = renderizar(
      <VisorImagen
        visible
        uri="https://b.test/f.jpg"
        descripcion="Foto"
        onCerrar={() => undefined}
      />,
    );
    expect(zoomDe(raiz)).toBe('Zoom 1×');
    const tocar = (t: number) => {
      act(() => gestos(raiz).props.onTouchStart(evento([toque(200, 400)], t)));
      act(() => gestos(raiz).props.onTouchEnd(evento([], t + 50)));
    };
    tocar(1000);
    tocar(1200);
    expect(zoomDe(raiz)).toBe('Zoom 2.5×');
    tocar(5000);
    tocar(5200);
    expect(zoomDe(raiz)).toBe('Zoom 1×');
  });

  it('el pellizco con dos dedos acerca', () => {
    const raiz = renderizar(
      <VisorImagen
        visible
        uri="https://b.test/f.jpg"
        descripcion="Foto"
        onCerrar={() => undefined}
      />,
    );
    act(() => gestos(raiz).props.onTouchStart(evento([toque(150, 400), toque(250, 400)], 0)));
    act(() => gestos(raiz).props.onTouchMove(evento([toque(100, 400), toque(300, 400)], 50)));
    act(() => gestos(raiz).props.onTouchEnd(evento([], 100)));
    expect(zoomDe(raiz)).toBe('Zoom 2×');
  });

  it('al cerrar y volver a abrir empieza sin zoom', () => {
    function Prueba({ visible }: { visible: boolean }) {
      return (
        <VisorImagen
          visible={visible}
          uri="https://b.test/f.jpg"
          descripcion="Foto"
          onCerrar={() => undefined}
        />
      );
    }
    const raiz = renderizar(<Prueba visible />);
    act(() => gestos(raiz).props.onTouchStart(evento([toque(200, 400)], 1000)));
    act(() => gestos(raiz).props.onTouchEnd(evento([], 1050)));
    act(() => gestos(raiz).props.onTouchStart(evento([toque(200, 400)], 1200)));
    act(() => gestos(raiz).props.onTouchEnd(evento([], 1250)));
    expect(zoomDe(raiz)).toBe('Zoom 2.5×');
    act(() => raiz.update(<Prueba visible={false} />));
    act(() => raiz.update(<Prueba visible />));
    expect(zoomDe(raiz)).toBe('Zoom 1×');
  });
});

describe('ImagenAmpliable', () => {
  const miniatura = (
    <View testID="miniatura">
      <Text>Foto chica</Text>
    </View>
  );

  it('tocar la imagen abre el visor; Cerrar lo cierra', () => {
    const raiz = renderizar(
      <ImagenAmpliable uri="https://b.test/f.jpg" descripcion="Foto de la unidad">
        {miniatura}
      </ImagenAmpliable>,
    );
    expect(modal(raiz).props.visible).toBe(false);
    const disparador = raiz.root.findByProps({ accessibilityLabel: 'Ampliar Foto de la unidad' });
    expect(disparador.props.accessibilityRole).toBe('button');
    act(() => disparador.props.onPress());
    expect(modal(raiz).props.visible).toBe(true);
    expect(raiz.root.findByType(Image).props.source).toEqual({ uri: 'https://b.test/f.jpg' });
    act(() => hayBoton(raiz, 'Cerrar')[0].props.onPress());
    expect(modal(raiz).props.visible).toBe(false);
  });

  it('muestra su contenido (la miniatura) tal cual', () => {
    const raiz = renderizar(
      <ImagenAmpliable uri="https://b.test/f.jpg" descripcion="Foto">
        {miniatura}
      </ImagenAmpliable>,
    );
    expect(raiz.root.findAllByProps({ testID: 'miniatura' }).length).toBeGreaterThan(0);
  });

  it('sin uri no se puede ampliar: muestra el contenido sin botón', () => {
    const raiz = renderizar(
      <ImagenAmpliable uri={null} descripcion="Foto">
        {miniatura}
      </ImagenAmpliable>,
    );
    expect(
      raiz.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === 'button'),
    ).toHaveLength(0);
    expect(raiz.root.findAllByType(Modal)).toHaveLength(0);
  });

  it('un error de la imagen ampliada se reenvía a quien la mostró', () => {
    const alFallar = jest.fn();
    const raiz = renderizar(
      <ImagenAmpliable uri="https://b.test/f.jpg" descripcion="Foto" onError={alFallar}>
        {miniatura}
      </ImagenAmpliable>,
    );
    act(() => raiz.root.findByProps({ accessibilityLabel: 'Ampliar Foto' }).props.onPress());
    act(() => raiz.root.findByType(Image).props.onError());
    expect(alFallar).toHaveBeenCalledTimes(1);
  });
});
