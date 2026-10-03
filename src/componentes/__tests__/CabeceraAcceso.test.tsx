import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { colores } from '../../tema';
import { CabeceraAcceso } from '../CabeceraAcceso';

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
const textos = (raiz: ReactTestRenderer) =>
  raiz.root.findAllByType(Text).flatMap((t) => [t.props.children].flat().map(String));
const bloque = (raiz: ReactTestRenderer) =>
  raiz.root
    .findAllByProps({ testID: 'cabecera-acceso' })
    .filter((n) => typeof n.type === 'string')[0];
const estiloDe = (raiz: ReactTestRenderer) =>
  (StyleSheet.flatten(bloque(raiz).props.style) ?? {}) as ViewStyle;
const botonVolver = (raiz: ReactTestRenderer) =>
  raiz.root.findAll(
    (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Volver',
  )[0];

describe('CabeceraAcceso grande', () => {
  it('es un bloque de tinta con radio inferior grande, la marca y la frase', () => {
    const raiz = renderizar(<CabeceraAcceso />);
    const estilo = estiloDe(raiz);
    expect(estilo.backgroundColor).toBe(colores.tinta);
    expect(estilo.borderBottomLeftRadius).toBeGreaterThanOrEqual(24);
    expect(estilo.borderBottomRightRadius).toBe(estilo.borderBottomLeftRadius);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityLabel === 'RentCheck').length,
    ).toBeGreaterThan(0);
    expect(textos(raiz)).toContain('Tus arriendos, claros y al día.');
  });

  it('no se estira: su alto sale del contenido y no ocupa media pantalla', () => {
    const estilo = estiloDe(renderizar(<CabeceraAcceso />));
    expect(estilo.flex).toBeUndefined();
    expect(estilo.flexGrow).toBeUndefined();
    expect(estilo.height).toBeUndefined();
  });

  it('no trae botón de volver', () => {
    expect(botonVolver(renderizar(<CabeceraAcceso />))).toBeUndefined();
  });
});

describe('CabeceraAcceso compacta', () => {
  it('muestra título y subtítulo, y no repite la frase de la marca', () => {
    const raiz = renderizar(
      <CabeceraAcceso variante="compacta" titulo="Crea tu cuenta" subtitulo="Para arrendadores" />,
    );
    expect(textos(raiz)).toEqual(expect.arrayContaining(['Crea tu cuenta', 'Para arrendadores']));
    expect(textos(raiz)).not.toContain('Tus arriendos, claros y al día.');
  });

  it('el botón atrás llama a onVolver y mide al menos 44 dp', () => {
    const alVolver = jest.fn();
    const raiz = renderizar(
      <CabeceraAcceso variante="compacta" titulo="Crea tu cuenta" onVolver={alVolver} />,
    );
    const boton = botonVolver(raiz);
    expect(boton).toBeDefined();
    act(() => boton.props.onPress());
    expect(alVolver).toHaveBeenCalledTimes(1);
    const crudo = boton.props.style as unknown;
    const resuelto = typeof crudo === 'function' ? (crudo as (e: object) => unknown)({}) : crudo;
    const estilo = (StyleSheet.flatten(resuelto as ViewStyle) ?? {}) as ViewStyle;
    expect(Number(estilo.minHeight ?? estilo.height)).toBeGreaterThanOrEqual(44);
  });

  it('sin onVolver no hay botón atrás', () => {
    const raiz = renderizar(<CabeceraAcceso variante="compacta" titulo="Verifica tu correo" />);
    expect(botonVolver(raiz)).toBeUndefined();
  });

  it('también es de tinta con radio inferior grande', () => {
    const estilo = estiloDe(renderizar(<CabeceraAcceso variante="compacta" titulo="X" />));
    expect(estilo.backgroundColor).toBe(colores.tinta);
    expect(estilo.borderBottomLeftRadius).toBeGreaterThanOrEqual(24);
  });

  it('el título es un encabezado accesible', () => {
    const raiz = renderizar(<CabeceraAcceso variante="compacta" titulo="Recupera tu contraseña" />);
    expect(
      raiz.root.findAll(
        (n) =>
          n.props.accessibilityRole === 'header' && n.props.children === 'Recupera tu contraseña',
      ).length,
    ).toBeGreaterThan(0);
  });
});
