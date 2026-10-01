import { Pressable, StyleSheet, View } from 'react-native';

import type { TipoUnidad } from '../../api/inmuebles';
import { ETIQUETA_TIPO_UNIDAD } from '../../inmuebles/etiquetas';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Texto } from '../Texto';

const TIPOS: readonly TipoUnidad[] = ['APARTAMENTO', 'CASA', 'LOCAL', 'PARQUEADERO', 'HABITACION'];

interface Props {
  valor: TipoUnidad;
  onCambio: (tipo: TipoUnidad) => void;
}

/** Las cinco opciones a la vista (se acomodan en filas), cada una con área táctil de 48 dp. */
export function SelectorTipoUnidad({ valor, onCambio }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" color={colores.textoFuerte}>
        Tipo de unidad
      </Texto>
      <View accessibilityRole="radiogroup" style={estilos.fila}>
        {TIPOS.map((tipo) => {
          const activo = tipo === valor;
          return (
            <Pressable
              key={tipo}
              accessibilityRole="radio"
              accessibilityLabel={ETIQUETA_TIPO_UNIDAD[tipo]}
              accessibilityState={{ selected: activo }}
              onPress={() => onCambio(tipo)}
              style={[estilos.opcion, activo && estilos.activa]}
            >
              <Texto variante="etiqueta" color={activo ? colores.sobreTinta : colores.texto}>
                {ETIQUETA_TIPO_UNIDAD[tipo]}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  opcion: {
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    borderRadius: radios.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tintaAlfa(0.06),
  },
  activa: { backgroundColor: colores.tinta },
});
