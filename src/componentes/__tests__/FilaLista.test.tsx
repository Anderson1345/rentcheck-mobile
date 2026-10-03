import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { coloresEstado, conAlfa } from '../../tema';
import { FilaLista } from '../FilaLista';
import { Icono } from '../iconos/Icono';

function renderizar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = create(elemento);
  });
  return raiz;
}

const estiloDe = (nodo: { props: { style?: unknown } }) =>
  StyleSheet.flatten(nodo.props.style as ViewStyle) ?? {};

/** El separador es la única vista de 1 dp de alto. */
function margenSeparador(raiz: ReactTestRenderer): unknown {
  const separador = raiz.root.findAll((n) => n.type === View && estiloDe(n).height === 1);
  expect(separador).toHaveLength(1);
  return estiloDe(separador[0]).marginLeft;
}

describe('FilaLista', () => {
  it('título y subtítulo no se cortan en una sola línea (hasta 2 líneas)', () => {
    const raiz = renderizar(
      <FilaLista titulo="Hoy en Bogotá" subtitulo="2026-10-01" valor="1 de octubre de 2026" />,
    );
    const textos = raiz.root.findAllByType(Text);
    const titulo = textos.find((t) => t.props.children === 'Hoy en Bogotá');
    const subtitulo = textos.find((t) => t.props.children === '2026-10-01');
    expect(titulo?.props.numberOfLines).toBe(2);
    expect(subtitulo?.props.numberOfLines).toBe(2);
  });

  it('el valor de la derecha no se encoge y se alinea a la derecha', () => {
    const raiz = renderizar(<FilaLista titulo="Título" valor="$ 1.250.000" />);
    const valor = raiz.root.findAllByType(Text).find((t) => t.props.children === '$ 1.250.000');
    const estilo = StyleSheet.flatten(valor?.props.style);
    expect(estilo.flexShrink).toBe(0);
    expect(estilo.textAlign).toBe('right');
  });

  it('el bloque de textos conserva flex 1 y minWidth 0', () => {
    const raiz = renderizar(<FilaLista titulo="Título" subtitulo="Sub" />);
    const bloque = raiz.root.findAll(
      (n) => n.type === View && estiloDe(n).flex === 1 && estiloDe(n).minWidth === 0,
    );
    expect(bloque.length).toBeGreaterThan(0);
  });

  it('el detalle (chip + texto) hace salto de línea en vez de superponerse', () => {
    const raiz = renderizar(
      <FilaLista titulo="Andrés Velásquez" detalle={<Text>chip</Text>} valor="$ 3.200.000" />,
    );
    const envoltorio = raiz.root.findAll((n) => n.type === View && estiloDe(n).flexWrap === 'wrap');
    expect(envoltorio).toHaveLength(1);
  });

  it('el separador usa margen 74 solo con avatar o icono; sin ellos, 16', () => {
    expect(
      margenSeparador(renderizar(<FilaLista titulo="A" separador avatar="Laura Mejía" />)),
    ).toBe(74);
    expect(margenSeparador(renderizar(<FilaLista titulo="A" separador icono="pagos" />))).toBe(74);
    expect(margenSeparador(renderizar(<FilaLista titulo="A" separador />))).toBe(16);
  });
});

describe('FilaLista con tono del icono (alertas)', () => {
  it('con tonoIcono el mosaico y el trazo toman el color del estado', () => {
    const raiz = renderizar(
      <FilaLista titulo="Pago rechazado" icono="rechazar" tonoIcono="peligro" />,
    );
    const icono = raiz.root.findByType(Icono);
    expect(icono.props.color).toBe(coloresEstado.peligro.texto);
    const mosaico = raiz.root.findAll(
      (n) =>
        n.type === View &&
        estiloDe(n).backgroundColor === conAlfa(coloresEstado.peligro.senal, 0.14),
    );
    expect(mosaico).toHaveLength(1);
  });

  it('sin tonoIcono el icono conserva su color por defecto', () => {
    const raiz = renderizar(<FilaLista titulo="Algo" icono="pagos" />);
    expect(raiz.root.findByType(Icono).props.color).toBeUndefined();
  });
});

describe('FilaLista con miniatura (inmuebles)', () => {
  it('muestra la miniatura en lugar del avatar o el icono', () => {
    const raiz = renderizar(<FilaLista titulo="Calle 45" miniatura={<Text>foto</Text>} />);
    expect(raiz.root.findAllByType(Text).some((t) => t.props.children === 'foto')).toBe(true);
  });

  it('el separador deja pasar la miniatura de 56 dp (margen 86)', () => {
    expect(
      margenSeparador(renderizar(<FilaLista titulo="A" separador miniatura={<Text>foto</Text>} />)),
    ).toBe(86);
  });
});
