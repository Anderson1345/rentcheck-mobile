import { useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { blancoAlfa, colores, fuentes } from '../../tema';
import { centavosAPesosAbreviado } from '../../utilidades/dinero';
import { type Caja, promedio, puntosDeSerie, trazoArea, trazoSuave, yDeValor } from './geometria';

export interface MesIngreso {
  /** Etiqueta corta del mes ("sep"). */
  etiqueta: string;
  centavos: number;
}

interface Props {
  meses: readonly MesIngreso[];
  /** El último mes todavía está en curso: se dibuja punteado y no entra en el promedio. */
  ultimoEnCurso?: boolean;
  /** Segunda línea de la burbuja ("sep. en curso"). */
  etiquetaBurbuja?: string;
  /** Descripción para el lector de pantalla. */
  descripcion: string;
  /**
   * Línea punteada con el promedio de los meses cerrados (la dibuja la propia gráfica; la galería la
   * conserva). El Panel real la apaga: el servidor no entrega ningún promedio y la app no inventa uno.
   */
  conPromedio?: boolean;
}

const ALTO = 170;
const BASE = 142;
const ANCHO_BURBUJA = 104;

/** Ingresos por mes: curva suave con relleno degradado, promedio punteado y burbuja de valor. */
export function GraficaAreaIngresos({
  meses,
  ultimoEnCurso = false,
  etiquetaBurbuja,
  descripcion,
  conPromedio = true,
}: Props) {
  const [ancho, setAncho] = useState(0);
  const valores = meses.map((m) => m.centavos);
  const caja: Caja = { x0: 16, x1: Math.max(ancho - 16, 17), yArriba: 58, yAbajo: 134 };
  const puntos = puntosDeSerie(valores, caja);
  const cerrados = ultimoEnCurso ? puntos.slice(0, -1) : puntos;
  const ultimoCerrado = cerrados[cerrados.length - 1];
  const destacado = puntos[puntos.length - 1];
  const valoresCerrados = ultimoEnCurso ? valores.slice(0, -1) : valores;
  const yPromedio =
    conPromedio && valoresCerrados.length > 0
      ? yDeValor(promedio(valoresCerrados), valores, caja)
      : null;
  const xBurbuja = Math.max(0, ancho - ANCHO_BURBUJA);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={descripcion}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      {ancho > 0 && puntos.length > 0 ? (
        <Svg width={ancho} height={ALTO}>
          <Defs>
            <LinearGradient id="area-ingresos" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colores.serie} stopOpacity={0.3} />
              <Stop offset="1" stopColor={colores.serie} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line
            x1={caja.x0}
            x2={caja.x1}
            y1={BASE}
            y2={BASE}
            stroke={colores.textoSecundario}
            strokeOpacity={0.35}
          />
          {cerrados.length > 1 ? (
            <Path d={trazoArea(cerrados, BASE)} fill="url(#area-ingresos)" />
          ) : null}
          {yPromedio !== null ? (
            <Line
              x1={caja.x0}
              x2={caja.x1}
              y1={yPromedio}
              y2={yPromedio}
              stroke={colores.textoSecundario}
              strokeWidth={1.25}
              strokeDasharray="1 5"
              strokeLinecap="round"
            />
          ) : null}
          {cerrados.length > 1 ? (
            <Path
              d={trazoSuave(cerrados)}
              fill="none"
              stroke={colores.tinta}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {ultimoEnCurso && ultimoCerrado ? (
            <Path
              d={trazoSuave([ultimoCerrado, destacado])}
              fill="none"
              stroke={colores.tinta}
              strokeOpacity={0.55}
              strokeWidth={2.25}
              strokeDasharray="3 5"
              strokeLinecap="round"
            />
          ) : null}

          {/* Burbuja con el valor del último punto */}
          <Line
            x1={destacado.x}
            x2={destacado.x}
            y1={46}
            y2={destacado.y - 8}
            stroke={colores.textoSecundario}
            strokeDasharray="2 3"
          />
          <Rect x={xBurbuja} y={0} width={ANCHO_BURBUJA} height={44} rx={12} fill={colores.tinta} />
          <SvgText
            x={xBurbuja + 12}
            y={19}
            fontSize={15}
            fontFamily={fuentes.extranegrita}
            fill={colores.lima}
          >
            {centavosAPesosAbreviado(meses[meses.length - 1].centavos)}
          </SvgText>
          {etiquetaBurbuja ? (
            <SvgText
              x={xBurbuja + 12}
              y={36}
              fontSize={14}
              fontFamily={fuentes.media}
              fill={blancoAlfa(0.7)}
            >
              {etiquetaBurbuja}
            </SvgText>
          ) : null}

          {ultimoEnCurso && ultimoCerrado ? (
            <Circle
              cx={ultimoCerrado.x}
              cy={ultimoCerrado.y}
              r={3.5}
              fill={colores.superficie}
              stroke={colores.tinta}
              strokeWidth={2}
            />
          ) : null}
          <Circle cx={destacado.x} cy={destacado.y} r={11} fill={colores.lima} fillOpacity={0.18} />
          <Circle
            cx={destacado.x}
            cy={destacado.y}
            r={5.5}
            fill={colores.lima}
            stroke={colores.tinta}
            strokeWidth={2.5}
          />

          {meses.map((mes, i) => {
            const actual = i === meses.length - 1;
            return (
              <SvgText
                key={`${mes.etiqueta}-${i}`}
                x={puntos[i].x}
                y={164}
                textAnchor="middle"
                fontSize={14}
                fontFamily={actual ? fuentes.extranegrita : fuentes.media}
                fill={actual ? colores.tinta : colores.textoSecundario}
              >
                {mes.etiqueta}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: ALTO }} />
      )}
    </View>
  );
}
