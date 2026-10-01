import { Pressable, StyleSheet, View } from 'react-native';

import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Texto } from '../Texto';

const ESTRATOS = [1, 2, 3, 4, 5, 6] as const;

interface Props {
  valor: number | null;
  onCambio: (estrato: number) => void;
  error?: string;
}

/**
 * Estrato 1 a 6 en seis celdas iguales que se reparten el ancho (caben en 360 dp) y miden al menos
 * 48 dp de alto: tocar es más rápido y seguro que escribir un número.
 */
export function SelectorEstrato({ valor, onCambio, error }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" color={colores.textoFuerte}>
        Estrato
      </Texto>
      <View accessibilityRole="radiogroup" style={estilos.fila}>
        {ESTRATOS.map((estrato) => {
          const activo = valor === estrato;
          return (
            <Pressable
              key={estrato}
              accessibilityRole="radio"
              accessibilityLabel={`Estrato ${estrato}`}
              accessibilityState={{ selected: activo }}
              onPress={() => onCambio(estrato)}
              style={[estilos.celda, activo && estilos.celdaActiva]}
            >
              <Texto
                variante="cuerpoFuerte"
                cifras
                color={activo ? colores.sobreTinta : colores.texto}
              >
                {estrato}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Texto variante="secundario" color={colores.peligroTexto} style={estilos.error}>
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  fila: { flexDirection: 'row', gap: espaciado.xs },
  celda: {
    flex: 1,
    minHeight: 48,
    borderRadius: radios.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tintaAlfa(0.06),
  },
  celdaActiva: { backgroundColor: colores.tinta },
  error: { paddingLeft: 4 },
});
