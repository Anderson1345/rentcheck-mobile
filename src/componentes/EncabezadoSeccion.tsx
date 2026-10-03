import { Pressable, StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  /** Enlace a la derecha ("Ver todas"). */
  enlace?: { etiqueta: string; onPress: () => void };
}

/**
 * Encabezado de una sección (R1): título de 18 sp extranegrita y, opcional, un enlace a la derecha
 * ("Ver todas"). El enlace mide al menos 44 dp de alto para tocarlo bien.
 */
export function EncabezadoSeccion({ titulo, enlace }: Props) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.titulo}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          {titulo}
        </Texto>
      </View>
      {enlace ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={enlace.etiqueta}
          onPress={enlace.onPress}
          style={estilos.enlace}
        >
          <Texto variante="etiqueta" color={colores.tintaCapa}>
            {enlace.etiqueta}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaciado.xxs,
  },
  titulo: { flex: 1 },
  enlace: { minHeight: 44, justifyContent: 'center', paddingLeft: espaciado.sm },
});
