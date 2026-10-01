import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MENSAJE_SESION_VENCIDA } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera } from '@/componentes/CabeceraTinta';
import { Marca } from '@/componentes/Marca';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/sesion/SesionProvider';
import { blancoAlfa, colores, espaciado } from '@/tema';

export default function Bienvenida() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { aviso } = useSesion();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa style={estilos.cabecera}>
        <Marca />
        <Texto variante="cuerpo" color={blancoAlfa(0.68)} style={estilos.lema}>
          Tus arriendos, claros y al día.
        </Texto>
      </CabeceraTinta>

      <ContenidoBajoCabecera style={[estilos.cuerpo, { paddingBottom: bottom + espaciado.xs }]}>
        {aviso === 'SESION_VENCIDA' ? (
          <Aviso tono="advertencia" mensaje={MENSAJE_SESION_VENCIDA} />
        ) : null}
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
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { flex: 1, justifyContent: 'flex-end' },
  lema: { marginTop: espaciado.sm },
  cuerpo: { gap: espaciado.lg, paddingTop: espaciado.xl },
  acciones: { gap: espaciado.sm },
  pie: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciado.xs,
    paddingVertical: espaciado.sm,
  },
  enlace: { textDecorationLine: 'underline' },
});
