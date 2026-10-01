import { StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colores } from '../../tema';
import { ALTO_MOTIVO, ANCHO_MOTIVO, CURVAS_MOTIVO } from './curvas';

interface Props {
  /** Opacidad del trazo: 0,1 en cabeceras, 0,16 en la pantalla "Conectando". */
  opacidad?: number;
  color?: string;
}

/**
 * Curvas de nivel de la marca, estáticas y de bajo contraste. Ocupa todo el contenedor (que debe
 * tener `overflow: 'hidden'`) y se ancla arriba a la derecha, donde el diseño pone la "cima".
 */
export function MotivoCurvas({ opacidad = 0.11, color = colores.lima }: Props) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${ANCHO_MOTIVO} ${ALTO_MOTIVO}`}
      preserveAspectRatio="xMaxYMin slice"
    >
      <G fill="none" stroke={color} strokeOpacity={opacidad} strokeWidth={1}>
        {CURVAS_MOTIVO.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
    </Svg>
  );
}
