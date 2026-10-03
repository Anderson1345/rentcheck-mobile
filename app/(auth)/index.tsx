import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MENSAJE_SESION_VENCIDA } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CabeceraAcceso } from '@/componentes/CabeceraAcceso';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

export default function Bienvenida() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { aviso } = useSesion();

  return (
    <View style={estilos.pantalla}>
      <CabeceraAcceso />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[estilos.cuerpo, { paddingBottom: bottom + espaciado.md }]}
      >
        {aviso === 'SESION_VENCIDA' ? (
          <Aviso tono="advertencia" mensaje={MENSAJE_SESION_VENCIDA} />
        ) : null}
        {/* El grupo ocupa el centro del espacio libre: nada de media pantalla vacía debajo. */}
        <View style={estilos.grupo}>
          <Texto variante="tituloSeccion">¿Cómo vas a usar RentCheck?</Texto>
          <View style={estilos.acciones}>
            <Boton
              titulo="Soy arrendador"
              icono="inmuebles"
              ancho="completo"
              onPress={() => router.push('/login-arrendador')}
            />
            <Boton
              titulo="Soy inquilino"
              icono="perfil"
              variante="secundario"
              ancho="completo"
              onPress={() => router.push('/login-inquilino')}
            />
          </View>
        </View>

        {/* Solo para pruebas: en la app de producción estos enlaces no existen. */}
        {__DEV__ ? (
          <View style={estilos.pie}>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/diagnostico')}
              hitSlop={8}
            >
              <Texto variante="secundario" color={colores.textoSecundario} style={estilos.enlace}>
                Diagnóstico
              </Texto>
            </Pressable>
            <Texto variante="secundario" color={colores.textoSecundario}>
              ·
            </Texto>
            <Pressable accessibilityRole="link" onPress={() => router.push('/galeria')} hitSlop={8}>
              <Texto variante="secundario" color={colores.textoSecundario} style={estilos.enlace}>
                Galería
              </Texto>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: {
    flexGrow: 1,
    gap: espaciado.lg,
    paddingHorizontal: espaciado.xl,
    paddingTop: 28,
  },
  grupo: { flexGrow: 1, justifyContent: 'center', gap: espaciado.lg },
  acciones: { gap: espaciado.sm },
  pie: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciado.xs,
    paddingVertical: espaciado.sm,
  },
  enlace: { textDecorationLine: 'underline' },
});
