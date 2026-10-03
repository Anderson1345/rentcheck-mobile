// Campo de formulario (R1, U1): la etiqueta va FUERA de la caja, arriba; la ayuda y el error, debajo; el
// prefijo ($) y la acción de la derecha viven dentro de la caja; el foco cambia solo el borde y el anillo.
import { StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { alturas, colores, sombras } from '../../tema';
import { CampoCodigoSeisDigitos } from '../CampoCodigoSeisDigitos';
import { CampoDinero } from '../CampoDinero';
import { CampoTexto } from '../CampoTexto';

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
const caja = (raiz: ReactTestRenderer) => raiz.root.findByProps({ testID: 'campo-caja' });
const textos = (nodo: ReactTestInstance) =>
  nodo.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
const entrada = (raiz: ReactTestRenderer) => raiz.root.findByType(TextInput);

/** Los hijos directos del contenedor de un campo, en orden: etiqueta, caja y ayuda o error. */
function hijosDelCampo(raiz: ReactTestRenderer): ReactTestInstance[] {
  const contenedor = caja(raiz).parent as ReactTestInstance;
  return contenedor.children.filter((c): c is ReactTestInstance => typeof c !== 'string');
}

describe.each([
  [
    'CampoTexto',
    (extra: object = {}) => (
      <CampoTexto etiqueta="Correo" valor="" onCambio={() => undefined} {...extra} />
    ),
  ],
  [
    'CampoDinero',
    (extra: object = {}) => (
      <CampoDinero etiqueta="Correo" valorCentavos={null} onCambio={() => undefined} {...extra} />
    ),
  ],
])('%s: estructura común', (_nombre, campo) => {
  it('la etiqueta está FUERA de la caja y no se superpone al valor', () => {
    const raiz = renderizar(campo());
    expect(textos(caja(raiz))).not.toContain('Correo');
    expect(textos(raiz.root)).toContain('Correo');
  });

  it('la etiqueta es de 14 sp, negrita, color textoFuerte, y no es flotante (sin posición absoluta)', () => {
    const raiz = renderizar(campo());
    const etiqueta = raiz.root.findAllByType(Text).find((t) => t.props.children === 'Correo');
    const e = estilo(etiqueta as ReactTestInstance);
    expect(e.fontSize).toBe(14);
    expect(e.fontFamily).toMatch(/Bold|negrita|Manrope_700/i);
    expect(e.color).toBe(colores.textoFuerte);
    expect(e.position).toBeUndefined();
  });

  it('el orden es etiqueta, caja y, debajo, la ayuda', () => {
    const raiz = renderizar(campo({ ayuda: 'Ayuda del campo' }));
    const hijos = hijosDelCampo(raiz);
    expect(textos(hijos[0])).toEqual(['Correo']);
    expect(hijos[1].props.testID).toBe('campo-caja');
    expect(textos(hijos[2])).toEqual(['Ayuda del campo']);
  });

  it('el error va DEBAJO de la caja, en peligroTexto y anunciado, y reemplaza a la ayuda', () => {
    const raiz = renderizar(campo({ ayuda: 'Ayuda', error: 'Escribe un correo válido' }));
    const hijos = hijosDelCampo(raiz);
    expect(hijos).toHaveLength(3);
    expect(hijos[1].props.testID).toBe('campo-caja');
    const error = hijos[2].findByType(Text);
    expect(error.props.children).toBe('Escribe un correo válido');
    expect(estilo(error).color).toBe(colores.peligroTexto);
    expect(error.props.accessibilityLiveRegion).toBe('polite');
    expect(textos(raiz.root)).not.toContain('Ayuda');
  });

  it('la caja mide lo que dice alturas.campo (56) con borde fino, fondo superficie y radio', () => {
    const raiz = renderizar(campo());
    const c = estilo(caja(raiz));
    expect(alturas.campo).toBe(56);
    expect(c.minHeight ?? c.height).toBe(alturas.campo);
    expect(c.backgroundColor).toBe(colores.superficie);
    expect(c.borderRadius).toBeGreaterThan(0);
    expect(String(c.boxShadow)).toContain('0 0 0 1px');
  });

  it('al enfocar solo cambia el borde: 2 dp de tintaCapa y el anillo lima; al salir vuelve', () => {
    const raiz = renderizar(campo());
    expect(estilo(caja(raiz)).boxShadow).not.toBe(sombras.campoEnfocado);
    act(() => entrada(raiz).props.onFocus());
    expect(estilo(caja(raiz)).boxShadow).toBe(sombras.campoEnfocado);
    expect(sombras.campoEnfocado).toContain('#1C444B');
    expect(sombras.campoEnfocado).toContain('rgba(197,240,106,0.5)');
    act(() => entrada(raiz).props.onBlur());
    expect(estilo(caja(raiz)).boxShadow).not.toBe(sombras.campoEnfocado);
  });

  it('el TextInput tiene la etiqueta como accessibilityLabel y no cambia de sitio al enfocar', () => {
    const raiz = renderizar(campo());
    expect(entrada(raiz).props.accessibilityLabel).toBe('Correo');
    const antes = JSON.stringify(estilo(entrada(raiz)));
    act(() => entrada(raiz).props.onFocus());
    expect(JSON.stringify(estilo(entrada(raiz)))).toBe(antes);
  });

  it('texto de 16 sp (20 en dinero) con relleno horizontal de 16 dentro de la caja', () => {
    const raiz = renderizar(campo());
    const e = estilo(entrada(raiz));
    expect([16, 20]).toContain(e.fontSize);
    const c = estilo(caja(raiz));
    expect(c.paddingHorizontal).toBe(16);
  });
});

describe('CampoTexto', () => {
  it('acción a la derecha: un nodo dentro de la caja, después del texto, sin encimarse', () => {
    const raiz = renderizar(
      <CampoTexto
        etiqueta="Teléfono"
        valor=""
        onCambio={() => undefined}
        accion={<Text testID="accion-de-prueba">Pegar</Text>}
      />,
    );
    const dentro = caja(raiz).findAllByProps({ testID: 'accion-de-prueba' });
    expect(dentro.length).toBeGreaterThan(0);
    // Orden del árbol: primero el TextInput y después la acción.
    const todos = caja(raiz).findAll(() => true);
    const posicionEntrada = todos.findIndex((n) => n.type === TextInput);
    const posicionAccion = todos.findIndex((n) => n.props.testID === 'accion-de-prueba');
    expect(posicionEntrada).toBeGreaterThanOrEqual(0);
    expect(posicionAccion).toBeGreaterThan(posicionEntrada);
    // La entrada ocupa el espacio que sobra: no se escribe debajo de la acción.
    expect(estilo(entrada(raiz)).flexGrow ?? estilo(entrada(raiz)).flex).toBeGreaterThan(0);
  });

  it('prefijo de texto dentro de la caja, a la izquierda del valor y centrado verticalmente', () => {
    const raiz = renderizar(
      <CampoTexto etiqueta="Valor" valor="" onCambio={() => undefined} prefijo="+57" />,
    );
    expect(textos(caja(raiz))).toContain('+57');
    expect(estilo(caja(raiz)).alignItems).toBe('center');
  });

  it('contraseña: "Mostrar" y "Ocultar" dentro de la caja alternan el texto visible', () => {
    const raiz = renderizar(
      <CampoTexto etiqueta="Contraseña" valor="secreto" onCambio={() => undefined} contrasena />,
    );
    expect(entrada(raiz).props.secureTextEntry).toBe(true);
    const boton = () =>
      caja(raiz).findAll((n) => n.props.accessibilityRole === 'button' && n.props.onPress)[0];
    expect(boton().props.accessibilityLabel).toBe('Mostrar contraseña');
    expect(textos(caja(raiz))).toContain('Mostrar');
    act(() => boton().props.onPress());
    expect(entrada(raiz).props.secureTextEntry).toBe(false);
    expect(boton().props.accessibilityLabel).toBe('Ocultar contraseña');
    expect(textos(caja(raiz))).toContain('Ocultar');
  });

  it('el botón de la acción mide al menos 44 dp de alto', () => {
    const raiz = renderizar(
      <CampoTexto etiqueta="Contraseña" valor="" onCambio={() => undefined} contrasena />,
    );
    const boton = caja(raiz).findAll((n) => n.props.accessibilityRole === 'button')[0];
    expect(estilo(boton).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('etiquetaDerecha va en la misma fila que la etiqueta (p. ej. "¿La olvidaste?")', () => {
    const raiz = renderizar(
      <CampoTexto
        etiqueta="Contraseña"
        valor=""
        onCambio={() => undefined}
        etiquetaDerecha={<Text>¿La olvidaste?</Text>}
      />,
    );
    const fila = hijosDelCampo(raiz)[0];
    expect(textos(fila)).toEqual(['Contraseña', '¿La olvidaste?']);
    expect(estilo(fila).flexDirection).toBe('row');
  });

  it('conserva la API de siempre: onCambio, onBlur, ref, maxLength, teclado y editable', () => {
    const cambios: string[] = [];
    const alSalir = jest.fn();
    const raiz = renderizar(
      <CampoTexto
        etiqueta="Nombre"
        valor="Ana"
        onCambio={(t) => cambios.push(t)}
        onBlur={alSalir}
        keyboardType="email-address"
        maxLength={10}
        editable={false}
      />,
    );
    act(() => entrada(raiz).props.onChangeText('Ana María'));
    act(() => entrada(raiz).props.onBlur());
    expect(cambios).toEqual(['Ana María']);
    expect(alSalir).toHaveBeenCalledTimes(1);
    expect(entrada(raiz).props.keyboardType).toBe('email-address');
    expect(entrada(raiz).props.maxLength).toBe(10);
    expect(entrada(raiz).props.editable).toBe(false);
    expect(entrada(raiz).props.value).toBe('Ana');
  });

  it('el código de seis dígitos hereda la estructura (etiqueta fuera) y solo admite números', () => {
    const cambios: string[] = [];
    const raiz = renderizar(<CampoCodigoSeisDigitos valor="" onCambio={(d) => cambios.push(d)} />);
    expect(textos(caja(raiz))).not.toContain('Código de verificación');
    act(() => entrada(raiz).props.onChangeText('12a34b56789'));
    expect(cambios).toEqual(['123456']);
  });
});

describe('CampoDinero', () => {
  it('el prefijo "$" está dentro de la caja, en la misma fila y centrado con el valor', () => {
    const raiz = renderizar(
      <CampoDinero etiqueta="Monto" valorCentavos={80_000_000} onCambio={() => undefined} />,
    );
    expect(textos(caja(raiz))).toContain('$');
    expect(estilo(caja(raiz)).flexDirection).toBe('row');
    expect(estilo(caja(raiz)).alignItems).toBe('center');
    expect(entrada(raiz).props.value).toBe('800.000');
  });

  it('el prefijo se ve también vacío (no solo al escribir)', () => {
    const raiz = renderizar(
      <CampoDinero etiqueta="Monto" valorCentavos={null} onCambio={() => undefined} />,
    );
    expect(textos(caja(raiz))).toContain('$');
  });

  it('escribir pesos llama a onCambio con centavos; vaciar, con null', () => {
    const cambios: (number | null)[] = [];
    const raiz = renderizar(
      <CampoDinero etiqueta="Monto" valorCentavos={null} onCambio={(c) => cambios.push(c)} />,
    );
    act(() => entrada(raiz).props.onChangeText('1.250.000'));
    act(() => entrada(raiz).props.onChangeText(''));
    expect(cambios).toEqual([125_000_000, null]);
  });

  it('el valor va en 20 sp, extranegrita, con cifras de ancho fijo', () => {
    const raiz = renderizar(
      <CampoDinero etiqueta="Monto" valorCentavos={100} onCambio={() => undefined} />,
    );
    const e = estilo(entrada(raiz));
    expect(e.fontSize).toBe(20);
    expect(JSON.stringify(e.fontVariant)).toContain('tabular-nums');
  });
});

describe('estructura sin la caja', () => {
  it('View de la caja es un View real (no un texto)', () => {
    const raiz = renderizar(<CampoTexto etiqueta="A" valor="" onCambio={() => undefined} />);
    expect(caja(raiz).type).toBe(View);
  });
});
