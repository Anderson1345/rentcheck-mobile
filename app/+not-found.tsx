import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera } from '@/componentes/CabeceraTinta';
import { Marca } from '@/componentes/Marca';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// Lo que ve alguien con la sesión abierta que toca un enlace de activación: las rutas de acceso no
// existen para quien ya inició sesión (el caso "agregar contrato" llega en E6).
export default function NoEncontrada() {
  const router = useRouter();
  const { estado } = useSesion();
  const { bottom } = useSafeAreaInsets();

  function irAlInicio() {
    // Cada rol tiene su propio inicio: la bienvenida solo existe sin sesión.
    router.replace(
      estado === 'arrendador' ? '/panel' : estado === 'inquilino' ? '/contratos' : '/',
    );
  }

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa style={estilos.cabecera}>
        <Marca tamano="mediana" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={[estilos.cuerpo, { paddingBottom: bottom + espaciado.md }]}>
        <Texto variante="titulo" accessibilityRole="header">
          Esta pantalla no está disponible
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          El enlace que abriste no sirve en este momento.
        </Texto>
        <Boton titulo="Ir al inicio" ancho="completo" onPress={irAlInicio} />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { flex: 1, justifyContent: 'flex-end' },
  cuerpo: { gap: espaciado.md, paddingTop: espaciado.xl },
});
