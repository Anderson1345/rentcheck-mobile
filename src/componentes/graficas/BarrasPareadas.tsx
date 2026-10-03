import { StyleSheet, View } from 'react-native';

import { colores, espaciado, fuentes, tintaAlfa } from '../../tema';
import { Texto } from '../Texto';

export interface ParBarras {
  /** Etiqueta bajo el par (una letra: "E", "F"…). */
  etiqueta: string;
  /** Alto de cada barra como fracción (0 a 1) del valor más alto de la gráfica. */
  anterior: number;
  actual: number;
}

interface Props {
  pares: readonly ParBarras[];
  /** Índice del par del mes en curso (se resalta en lima con borde tinta); null si ninguno. */
  enCurso: number | null;
  /** Resumen de los valores para el lector de pantalla. */
  descripcion: string;
  leyendaActual: string;
  leyendaAnterior: string;
}

const ALTO = 120;
/** Una barra con valor no baja de este alto, para que se vea. */
const ALTO_MINIMO = 3;

const alto = (fraccion: number) =>
  fraccion <= 0 ? 0 : Math.max(ALTO_MINIMO, Math.round(fraccion * ALTO));

/**
 * Barras pareadas por mes (R3-A, "Cómo va el año"): el año anterior en gris claro y el actual en el tono
 * de la serie; el mes en curso en lima con borde tinta. Con Views (sin librería de gráficas). Los altos
 * llegan ya escalados: la gráfica no calcula nada.
 */
export function BarrasPareadas({
  pares,
  enCurso,
  descripcion,
  leyendaActual,
  leyendaAnterior,
}: Props) {
  return (
    <View style={estilos.contenedor}>
      <View
        testID="barras-anio"
        accessible
        accessibilityRole="image"
        accessibilityLabel={descripcion}
        style={estilos.grafica}
      >
        <View style={estilos.barras}>
          {pares.map((par, indice) => (
            <View key={indice} style={estilos.columna}>
              <View style={estilos.par}>
                <View
                  testID="barra-anterior"
                  style={[estilos.barra, estilos.anterior, { height: alto(par.anterior) }]}
                />
                <View
                  testID={indice === enCurso ? 'barra-en-curso' : 'barra-actual'}
                  style={[
                    estilos.barra,
                    indice === enCurso ? estilos.enCurso : estilos.actual,
                    { height: alto(par.actual) },
                  ]}
                />
              </View>
              <Texto
                variante="pestana"
                color={indice === enCurso ? colores.texto : colores.textoSecundario}
                style={estilos.etiqueta}
              >
                {par.etiqueta}
              </Texto>
            </View>
          ))}
        </View>
      </View>
      <View style={estilos.leyenda}>
        <Muestra estilo={estilos.actual} texto={leyendaActual} />
        <Muestra estilo={estilos.anterior} texto={leyendaAnterior} />
        <Muestra estilo={estilos.enCurso} texto="Mes en curso" />
      </View>
    </View>
  );
}

function Muestra({ estilo, texto }: { estilo: object; texto: string }) {
  return (
    <View style={estilos.item}>
      <View style={[estilos.muestra, estilo]} />
      <Texto variante="secundario" color={colores.textoSecundario}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.sm },
  grafica: { paddingTop: espaciado.xs },
  barras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: tintaAlfa(0.1),
    minHeight: ALTO + 24,
  },
  columna: { flex: 1, alignItems: 'center', gap: 4 },
  par: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: ALTO },
  barra: { width: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  anterior: { backgroundColor: tintaAlfa(0.14) },
  actual: { backgroundColor: colores.serie },
  enCurso: { backgroundColor: colores.lima, borderWidth: 1.5, borderColor: colores.tinta },
  etiqueta: { fontFamily: fuentes.seminegrita },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muestra: { width: 10, height: 10, borderRadius: 3 },
});
