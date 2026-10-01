// Ayudas para probar pantallas con react-test-renderer: render con QueryClient y sesión reales,
// y búsquedas por etiqueta accesible. Los jest.mock (expo-router, api/auth) van en cada prueba.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { crearControladorSesion } from '../sesion/controlador';
import { SesionProvider } from '../sesion/SesionProvider';
import type { DatosSesion } from '../sesion/tipos';

export type Controlador = ReturnType<typeof crearControladorSesion>;

export async function renderizarPantalla(
  pantalla: ReactElement,
  guardado: DatosSesion | null = null,
): Promise<{ raiz: ReactTestRenderer; controlador: Controlador; cliente: QueryClient }> {
  const controlador = crearControladorSesion({
    almacen: {
      guardar: async () => undefined,
      leer: async () => guardado,
      borrar: async () => undefined,
    },
    limpiarCache: () => undefined,
  });
  await controlador.arrancar();
  // gcTime infinito: sin el temporizador de limpieza de 5 min que dejaría vivo a Jest.
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity },
    },
  });
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = create(
      <QueryClientProvider client={cliente}>
        <SesionProvider controlador={controlador}>{pantalla}</SesionProvider>
      </QueryClientProvider>,
    );
  });
  // TanStack Query avisa de sus resultados con un setTimeout(0): se deja correr un ciclo (salvo con
  // temporizadores falsos, donde nada correría).
  if (!Object.prototype.hasOwnProperty.call(setTimeout, 'clock')) {
    await act(async () => {
      await new Promise<void>((resolver) => setTimeout(resolver, 10));
    });
  }
  return { raiz, controlador, cliente };
}

/** Texto de cada <Text>, con sus hijos de texto unidos ("Hola, " + nombre → "Hola, Camilo"). */
export function textosDe(raiz: ReactTestRenderer): string[] {
  return raiz.root
    .findAllByType(Text)
    .map((n) =>
      (Array.isArray(n.props.children) ? n.props.children : [n.props.children])
        .filter(
          (c: unknown): c is string | number => typeof c === 'string' || typeof c === 'number',
        )
        .join(''),
    );
}

export const campoDe = (raiz: ReactTestRenderer, etiqueta: string) =>
  raiz.root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === etiqueta);

export function botonDe(raiz: ReactTestRenderer, titulo: string) {
  return raiz.root.find(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.findAll(
        (h) =>
          h.props.children === titulo ||
          (Array.isArray(h.props.children) && h.props.children.join('') === titulo),
      ).length > 0,
  );
}

export const hayBoton = (raiz: ReactTestRenderer, titulo: string) =>
  raiz.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.findAll((h) => h.props.children === titulo).length > 0,
  ).length > 0;

export async function escribirEn(raiz: ReactTestRenderer, etiqueta: string, texto: string) {
  const campo = campoDe(raiz, etiqueta);
  if (!campo) throw new Error(`No hay un campo "${etiqueta}"`);
  await act(async () => campo.props.onChangeText(texto));
}

export async function pulsar(raiz: ReactTestRenderer, titulo: string) {
  await act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
}
