import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, tipografia } from '../tema';
import { Pantalla } from './Pantalla';

/** Marcador de las pantallas que llegan en entregas posteriores. */
export function Proximamente({ titulo, entrega }: { titulo: string; entrega: string }) {
  return (
    <Pantalla>
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.texto}>Próximamente ({entrega})</Text>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.sm },
  titulo: { fontSize: tipografia.titulo, fontWeight: '700', color: colores.texto },
  texto: { fontSize: tipografia.subtitulo, color: colores.textoSecundario },
});
