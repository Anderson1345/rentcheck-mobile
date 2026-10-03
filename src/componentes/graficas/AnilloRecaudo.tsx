import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { blancoAlfa, colores, espaciado, fuentes } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { Texto } from '../Texto';
import { porcentajeEntero, segmentosAnillo } from './geometria';

interface Props {
  aprobadoCentavos: number;
  enRevisionCentavos: number;
  sinReportarCentavos: number;
  /** Sin leyenda (R3-A: la cabecera del Panel pone la suya, abreviada). Por defecto, con leyenda. */
  conLeyenda?: boolean;
}

const LADO = 116;
const RADIO = 52;
const GROSOR = 12;

/**
 * Recaudo del mes sobre tinta: anillo grueso con extremos redondeados (aprobado en lima, en
 * revisión en azul claro; lo sin reportar es la pista) y el porcentaje aprobado al centro.
 */
export function AnilloRecaudo({
  aprobadoCentavos,
  enRevisionCentavos,
  sinReportarCentavos,
  conLeyenda = true,
}: Props) {
  const total = aprobadoCentavos + enRevisionCentavos + sinReportarCentavos;
  const porcentaje = porcentajeEntero(aprobadoCentavos, total);
  const [aprobado, revision] = segmentosAnillo(
    [aprobadoCentavos, enRevisionCentavos, sinReportarCentavos],
    RADIO,
    GROSOR,
  );
  const centro = LADO / 2;

  const leyenda = [
    {
      etiqueta: 'Aprobado',
      centavos: aprobadoCentavos,
      muestra: { backgroundColor: colores.lima },
    },
    {
      etiqueta: 'En revisión',
      centavos: enRevisionCentavos,
      muestra: { backgroundColor: colores.enRevisionSobreTinta },
    },
    {
      etiqueta: 'Sin reportar',
      centavos: sinReportarCentavos,
      muestra: { boxShadow: `inset 0 0 0 1.5px ${blancoAlfa(0.45)}` },
    },
  ];

  return (
    <View style={estilos.fila}>
      <View
        style={estilos.anillo}
        accessibilityRole="image"
        accessibilityLabel={`${porcentaje} % del recaudo del mes aprobado`}
      >
        <Svg width={LADO} height={LADO}>
          <Circle
            cx={centro}
            cy={centro}
            r={RADIO}
            fill="none"
            stroke={colores.tintaCapa}
            strokeWidth={GROSOR}
          />
          {[
            { segmento: aprobado, color: colores.lima },
            { segmento: revision, color: colores.enRevisionSobreTinta },
          ].map(({ segmento, color }) =>
            segmento ? (
              <Circle
                key={color}
                cx={centro}
                cy={centro}
                r={RADIO}
                fill="none"
                stroke={color}
                strokeWidth={GROSOR}
                strokeLinecap="round"
                strokeDasharray={`${segmento.largo} ${segmento.circunferencia}`}
                strokeDashoffset={segmento.desfase}
                transform={`rotate(-90 ${centro} ${centro})`}
              />
            ) : null,
          )}
        </Svg>
        <View style={estilos.centro}>
          <Texto variante="cifraMedia" color={colores.sobreTinta} cifras style={estilos.porcentaje}>
            {porcentaje}
            <Texto variante="cuerpo" color={blancoAlfa(0.7)} style={estilos.signo}>
              %
            </Texto>
          </Texto>
          <Texto variante="secundario" color={blancoAlfa(0.62)}>
            aprobado
          </Texto>
        </View>
      </View>

      {conLeyenda ? (
        <View style={estilos.leyenda}>
          {leyenda.map((item) => (
            <View key={item.etiqueta} style={estilos.itemLeyenda}>
              <View style={estilos.filaEtiqueta}>
                <View style={[estilos.muestra, item.muestra]} />
                <Texto
                  variante="secundario"
                  color={blancoAlfa(0.68)}
                  style={estilos.etiquetaLeyenda}
                >
                  {item.etiqueta}
                </Texto>
              </View>
              <Texto
                variante="cuerpoFuerte"
                color={colores.sobreTinta}
                cifras
                style={estilos.valor}
              >
                {centavosAPesosTexto(item.centavos)}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  anillo: { width: LADO, height: LADO },
  centro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  porcentaje: { lineHeight: 30 },
  signo: { fontFamily: fuentes.seminegrita },
  leyenda: { flex: 1, gap: 10 },
  itemLeyenda: { gap: 2 },
  filaEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  muestra: { width: 9, height: 9, borderRadius: 3 },
  etiquetaLeyenda: { fontFamily: fuentes.media },
  valor: { paddingLeft: 17, letterSpacing: -0.2 },
});
