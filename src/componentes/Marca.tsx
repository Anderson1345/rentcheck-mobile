import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colores, conAlfa, fuentes } from '../tema';
import { FORMAS_RELIEVE } from './avatar/relieves';
import { Texto } from './Texto';

/** Forma de relieve de la marca: la misma del ícono (assets/fuente/marca.svg), con la cima centrada. */
const FORMA_MARCA = FORMAS_RELIEVE[5];
const DESPLAZAMIENTO = 24 - FORMA_MARCA.pico[1];

/** Símbolo: un relieve de curvas de nivel en lima sobre tinta, con la cima encendida. */
export function SimboloMarca({ tamano = 40 }: { tamano?: number }) {
  const [px] = FORMA_MARCA.pico;
  const py = 24;
  return (
    <View
      style={[
        estilos.simbolo,
        { width: tamano, height: tamano, borderRadius: Math.round(tamano * 0.31) },
      ]}
    >
      <Svg width={tamano} height={tamano} viewBox="0 0 48 48">
        <Rect width={48} height={48} fill={colores.tintaCapa} />
        <G
          transform={`translate(0 ${DESPLAZAMIENTO})`}
          fill="none"
          stroke={colores.lima}
          strokeOpacity={0.55}
          strokeWidth={1.2}
        >
          {FORMA_MARCA.curvas.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
        <Circle cx={px} cy={py} r={5} fill={conAlfa(colores.lima, 0.25)} />
        <Circle cx={px} cy={py} r={2.6} fill={colores.lima} />
      </Svg>
    </View>
  );
}

/** Wordmark "RentCheck": "Rent" en blanco y "Check" en lima, sobre tinta. */
export function Marca({ tamano = 'grande' }: { tamano?: 'grande' | 'mediana' }) {
  const grande = tamano === 'grande';
  return (
    <View style={estilos.fila} accessibilityRole="header" accessibilityLabel="RentCheck">
      <SimboloMarca tamano={grande ? 48 : 36} />
      <Texto
        variante={grande ? 'cifraProtagonista' : 'titulo'}
        color={colores.sobreTinta}
        style={grande ? estilos.grande : estilos.mediana}
      >
        Rent
        <Texto
          variante={grande ? 'cifraProtagonista' : 'titulo'}
          color={colores.lima}
          style={grande ? estilos.grande : estilos.mediana}
        >
          Check
        </Texto>
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  simbolo: { overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grande: { fontFamily: fuentes.extranegrita, fontSize: 40, letterSpacing: -1.4 },
  mediana: { fontFamily: fuentes.extranegrita },
});
