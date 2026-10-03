// Pantallas base (R1): scroll sin barra visible (U10) y barra de acción fija abajo (maqueta Formulario).
import { RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { colores, sombras } from '../../tema';
import { PantallaFormulario } from '../PantallaFormulario';
import { PantallaPila } from '../PantallaPila';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));
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
const estilo = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style as ViewStyle) ?? {};
const relleno = (raiz: ReactTestRenderer) =>
  StyleSheet.flatten(raiz.root.findByType(ScrollView).props.contentContainerStyle) as ViewStyle;

describe.each([
  [
    'PantallaPila',
    (hijos: React.ReactNode, extra: object = {}) => <PantallaPila {...extra}>{hijos}</PantallaPila>,
  ],
  [
    'PantallaFormulario',
    (hijos: React.ReactNode, extra: object = {}) => (
      <PantallaFormulario titulo="Título" {...extra}>
        {hijos}
      </PantallaFormulario>
    ),
  ],
])('%s', (_nombre, montar) => {
  it('el scroll vertical no muestra la barra de desplazamiento (U10)', () => {
    const raiz = renderizar(montar(<Text>Hola</Text>));
    const scroll = raiz.root.findByType(ScrollView);
    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
    expect(scroll.props.showsHorizontalScrollIndicator).toBe(false);
  });

  it('sin acción fija no hay barra', () => {
    const raiz = renderizar(montar(<Text>Hola</Text>));
    expect(raiz.root.findAllByProps({ testID: 'accion-fija' })).toHaveLength(0);
  });

  it('con accionFija: una barra abajo, fuera del scroll, con la sombra barraAccion sobre fondo blanco', () => {
    const raiz = renderizar(
      montar(<Text>Cuerpo</Text>, { accionFija: <Text>Enviar comprobante</Text> }),
    );
    const barra = raiz.root.findByProps({ testID: 'accion-fija' });
    const e = estilo(barra);
    expect(e.backgroundColor).toBe(colores.superficie);
    expect(e.boxShadow).toBe(sombras.barraAccion);
    expect(e.position).toBe('absolute');
    expect(e.bottom).toBe(0);
    expect(barra.findAllByType(Text).map((t) => t.props.children)).toEqual(['Enviar comprobante']);
    // El botón no es hijo del scroll: no se va con el contenido.
    expect(raiz.root.findByType(ScrollView).findAllByProps({ testID: 'accion-fija' })).toHaveLength(
      0,
    );
  });

  it('con accionFija el contenido deja espacio abajo para que el botón no tape el final', () => {
    const sin = relleno(renderizar(montar(<Text>Cuerpo</Text>)));
    const con = relleno(
      renderizar(montar(<Text>Cuerpo</Text>, { accionFija: <Text>Botón</Text> })),
    );
    expect(con.paddingBottom as number).toBeGreaterThan(sin.paddingBottom as number);
    expect(con.paddingBottom as number).toBeGreaterThanOrEqual(100);
  });
});

describe('PantallaPila', () => {
  it('conserva el arrastrar para refrescar', () => {
    const raiz = renderizar(
      <PantallaPila
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => undefined} />}
      >
        <View />
      </PantallaPila>,
    );
    expect(raiz.root.findByType(ScrollView).props.refreshControl).toBeDefined();
  });
});
