import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Pantalla } from './Pantalla';
import { Texto } from './Texto';

/** Marcador de las pantallas que llegan en entregas posteriores. */
export function Proximamente({ titulo, entrega }: { titulo: string; entrega: string }) {
  return (
    <Pantalla>
      <View style={estilos.centro}>
        <Texto variante="titulo">{titulo}</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Próximamente ({entrega})
        </Texto>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.sm },
});
