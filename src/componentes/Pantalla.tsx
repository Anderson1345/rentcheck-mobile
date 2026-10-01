import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';

export function Pantalla({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={estilos.area} edges={['bottom', 'left', 'right']}>
      <View style={estilos.contenido}>{children}</View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flex: 1, padding: espaciado.lg },
});
