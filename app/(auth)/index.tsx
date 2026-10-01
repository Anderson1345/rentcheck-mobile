import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { colores, espaciado, tipografia } from '@/tema';

export default function Bienvenida() {
  const router = useRouter();

  return (
    <Pantalla>
      <View style={estilos.encabezado}>
        <Text style={estilos.marca}>RentCheck</Text>
        <Text style={estilos.lema}>Tus arriendos, claros y al día.</Text>
      </View>

      <View style={estilos.acciones}>
        <Boton titulo="Soy arrendador" onPress={() => router.push('/panel')} />
        <Boton titulo="Soy inquilino" variante="secundario" onPress={() => router.push('/contratos')} />
      </View>

      <Pressable accessibilityRole="link" onPress={() => router.push('/diagnostico')} style={estilos.pie}>
        <Text style={estilos.enlace}>Diagnóstico</Text>
      </Pressable>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { flex: 1, justifyContent: 'center', gap: espaciado.sm },
  marca: { fontSize: tipografia.grande, fontWeight: '700', color: colores.primario },
  lema: { fontSize: tipografia.subtitulo, color: colores.textoSecundario },
  acciones: { gap: espaciado.md, paddingBottom: espaciado.lg },
  pie: { alignItems: 'center', padding: espaciado.md },
  enlace: { fontSize: tipografia.pequeno, color: colores.textoSecundario, textDecorationLine: 'underline' },
});
