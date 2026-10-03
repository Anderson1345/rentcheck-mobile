import { type ReactElement, type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado, sombras } from '../tema';

/** Alto que se reserva abajo mientras no se mide la barra (botón de 54 dp con su relleno). */
const ALTURA_ESTIMADA_BARRA = 120;

interface PropsBarra {
  children: ReactNode;
  /** Se llama con el alto real de la barra para dejar ese espacio libre al final del contenido. */
  alMedir: (alto: number) => void;
}

/**
 * Barra de acción fija abajo (maqueta Formulario): fondo blanco, sombra hacia arriba y el botón
 * principal siempre a la vista. Respeta el área segura inferior.
 */
export function BarraAccionFija({ children, alMedir }: PropsBarra) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      testID="accion-fija"
      onLayout={(e) => alMedir(e.nativeEvent.layout.height)}
      style={[estilos.barra, { paddingBottom: Math.max(bottom, espaciado.md) + espaciado.xs }]}
    >
      {children}
    </View>
  );
}

/** Espacio al final del scroll: el de siempre o, con barra fija, su alto (para que no tape el final). */
export function rellenoInferior(bottom: number, accionFija: boolean, alturaBarra: number): number {
  return accionFija
    ? (alturaBarra || ALTURA_ESTIMADA_BARRA) + espaciado.md
    : bottom + espaciado.xxl;
}

interface Props {
  children: ReactNode;
  /** Arrastrar para refrescar. */
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Botón principal fijo abajo, con la sombra barraAccion (formularios largos). */
  accionFija?: ReactNode;
}

/**
 * Cuerpo de las pantallas que viven en la pila de navegación (con el encabezado nativo de
 * OPCIONES_STACK): contenido que se desplaza (sin barra de desplazamiento visible), sin perder el toque en
 * los campos al abrir el teclado. Con `accionFija`, el botón principal queda anclado abajo.
 */
export function PantallaPila({ children, refreshControl, accionFija }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [alturaBarra, setAlturaBarra] = useState(0);
  const conBarra = accionFija !== undefined && accionFija !== null;

  const scroll = (
    <ScrollView
      style={estilos.pantalla}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[
        estilos.contenido,
        { paddingBottom: rellenoInferior(bottom, conBarra, alturaBarra) },
      ]}
    >
      {children}
    </ScrollView>
  );
  if (!conBarra) return scroll;
  return (
    <View style={estilos.marco}>
      {scroll}
      <BarraAccionFija alMedir={setAlturaBarra}>{accionFija}</BarraAccionFija>
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { flex: 1, backgroundColor: colores.fondo },
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { gap: espaciado.md, padding: espaciado.md },
  barra: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.xl,
    paddingTop: 14,
    boxShadow: sombras.barraAccion,
  },
});
