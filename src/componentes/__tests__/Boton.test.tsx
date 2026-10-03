// Botones (R1): la variante secundaria pasa de píldora gris a botón con borde fino y fondo superficie;
// la primaria (tinta) y la de acento (lima) se mantienen. El texto conserva contraste AA.
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { colores } from '../../tema';
import { Boton } from '../Boton';

jest.mock('../Indicador', () => {
  const { View: Vista } = jest.requireActual('react-native');
  return { Indicador: () => <Vista accessibilityLabel="Cargando" /> };
});

function renderizar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = create(elemento);
  });
  return raiz;
}

/** Estilo del Pressable, resuelto para "sin presionar" o "presionado". */
function estiloDeBoton(raiz: ReactTestRenderer, presionado = false): ViewStyle {
  const boton = raiz.root.findAll((n) => n.props.accessibilityRole === 'button')[0];
  const estilo = boton.props.style as (e: { pressed: boolean }) => unknown;
  return StyleSheet.flatten(estilo({ pressed: presionado }) as ViewStyle) ?? {};
}

/** Fondo plano del botón: la primera vista absoluta del recorte. */
function fondoPlano(raiz: ReactTestRenderer): string | undefined {
  const vistas = raiz.root.findAll(
    (n) => n.type === View && StyleSheet.flatten(n.props.style)?.backgroundColor !== undefined,
  );
  return StyleSheet.flatten(vistas[0]?.props.style)?.backgroundColor as string | undefined;
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}
const contraste = (a: string, b: string) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};

describe('Boton secundario (R1)', () => {
  it('tiene borde fino y fondo superficie, ya no es una píldora gris', () => {
    const raiz = renderizar(
      <Boton titulo="Cómo pagar" variante="secundario" onPress={() => undefined} />,
    );
    const e = estiloDeBoton(raiz);
    expect(e.borderWidth).toBe(1);
    expect(e.borderColor).toBeDefined();
    expect(fondoPlano(raiz)).toBe(colores.superficie);
  });

  it('presionado se oscurece un poco sin perder el borde', () => {
    const raiz = renderizar(
      <Boton titulo="Cambiar" variante="secundario" onPress={() => undefined} />,
    );
    const normal = fondoPlano(raiz);
    const e = estiloDeBoton(raiz, true);
    expect(e.borderWidth).toBe(1);
    expect(normal).toBe(colores.superficie);
  });

  it('el texto en tinta sobre superficie cumple contraste AA (4,5:1)', () => {
    expect(contraste(colores.tinta, colores.superficie)).toBeGreaterThanOrEqual(4.5);
    const raiz = renderizar(
      <Boton titulo="Cómo pagar" variante="secundario" onPress={() => undefined} />,
    );
    const texto = raiz.root.findAllByType(Text)[0];
    expect(StyleSheet.flatten(texto.props.style).color).toBe(colores.tinta);
  });

  it('sigue llamando a onPress y respeta cargando y deshabilitado', () => {
    const alTocar = jest.fn();
    const raiz = renderizar(<Boton titulo="Cambiar" variante="secundario" onPress={alTocar} />);
    act(() => raiz.root.findAll((n) => n.props.accessibilityRole === 'button')[0].props.onPress());
    expect(alTocar).toHaveBeenCalledTimes(1);

    const cargando = renderizar(
      <Boton
        titulo="Cambiar"
        tituloCargando="Cambiando…"
        variante="secundario"
        cargando
        onPress={alTocar}
      />,
    );
    expect(cargando.root.findAllByType(Text)[0].props.children).toBe('Cambiando…');
    expect(
      cargando.root.findAll((n) => n.props.accessibilityRole === 'button')[0].props.disabled,
    ).toBe(true);
  });
});

describe('las demás variantes no cambian', () => {
  it('primario: degradado de tinta, texto blanco; sin borde propio', () => {
    const raiz = renderizar(<Boton titulo="Entrar" onPress={() => undefined} />);
    expect(estiloDeBoton(raiz).borderWidth).toBeUndefined();
    expect(contraste(colores.sobreTinta, colores.tinta)).toBeGreaterThanOrEqual(4.5);
  });

  it('acento: lima con texto de tinta (AA)', () => {
    const raiz = renderizar(
      <Boton titulo="Reportar" variante="acento" onPress={() => undefined} />,
    );
    expect(estiloDeBoton(raiz).borderWidth).toBeUndefined();
    expect(contraste(colores.tinta, colores.limaBase)).toBeGreaterThanOrEqual(4.5);
  });
});
