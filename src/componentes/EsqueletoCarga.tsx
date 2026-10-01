import { StyleSheet, View } from 'react-native';

import { espaciado, tintaAlfa } from '../tema';
import { Superficie } from './Superficie';

// Anchos fijos (no aleatorios) para que el esqueleto no cambie en cada render.
const ANCHOS: readonly (readonly [`${number}%`, `${number}%`])[] = [
  ['70%', '45%'],
  ['55%', '62%'],
  ['64%', '38%'],
];

interface Props {
  /** Cantidad de filas con la forma de una lista (avatar + dos líneas). */
  filas?: number;
}

/** Esqueleto con la forma del contenido: se muestra mientras carga una lista. Sin animación (E12). */
export function EsqueletoCarga({ filas = 3 }: Props) {
  return (
    <Superficie>
      <View style={estilos.lista} accessibilityRole="progressbar" accessibilityLabel="Cargando">
        {Array.from({ length: filas }, (_, i) => {
          const [ancho1, ancho2] = ANCHOS[i % ANCHOS.length];
          return (
            <View key={i} style={estilos.fila}>
              <View style={estilos.avatar} />
              <View style={estilos.lineas}>
                <View
                  style={[estilos.linea, { width: ancho1, backgroundColor: tintaAlfa(0.07) }]}
                />
                <View
                  style={[estilos.linea, { width: ancho2, backgroundColor: tintaAlfa(0.045) }]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Superficie>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: tintaAlfa(0.07) },
  lineas: { flex: 1, gap: espaciado.xs },
  linea: { height: 12, borderRadius: 6 },
});
