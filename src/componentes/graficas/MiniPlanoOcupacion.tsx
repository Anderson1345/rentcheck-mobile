import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { coloresEstado, colores, conAlfa, espaciado, fuentes, tintaAlfa } from '../../tema';
import { Texto } from '../Texto';
import { type CeldaPlano, type InmueblePlano, repartirPlano } from './geometria';

interface Props {
  inmuebles: readonly InmueblePlano[];
}

const GRIS = coloresEstado.neutro.texto;
const MORA = coloresEstado.peligro.texto;

function Celda({ celda }: { celda: CeldaPlano }) {
  const libre = celda.estado === 'LIBRE';
  const mora = celda.estado === 'EN_MORA';
  const fondo = libre ? 'url(#rayado-libre)' : mora ? MORA : colores.tinta;
  const colorTexto = libre ? colores.textoFuerte : colores.sobreTinta;
  const nota = mora ? 'En mora' : libre ? 'Libre' : null;

  if (celda.esPiso) {
    return (
      <G>
        <Rect
          x={celda.x}
          y={celda.y}
          width={celda.ancho}
          height={celda.alto}
          rx={5}
          fill={fondo}
          stroke={libre ? GRIS : undefined}
          strokeOpacity={0.6}
          strokeDasharray={libre ? '3 3' : undefined}
        />
        <SvgText
          x={celda.x + 10}
          y={celda.y + 13}
          fontSize={14}
          fontFamily={fuentes.negrita}
          fill={colorTexto}
          fillOpacity={celda.estado === 'OCUPADA' ? 0.82 : 1}
        >
          {celda.etiqueta}
        </SvgText>
        {nota ? (
          <SvgText
            x={celda.x + celda.ancho - 10}
            y={celda.y + 13}
            textAnchor="end"
            fontSize={14}
            fontFamily={fuentes.negrita}
            fill={colorTexto}
          >
            {nota}
          </SvgText>
        ) : null}
      </G>
    );
  }
  return (
    <G>
      <Rect
        x={celda.x}
        y={celda.y}
        width={celda.ancho}
        height={celda.alto}
        rx={7}
        fill={fondo}
        stroke={libre ? GRIS : undefined}
        strokeOpacity={0.6}
        strokeDasharray={libre ? '3 3' : undefined}
      />
      <SvgText
        x={celda.x + celda.ancho / 2}
        y={celda.y + celda.alto / 2 + 5}
        textAnchor="middle"
        fontSize={14}
        fontFamily={fuentes.negrita}
        fill={colorTexto}
        fillOpacity={celda.estado === 'OCUPADA' ? 0.82 : 1}
      >
        {celda.etiqueta}
      </SvgText>
    </G>
  );
}

/** Mini-plano: cada unidad es una celda (ocupada en tinta, en mora en rojo, libre rayada). */
export function MiniPlanoOcupacion({ inmuebles }: Props) {
  const [ancho, setAncho] = useState(0);
  const { grupos, alto } = repartirPlano(inmuebles, ancho);
  const unidades = inmuebles.flatMap((i) => i.unidades);
  const ocupadas = unidades.filter((u) => u.estado !== 'LIBRE').length;

  const leyenda = [
    { etiqueta: 'Ocupada', estilo: { backgroundColor: colores.tinta } },
    { etiqueta: 'En mora', estilo: { backgroundColor: MORA } },
    {
      etiqueta: 'Libre',
      estilo: {
        backgroundColor: conAlfa(GRIS, 0.18),
        boxShadow: `inset 0 0 0 1px ${conAlfa(GRIS, 0.5)}`,
      },
    },
  ];

  return (
    <View style={estilos.contenedor}>
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={`Ocupación: ${ocupadas} de ${unidades.length} unidades`}
      >
        {ancho > 0 ? (
          <Svg width={ancho} height={alto}>
            <Defs>
              <Pattern
                id="rayado-libre"
                width={6}
                height={6}
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <Line x1={0} y1={0} x2={0} y2={6} stroke={conAlfa(GRIS, 0.5)} strokeWidth={1.5} />
              </Pattern>
            </Defs>
            {grupos.map((grupo) => (
              <G key={grupo.nombre}>
                {grupo.contorno ? (
                  <Rect
                    x={grupo.contorno.x + 0.5}
                    y={grupo.contorno.y + 0.5}
                    width={grupo.contorno.ancho - 1}
                    height={grupo.contorno.alto - 1}
                    rx={8}
                    fill="none"
                    stroke={tintaAlfa(0.18)}
                  />
                ) : null}
                {grupo.celdas.map((celda) => (
                  <Celda key={`${grupo.nombre}-${celda.etiqueta}-${celda.y}`} celda={celda} />
                ))}
                <SvgText
                  x={grupo.etiqueta.x}
                  y={grupo.etiqueta.y}
                  textAnchor="middle"
                  fontSize={14}
                  fontFamily={fuentes.seminegrita}
                  fill={colores.textoFuerte}
                >
                  {grupo.etiqueta.texto}
                </SvgText>
              </G>
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={estilos.leyenda}>
        {leyenda.map((item) => (
          <View key={item.etiqueta} style={estilos.itemLeyenda}>
            <View style={[estilos.muestra, item.estilo]} />
            <Texto variante="secundario" color={colores.textoFuerte}>
              {item.etiqueta}
            </Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.sm },
  leyenda: { flexDirection: 'row', gap: espaciado.md, flexWrap: 'wrap' },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  muestra: { width: 12, height: 12, borderRadius: 3 },
});
