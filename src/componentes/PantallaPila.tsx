import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';

interface Props {
  children: ReactNode;
  /** Arrastrar para refrescar. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

/**
 * Cuerpo de las pantallas que viven en la pila de navegación (con el encabezado nativo de
 * OPCIONES_STACK): contenido que se desplaza, sin perder el toque en los campos al abrir el teclado.
 */
export function PantallaPila({ children, refreshControl }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <ScrollView
      style={estilos.pantalla}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={refreshControl}
      contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xxl }]}
    >
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { gap: espaciado.md, padding: espaciado.md },
});
