import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from './CabeceraTinta';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}

/** Marco de las pantallas de acceso: cabecera de tinta con "volver" y el formulario debajo. */
export function PantallaFormulario({ titulo, subtitulo, children }: Props) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo={titulo} subtitulo={subtitulo} onVolver={() => router.back()} />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xxl }]}
        >
          {children}
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  contenido: { gap: espaciado.md, paddingHorizontal: espaciado.md, paddingTop: espaciado.xl },
});
