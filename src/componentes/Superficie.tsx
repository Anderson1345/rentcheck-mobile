import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colores, espaciado, radios, sombras } from '../tema';

interface Props {
  children: ReactNode;
  /** Relleno interior; las listas usan 'ninguno' y dejan el relleno a cada fila. */
  relleno?: 'ninguno' | 'normal';
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta clara con sombra teñida de tinta. */
export function Superficie({ children, relleno = 'normal', style }: Props) {
  return (
    <View style={[estilos.base, relleno === 'normal' && estilos.relleno, style]}>{children}</View>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    boxShadow: sombras.tarjeta,
  },
  relleno: { padding: espaciado.lg },
});
