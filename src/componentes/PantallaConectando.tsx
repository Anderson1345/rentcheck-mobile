import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { blancoAlfa, colores, espaciado, radios } from '../tema';
import { Indicador } from './Indicador';
import { MotivoCurvas } from './motivo/MotivoCurvas';
import { Texto } from './Texto';

interface Props {
  titulo?: string;
  detalle?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Espera tranquila mientras Render despierta (la primera petición puede tardar ~60 s).
 * No es un spinner infinito: el cliente de API corta a los 60 s y la pantalla que la usa muestra
 * el error con "Reintentar".
 */
export function PantallaConectando({
  titulo = 'Conectando con el servidor…',
  detalle = 'Puede tardar hasta un minuto la primera vez. Tus datos están a salvo.',
  style,
}: Props) {
  return (
    <View style={[estilos.caja, style]} accessibilityRole="progressbar" accessibilityLabel={titulo}>
      <MotivoCurvas opacidad={0.16} />
      <Indicador tamano={28} colorPista={blancoAlfa(0.14)} />
      <Texto variante="cuerpoFuerte" color={colores.sobreTinta} style={estilos.centro}>
        {titulo}
      </Texto>
      <Texto variante="secundario" color={blancoAlfa(0.66)} style={estilos.centro}>
        {detalle}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    minHeight: 200,
    borderRadius: radios.grande,
    backgroundColor: colores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.xxl,
    paddingVertical: espaciado.xl,
    overflow: 'hidden',
  },
  centro: { textAlign: 'center' },
});
