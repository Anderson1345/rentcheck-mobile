import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';
import { CabeceraAcceso } from './CabeceraAcceso';
import { BarraAccionFija, rellenoInferior } from './PantallaPila';

interface Props {
  /** Título de la cabecera compacta (con "volver"). Sin título, la cabecera lleva la marca y la frase. */
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
  /** Botón principal fijo abajo, con la sombra barraAccion (formularios largos). */
  accionFija?: ReactNode;
}

/**
 * Marco de las pantallas de acceso (R1-B): CabeceraAcceso arriba (compacta con "volver" si hay título;
 * con marca y frase si no) y el formulario debajo, con relleno lateral de 24 dp y 20 dp entre elementos,
 * sin barra de desplazamiento visible. Con `accionFija`, el botón principal queda anclado abajo.
 */
export function PantallaFormulario({ titulo, subtitulo, children, accionFija }: Props) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [alturaBarra, setAlturaBarra] = useState(0);
  const conBarra = accionFija !== undefined && accionFija !== null;

  return (
    <View style={estilos.pantalla}>
      {titulo === undefined ? (
        <CabeceraAcceso />
      ) : (
        <CabeceraAcceso
          variante="compacta"
          titulo={titulo}
          subtitulo={subtitulo}
          onVolver={() => router.back()}
        />
      )}
      <ScrollView
        style={estilos.scroll}
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
      {conBarra ? <BarraAccionFija alMedir={setAlturaBarra}>{accionFija}</BarraAccionFija> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flex: 1 },
  // flexGrow: el pie de los logins ("¿No tienes cuenta?") se pega al fondo con marginTop 'auto'.
  contenido: {
    flexGrow: 1,
    gap: espaciado.lg,
    paddingHorizontal: espaciado.xl,
    paddingTop: 28,
  },
});
