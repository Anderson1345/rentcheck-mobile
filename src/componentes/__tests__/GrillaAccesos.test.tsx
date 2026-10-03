import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { colores } from '../../tema';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { GrillaAccesos, type Acceso } from '../GrillaAccesos';
import { Icono } from '../iconos/Icono';

function renderizar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = create(elemento);
  });
  return raiz;
}
type EstiloPlano = ViewStyle & TextStyle;
const estilo = (nodo: ReactTestInstance): EstiloPlano => {
  const crudo = nodo.props.style as unknown;
  const resuelto =
    typeof crudo === 'function'
      ? (crudo as (e: { pressed: boolean }) => unknown)({ pressed: false })
      : crudo;
  return (StyleSheet.flatten(resuelto as ViewStyle) ?? {}) as EstiloPlano;
};
const acceso = (clave: string, extra: Partial<Acceso> = {}): Acceso => ({
  clave,
  etiqueta: `Acceso ${clave}`,
  icono: 'documento',
  onPress: jest.fn(),
  ...extra,
});
const boton = (raiz: ReactTestRenderer, etiqueta: string) =>
  raiz.root.findAll(
    (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === etiqueta,
  )[0];
// Solo los nodos nativos: el componente View y su vista nativa comparten las mismas props.
const mosaicos = (raiz: ReactTestRenderer) =>
  raiz.root.findAllByProps({ testID: 'acceso-mosaico' }).filter((n) => typeof n.type === 'string');

describe('GrillaAccesos', () => {
  it('muestra cada acceso con su etiqueta debajo del icono', () => {
    const raiz = renderizar(<GrillaAccesos accesos={[acceso('a'), acceso('b'), acceso('c')]} />);
    const etiquetas = raiz.root.findAllByType(Text).map((t) => t.props.children);
    expect(etiquetas).toEqual(['Acceso a', 'Acceso b', 'Acceso c']);
    expect(raiz.root.findAllByType(Icono)).toHaveLength(3);
  });

  it('tocar un acceso llama a su acción y solo a la suya', () => {
    const a = acceso('a');
    const b = acceso('b');
    const raiz = renderizar(<GrillaAccesos accesos={[a, b]} />);
    act(() => boton(raiz, 'Acceso b').props.onPress());
    expect(b.onPress).toHaveBeenCalledTimes(1);
    expect(a.onPress).not.toHaveBeenCalled();
  });

  it('por defecto 4 por fila; con columnas=3, 3 por fila', () => {
    const cuatro = renderizar(<GrillaAccesos accesos={[acceso('a'), acceso('b')]} />);
    expect(estilo(boton(cuatro, 'Acceso a')).width).toBe('25%');
    const tres = renderizar(<GrillaAccesos accesos={[acceso('a')]} columnas={3} />);
    expect(parseFloat(String(estilo(boton(tres, 'Acceso a')).width))).toBeCloseTo(33.333, 2);
  });

  it('más accesos que columnas pasan a la fila siguiente', () => {
    const raiz = renderizar(
      <GrillaAccesos accesos={['a', 'b', 'c', 'd', 'e'].map((c) => acceso(c))} />,
    );
    const contenedor = boton(raiz, 'Acceso a').parent as ReactTestInstance;
    expect(estilo(contenedor).flexDirection).toBe('row');
    expect(estilo(contenedor).flexWrap).toBe('wrap');
  });

  it('el mosaico mide 56 dp con radio 18; el normal es blanco con el icono en tinta', () => {
    const raiz = renderizar(<GrillaAccesos accesos={[acceso('a')]} />);
    const m = estilo(mosaicos(raiz)[0]);
    expect(m.width).toBe(56);
    expect(m.height).toBe(56);
    expect(m.borderRadius).toBe(18);
    expect(m.backgroundColor).toBe(colores.superficie);
    expect(raiz.root.findByType(Icono).props.color).toBe(colores.tinta);
  });

  it('el acceso destacado va en tinta con el icono lima', () => {
    const raiz = renderizar(
      <GrillaAccesos accesos={[acceso('a', { destacado: true }), acceso('b')]} />,
    );
    const [destacado, normal] = mosaicos(raiz).map(estilo);
    expect(destacado.backgroundColor).toBe(colores.tinta);
    expect(normal.backgroundColor).toBe(colores.superficie);
    const iconos = raiz.root.findAllByType(Icono);
    expect(iconos[0].props.color).toBe(colores.lima);
    expect(iconos[1].props.color).toBe(colores.tinta);
  });

  it('un acceso deshabilitado no actúa y lo anuncia', () => {
    const a = acceso('a', { deshabilitado: true });
    const raiz = renderizar(<GrillaAccesos accesos={[a]} />);
    const b = boton(raiz, 'Acceso a');
    expect(b.props.accessibilityState).toMatchObject({ disabled: true });
    expect(b.props.disabled).toBe(true);
  });

  it('objetivo táctil de al menos 44 dp y etiquetas de hasta 2 líneas', () => {
    const raiz = renderizar(<GrillaAccesos accesos={[acceso('a')]} />);
    expect(estilo(boton(raiz, 'Acceso a')).minHeight).toBeGreaterThanOrEqual(44);
    expect(raiz.root.findAllByType(Text)[0].props.numberOfLines).toBe(2);
  });

  it('sin accesos no dibuja nada', () => {
    const raiz = renderizar(<GrillaAccesos accesos={[]} />);
    expect(mosaicos(raiz)).toHaveLength(0);
  });
});

describe('EncabezadoSeccion', () => {
  it('título de sección como encabezado accesible (18 sp extranegrita)', () => {
    const raiz = renderizar(<EncabezadoSeccion titulo="Solicitudes" />);
    const titulo = raiz.root.findByType(Text);
    expect(titulo.props.children).toBe('Solicitudes');
    expect(titulo.props.accessibilityRole).toBe('header');
    expect(estilo(titulo).fontSize).toBe(18);
    expect(estilo(titulo).fontFamily).toMatch(/800|ExtraBold/i);
  });

  it('sin enlace no hay botón', () => {
    const raiz = renderizar(<EncabezadoSeccion titulo="Solicitudes" />);
    expect(raiz.root.findAll((n) => n.props.accessibilityRole === 'link')).toHaveLength(0);
  });

  it('el enlace de la derecha ("Ver todas") es un enlace tocable de al menos 44 dp', () => {
    const alTocar = jest.fn();
    const raiz = renderizar(
      <EncabezadoSeccion
        titulo="Solicitudes"
        enlace={{ etiqueta: 'Ver todas', onPress: alTocar }}
      />,
    );
    const enlace = raiz.root.findAll((n) => n.props.accessibilityRole === 'link')[0];
    expect(enlace.props.accessibilityLabel).toBe('Ver todas');
    expect(estilo(enlace).minHeight).toBeGreaterThanOrEqual(44);
    act(() => enlace.props.onPress());
    expect(alTocar).toHaveBeenCalledTimes(1);
    const textos = raiz.root.findAllByType(Text).map((t) => t.props.children);
    expect(textos).toEqual(['Solicitudes', 'Ver todas']);
  });

  it('título y enlace van en la misma fila, el enlace a la derecha', () => {
    const raiz = renderizar(
      <EncabezadoSeccion
        titulo="Pagos"
        enlace={{ etiqueta: 'Ver todos', onPress: () => undefined }}
      />,
    );
    let fila: ReactTestInstance | null = raiz.root.findAllByType(Text)[0];
    while (fila && estilo(fila).flexDirection !== 'row') fila = fila.parent;
    expect(fila).not.toBeNull();
    expect(estilo(fila as ReactTestInstance).justifyContent).toBe('space-between');
  });
});
