import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { sombras } from '../../tema';
import { FORMAS_RELIEVE, TONOS_RELIEVE } from './relieves';
import { seleccionarRelieve } from './seleccion';

export type TamanoAvatar = 24 | 32 | 40 | 56;

interface Props {
  /** Nombre de la persona: define el relieve y el tono, y es la etiqueta accesible. */
  nombre: string;
  tamano?: TamanoAvatar;
}

const LADO = 48;

/**
 * Avatar de relieve: curvas de nivel propias de cada persona, sin rostro ni foto.
 * 12 variantes fijas (6 formas del diseño y las mismas giradas 180°) y 6 tonos, elegidos con un
 * hash determinista del nombre.
 */
export function AvatarRelieve({ nombre, tamano = 40 }: Props) {
  const { variante, tono } = seleccionarRelieve(nombre);
  const forma = FORMAS_RELIEVE[variante % FORMAS_RELIEVE.length];
  const girada = variante >= FORMAS_RELIEVE.length;
  const color = TONOS_RELIEVE[tono];
  const [px, py] = girada ? [LADO - forma.pico[0], LADO - forma.pico[1]] : forma.pico;
  const idGradiente = `relieve-${variante}-${tono}`;
  // En 24 dp las líneas se ven sucias: se dibujan menos curvas y más finas.
  const curvas = tamano <= 24 ? forma.curvas.slice(0, 4) : forma.curvas;
  const radio = Math.round(tamano * 0.32);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={nombre}
      style={[estilos.sombra, { width: tamano, height: tamano, borderRadius: radio }]}
    >
      <View style={[estilos.recorte, { borderRadius: radio }]}>
        <Svg width={tamano} height={tamano} viewBox={`0 0 ${LADO} ${LADO}`}>
          <Defs>
            <RadialGradient
              id={idGradiente}
              cx={px}
              cy={py}
              r={LADO * 0.85}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={color.centro} />
              <Stop offset="1" stopColor={color.borde} />
            </RadialGradient>
          </Defs>
          <Rect width={LADO} height={LADO} fill={`url(#${idGradiente})`} />
          <G
            transform={girada ? `rotate(180 ${LADO / 2} ${LADO / 2})` : undefined}
            fill="none"
            stroke={color.linea}
            strokeOpacity={0.42}
            strokeWidth={(tamano <= 24 ? 0.8 : 1) * (LADO / tamano)}
          >
            {curvas.map((d, i) => (
              <Path key={i} d={d} />
            ))}
          </G>
          <Circle cx={px} cy={py} r={5} fill={color.linea} fillOpacity={0.25} />
          <Circle cx={px} cy={py} r={2.5 * (LADO / Math.max(tamano, 40))} fill={color.linea} />
        </Svg>
      </View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radio, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' },
        ]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  sombra: { boxShadow: sombras.avatar },
  recorte: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
});
