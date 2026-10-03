import { Pressable, StyleSheet, View } from 'react-native';

import { colores, sombras } from '../tema';
import { Icono, type NombreIcono } from './iconos/Icono';
import { Texto } from './Texto';

export interface Acceso {
  /** Clave estable de la lista. */
  clave: string;
  etiqueta: string;
  icono: NombreIcono;
  onPress: () => void;
  /** El acceso protagonista: mosaico en tinta con el icono lima. */
  destacado?: boolean;
  deshabilitado?: boolean;
}

interface Props {
  accesos: readonly Acceso[];
  /** Accesos por fila (3 o 4). Los que sobran pasan a la fila siguiente. */
  columnas?: 3 | 4;
}

/** Lado del mosaico y su radio, como en las maquetas (56 dp, radio 18). */
const LADO_MOSAICO = 56;
const RADIO_MOSAICO = 18;

/**
 * Grilla de accesos con icono (R1): cada acceso es un mosaico de 56 dp con su etiqueta debajo (hasta 2
 * líneas). Sirve para las acciones frecuentes de un contrato o del panel del inquilino, en lugar de una
 * pila de botones iguales. El acceso `destacado` va en tinta con el icono lima.
 */
export function GrillaAccesos({ accesos, columnas = 4 }: Props) {
  const ancho = columnas === 4 ? '25%' : `${100 / 3}%`;
  return (
    <View style={estilos.grilla}>
      {accesos.map((a) => (
        <Pressable
          key={a.clave}
          accessibilityRole="button"
          accessibilityLabel={a.etiqueta}
          accessibilityState={{ disabled: a.deshabilitado === true }}
          disabled={a.deshabilitado}
          onPress={a.onPress}
          style={({ pressed }) => [
            estilos.acceso,
            { width: ancho },
            a.deshabilitado && estilos.apagado,
            pressed && estilos.presionado,
          ]}
        >
          <View
            testID="acceso-mosaico"
            style={[
              estilos.mosaico,
              a.destacado ? estilos.mosaicoDestacado : estilos.mosaicoNormal,
            ]}
          >
            <Icono
              nombre={a.icono}
              tamano={24}
              grosor={1.7}
              color={a.destacado ? colores.lima : colores.tinta}
            />
          </View>
          <Texto variante="etiqueta" numberOfLines={2} style={estilos.etiqueta}>
            {a.etiqueta}
          </Texto>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  acceso: { minHeight: 44, alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  presionado: { opacity: 0.7 },
  apagado: { opacity: 0.4 },
  mosaico: {
    width: LADO_MOSAICO,
    height: LADO_MOSAICO,
    borderRadius: RADIO_MOSAICO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mosaicoNormal: { backgroundColor: colores.superficie, boxShadow: sombras.tarjeta },
  mosaicoDestacado: { backgroundColor: colores.tinta },
  etiqueta: { fontSize: 12, textAlign: 'center' },
});
