import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';
import { TituloCabecera } from './CabeceraTinta';
import { Marca } from './Marca';
import { MotivoCurvas } from './motivo/MotivoCurvas';
import { Texto } from './Texto';

/** Radio inferior del bloque de tinta (maqueta de acceso: 32 dp). */
export const RADIO_CABECERA_ACCESO = 32;

interface Props {
  /** `grande`: marca y frase (bienvenida y login). `compacta`: volver, título y subtítulo. */
  variante?: 'grande' | 'compacta';
  /** Solo en la compacta. */
  titulo?: string;
  subtitulo?: string;
  /** Solo en la compacta: muestra el botón atrás. */
  onVolver?: () => void;
}

/**
 * Cabecera de las pantallas de acceso (R1-B): bloque de tinta con radio inferior grande y las curvas de
 * nivel de siempre. Su alto sale del contenido (nunca se estira), así el formulario usa el resto de la
 * pantalla: la grande queda en torno al 25 % de un teléfono y la compacta en torno al 15 %.
 */
export function CabeceraAcceso({ variante = 'grande', titulo, subtitulo, onVolver }: Props) {
  const { top } = useSafeAreaInsets();
  const grande = variante === 'grande';
  return (
    <View
      testID="cabecera-acceso"
      style={[
        estilos.bloque,
        { paddingTop: top + espaciado.md, paddingBottom: grande ? espaciado.xxl : espaciado.xl },
      ]}
    >
      <StatusBar style="light" />
      <MotivoCurvas />
      {grande ? (
        <>
          <Marca tamano="mediana" />
          <Texto variante="titulo" color={colores.sobreTinta} style={estilos.frase}>
            Tus arriendos, claros y al día.
          </Texto>
        </>
      ) : (
        <TituloCabecera titulo={titulo ?? ''} subtitulo={subtitulo} onVolver={onVolver} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    backgroundColor: colores.tinta,
    paddingHorizontal: espaciado.xl,
    borderBottomLeftRadius: RADIO_CABECERA_ACCESO,
    borderBottomRightRadius: RADIO_CABECERA_ACCESO,
    overflow: 'hidden',
  },
  // Dos líneas, como en la maqueta ("Tus arriendos, / claros y al día.").
  frase: { marginTop: espaciado.lg, maxWidth: 260 },
});
