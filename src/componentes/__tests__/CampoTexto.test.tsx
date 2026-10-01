// Regresión: al tocar el campo de contraseña el foco volvía al de correo. Causa: el TextInput vacío
// vivía oculto (position absolute + opacity 0) y al enfocarlo cambiaba de disposición; Android
// perdía el foco por ese cambio de layout y lo daba al primer campo enfocable. El TextInput debe
// conservar SIEMPRE el mismo lugar y estilo, esté vacío, enfocado o con texto.
import { type ReactElement, useState } from 'react';
import { StyleSheet, TextInput, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { CampoDinero } from '../CampoDinero';
import { CampoTexto } from '../CampoTexto';

function renderizar(elemento: ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = create(elemento);
  });
  return raiz;
}

/** Estilos del TextInput y de todos sus ancestros hasta la raíz del campo. */
function estilosDeLaCadena(raiz: ReactTestRenderer): ViewStyle[] {
  const entrada = raiz.root.findByType(TextInput);
  const cadena: ViewStyle[] = [StyleSheet.flatten(entrada.props.style) ?? {}];
  for (let nodo = entrada.parent; nodo && nodo !== raiz.root; nodo = nodo.parent) {
    if (typeof nodo.type === 'string' || nodo.props.style) {
      cadena.push(StyleSheet.flatten(nodo.props.style) ?? {});
    }
  }
  return cadena;
}

/** Propiedades de disposición: lo que no debe cambiar al enfocar o escribir. */
const DISPOSICION = [
  'position',
  'left',
  'right',
  'top',
  'bottom',
  'opacity',
  'width',
  'height',
  'flex',
] as const;

function disposicion(raiz: ReactTestRenderer) {
  return estilosDeLaCadena(raiz).map((estilo) =>
    Object.fromEntries(DISPOSICION.map((clave) => [clave, estilo[clave]])),
  );
}

function CampoDeContrasena({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return <CampoTexto etiqueta="Contraseña" valor={valor} onCambio={setValor} contrasena />;
}

describe('CampoTexto', () => {
  it('el TextInput no cambia de lugar ni de estilo al enfocarlo, escribir o salir del campo', () => {
    const raiz = renderizar(<CampoDeContrasena />);
    const vacio = disposicion(raiz);

    act(() => raiz.root.findByType(TextInput).props.onFocus());
    expect(disposicion(raiz)).toEqual(vacio);

    act(() => raiz.root.findByType(TextInput).props.onChangeText('Clave2026'));
    expect(disposicion(raiz)).toEqual(vacio);

    act(() => raiz.root.findByType(TextInput).props.onBlur());
    expect(disposicion(raiz)).toEqual(vacio);
  });

  it('vacío, el TextInput no está oculto: puede recibir el toque directamente', () => {
    const raiz = renderizar(<CampoDeContrasena />);
    for (const estilo of estilosDeLaCadena(raiz)) {
      expect(estilo.opacity === undefined || estilo.opacity === 1).toBe(true);
    }
  });

  it('el TextInput conserva su disposición con la misma forma con o sin valor inicial', () => {
    expect(disposicion(renderizar(<CampoDeContrasena inicial="abc" />))).toEqual(
      disposicion(renderizar(<CampoDeContrasena />)),
    );
  });
});

describe('CampoDinero (misma estructura)', () => {
  it('el TextInput no cambia de lugar ni de estilo al enfocarlo o escribir', () => {
    function Campo() {
      const [valor, setValor] = useState<number | null>(null);
      return <CampoDinero etiqueta="Monto" valorCentavos={valor} onCambio={setValor} />;
    }
    const raiz = renderizar(<Campo />);
    const vacio = disposicion(raiz);
    act(() => raiz.root.findByType(TextInput).props.onFocus());
    expect(disposicion(raiz)).toEqual(vacio);
    act(() => raiz.root.findByType(TextInput).props.onChangeText('1850000'));
    expect(disposicion(raiz)).toEqual(vacio);
  });
});

/** Ref que cuenta cuántas veces React monta el TextInput (un re-montaje deja más de una). */
function crearRefContador() {
  const montajes: unknown[] = [];
  const ref = {
    get current() {
      return montajes[montajes.length - 1] ?? null;
    },
    set current(valor: unknown) {
      if (valor !== null) montajes.push(valor);
    },
  } as React.RefObject<TextInput | null>;
  return { ref, montajes };
}

describe('el TextInput es el mismo y tiene el mismo estilo', () => {
  it('el estilo propio del TextInput es idéntico con valor vacío y con valor', () => {
    const estiloEntrada = (valor: string) => {
      const raiz = renderizar(<CampoTexto etiqueta="Correo" valor={valor} onCambio={() => {}} />);
      return StyleSheet.flatten(raiz.root.findByType(TextInput).props.style);
    };
    expect(estiloEntrada('')).toEqual(estiloEntrada('marta@ejemplo.com'));
  });

  it('no se vuelve a montar al enfocar, escribir, salir del campo ni mostrar la contraseña', () => {
    const { ref, montajes } = crearRefContador();
    function Campo() {
      const [valor, setValor] = useState('');
      return (
        <CampoTexto
          etiqueta="Contraseña"
          valor={valor}
          onCambio={setValor}
          contrasena
          inputRef={ref}
        />
      );
    }
    const raiz = renderizar(<Campo />);
    const entrada = () => raiz.root.findByType(TextInput);

    act(() => entrada().props.onFocus());
    act(() => entrada().props.onChangeText('Clave2026'));
    act(() => entrada().props.onBlur());
    const alternar = raiz.root.find((n) => n.props.accessibilityLabel === 'Mostrar contraseña');
    act(() => alternar.props.onPress());
    act(() => entrada().props.onFocus());

    expect(montajes).toHaveLength(1);
  });

  it('CampoDinero tampoco se vuelve a montar', () => {
    function Campo() {
      const [valor, setValor] = useState<number | null>(null);
      return <CampoDinero etiqueta="Monto" valorCentavos={valor} onCambio={setValor} />;
    }
    const raiz = renderizar(<Campo />);
    const antes = raiz.root.findByType(TextInput);
    act(() => raiz.root.findByType(TextInput).props.onFocus());
    act(() => raiz.root.findByType(TextInput).props.onChangeText('1850000'));
    // Mismo nodo del árbol: React reutilizó la instancia (no hubo desmontaje).
    expect(raiz.root.findByType(TextInput).instance).toBe(antes.instance);
  });
});

describe('dos campos en el mismo formulario (correo y contraseña)', () => {
  function Formulario() {
    const [correo, setCorreo] = useState('marta@ejemplo.com');
    const [clave, setClave] = useState('');
    return (
      <>
        <CampoTexto etiqueta="Correo" valor={correo} onCambio={setCorreo} />
        <CampoTexto etiqueta="Contraseña" valor={clave} onCambio={setClave} contrasena />
      </>
    );
  }
  const campo = (raiz: ReactTestRenderer, etiqueta: string) =>
    raiz.root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === etiqueta)!;
  const cadenaDe = (raiz: ReactTestRenderer, etiqueta: string) => {
    const entrada = campo(raiz, etiqueta);
    const cadena: ViewStyle[] = [StyleSheet.flatten(entrada.props.style) ?? {}];
    for (let nodo = entrada.parent; nodo && nodo !== raiz.root; nodo = nodo.parent) {
      cadena.push(StyleSheet.flatten(nodo.props.style) ?? {});
    }
    return cadena;
  };

  it('enfocar el segundo no cambia el estilo ni la disposición de ninguno de los dos', () => {
    const raiz = renderizar(<Formulario />);
    const antes = { correo: cadenaDe(raiz, 'Correo'), clave: cadenaDe(raiz, 'Contraseña') };
    act(() => campo(raiz, 'Correo').props.onFocus());
    act(() => campo(raiz, 'Correo').props.onBlur());
    act(() => campo(raiz, 'Contraseña').props.onFocus());
    // El correo conserva su estilo (valor lleno) y la contraseña pasa de vacía a enfocada
    // sin tocar el TextInput: solo cambian colores de la caja y la etiqueta.
    expect(cadenaDe(raiz, 'Correo')[0]).toEqual(antes.correo[0]);
    expect(cadenaDe(raiz, 'Contraseña')[0]).toEqual(antes.clave[0]);
    expect(cadenaDe(raiz, 'Contraseña').map((e) => e.position)).toEqual(
      antes.clave.map((e) => e.position),
    );
  });

  it('el foco lo da el propio TextInput (nativo): ningún ancestro maneja el toque ni llama a focus()', () => {
    const raiz = renderizar(<Formulario />);
    for (const etiqueta of ['Correo', 'Contraseña']) {
      const entrada = campo(raiz, etiqueta);
      for (let nodo = entrada.parent; nodo && nodo !== raiz.root; nodo = nodo.parent) {
        // Salvo el botón "Mostrar" (hermano, no ancestro), nadie escucha toques sobre el campo.
        expect(nodo.props.onPress).toBeUndefined();
        expect(nodo.props.onStartShouldSetResponder).toBeUndefined();
      }
    }
  });

  it('cada campo es un TextInput distinto con su propia referencia: no comparten foco', () => {
    const raiz = renderizar(<Formulario />);
    expect(campo(raiz, 'Correo')).not.toBe(campo(raiz, 'Contraseña'));
    expect(campo(raiz, 'Correo').props.secureTextEntry).toBeFalsy();
    expect(campo(raiz, 'Contraseña').props.secureTextEntry).toBe(true);
  });
});
