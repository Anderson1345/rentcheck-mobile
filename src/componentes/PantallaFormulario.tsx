import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from './CabeceraTinta';
import { BarraAccionFija, rellenoInferior } from './PantallaPila';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /** Botón principal fijo abajo, con la sombra barraAccion. */
  accionFija?: ReactNode;
}

/**
 * Marco de las pantallas de acceso: cabecera de tinta con "volver" y el formulario debajo (sin barra de
 * desplazamiento visible). Con `accionFija`, el botón principal queda anclado abajo.
 */
export function PantallaFormulario({ titulo, subtitulo, children, accionFija }: Props) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [alturaBarra, setAlturaBarra] = useState(0);
  const conBarra = accionFija !== undefined && accionFija !== null;

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo={titulo} subtitulo={subtitulo} onVolver={() => router.back()} />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            estilos.contenido,
            { paddingBottom: rellenoInferior(bottom, conBarra, alturaBarra) },
          ]}
        >
          {children}
        </ScrollView>
      </ContenidoBajoCabecera>
      {conBarra ? <BarraAccionFija alMedir={setAlturaBarra}>{accionFija}</BarraAccionFija> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  contenido: { gap: espaciado.md, paddingHorizontal: espaciado.md, paddingTop: espaciado.xl },
});
