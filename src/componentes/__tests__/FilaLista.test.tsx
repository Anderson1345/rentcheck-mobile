import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { colores, coloresEstado, conAlfa } from '../../tema';
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

describe('FilaLista con texto de estado bajo el valor (R1)', () => {
  it('muestra el valor a la derecha y, debajo, un texto de estado con el color del tono', () => {
    const raiz = renderizar(
      <FilaLista
        titulo="Apto 101"
        valor="$ 800.000"
        valorSecundario="Pagado"
        tonoValorSecundario="exito"
      />,
    );
    const textos = raiz.root.findAllByType(Text).map((t) => t.props.children);
    expect(textos).toEqual(['Apto 101', '$ 800.000', 'Pagado']);
    const estado = raiz.root.findAllByType(Text).find((t) => t.props.children === 'Pagado');
    expect(StyleSheet.flatten(estado?.props.style).color).toBe(coloresEstado.exito.texto);
    // Va debajo del valor, en la misma columna de la derecha.
    const valor = raiz.root.findAllByType(Text).find((t) => t.props.children === '$ 800.000');
    expect(estado?.parent?.parent).toBe(valor?.parent?.parent);
  });

  it('sin tono el texto de estado queda en el gris secundario', () => {
    const raiz = renderizar(<FilaLista titulo="A" valor="$ 1" valorSecundario="Pendiente" />);
    const estado = raiz.root.findAllByType(Text).find((t) => t.props.children === 'Pendiente');
    expect(StyleSheet.flatten(estado?.props.style).color).toBe(colores.textoSecundario);
  });

  it('sin valor secundario la fila se ve como siempre', () => {
    const raiz = renderizar(<FilaLista titulo="A" valor="$ 1" />);
    expect(raiz.root.findAllByType(Text).map((t) => t.props.children)).toEqual(['A', '$ 1']);
  });

  it('la descripción secundaria admite hasta 2 líneas y el icono tonal las 6 familias de tono', () => {
    const raiz = renderizar(
      <FilaLista
        titulo="Pago aprobado"
        subtitulo="Tu pago de octubre fue aprobado por tu arrendador."
        icono="aprobar"
        tonoIcono="exito"
      />,
    );
    const descripcion = raiz.root
      .findAllByType(Text)
      .find((t) => String(t.props.children).startsWith('Tu pago'));
    expect(descripcion?.props.numberOfLines).toBe(2);
    for (const tono of [
      'exito',
      'advertencia',
      'peligro',
      'informacion',
      'programado',
      'neutro',
    ] as const) {
      const fila = renderizar(<FilaLista titulo="T" icono="alerta" tonoIcono={tono} />);
      expect(fila.root.findByType(Icono).props.color).toBe(coloresEstado[tono].texto);
    }
  });

  it('el separador con sangría reemplaza a la tarjeta por fila: una línea de 1 dp con margen', () => {
    const raiz = renderizar(<FilaLista titulo="B" icono="pagos" separador />);
    const linea = raiz.root.findAll((n) => n.type === View && estiloDe(n).height === 1);
    expect(linea).toHaveLength(1);
    expect(estiloDe(linea[0]).marginLeft).toBe(74);
  });
});
