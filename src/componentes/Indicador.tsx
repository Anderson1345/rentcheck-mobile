import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { blancoAlfa, colores } from '../tema';

interface Props {
  tamano?: number;
  color?: string;
  colorPista?: string;
}

/** Indicador de carga del diseño: pista tenue y un cuarto de arco que gira. */
export function Indicador({
  tamano = 20,
  color = colores.lima,
  colorPista = blancoAlfa(0.22),
}: Props) {
  const [giro] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.timing(giro, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => animacion.stop();
  }, [giro]);

  const rotate = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={{ width: tamano, height: tamano, transform: [{ rotate }] }}
    >
      <Svg width={tamano} height={tamano} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={7.5} fill="none" stroke={colorPista} strokeWidth={2.4} />
        <Path
          d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
