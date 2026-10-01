import { StyleSheet, View } from 'react-native';

import { colores, coloresEstado, conAlfa, fuentes } from '../../tema';
import { ESTADOS_PERIODO, type EstadoPeriodo } from '../estados';
import { Texto } from '../Texto';

export interface PeriodoLinea {
  /** Inicial del mes ("S"). */
  inicial: string;
  /** Nombre completo para el lector de pantalla ("septiembre"). */
  mes: string;
  estado: EstadoPeriodo;
  /** El período actual se resalta con fondo lima. */
  actual?: boolean;
}

interface Props {
  periodos: readonly PeriodoLinea[];
}

function Barra({ estado }: { estado: EstadoPeriodo }) {
  const definicion = ESTADOS_PERIODO[estado];
  const color = coloresEstado[definicion.tono].senal;
  const brillo = `0 0 10px ${conAlfa(color, 0.45)}`;

  if (estado === 'PENDIENTE') {
    // Por vencer: todavía no hay nada que mostrar, solo el contorno.
    return (
      <View
        style={[
          estilos.barra,
          { backgroundColor: conAlfa(color, 0.15), borderWidth: 1.5, borderColor: color },
        ]}
      />
    );
  }
  if (definicion.senal === 'media') {
    return (
      <View style={[estilos.barra, { backgroundColor: conAlfa(color, 0.25), boxShadow: brillo }]}>
        <View style={[estilos.mitad, { backgroundColor: color }]} />
      </View>
    );
  }
  return <View style={[estilos.barra, { backgroundColor: color, boxShadow: brillo }]} />;
}

/** Historial de 12 meses: una señal por período con el color de su estado. Sin cálculos. */
export function LineaTiempoPeriodos({ periodos }: Props) {
  const descripcion = periodos
    .map((p) => `${p.mes}: ${ESTADOS_PERIODO[p.estado].etiqueta}`)
    .join(', ');
  return (
    <View
      style={estilos.fila}
      accessibilityRole="image"
      accessibilityLabel={`Historial de pagos. ${descripcion}`}
    >
      {periodos.map((periodo, i) => (
        <View key={`${periodo.mes}-${i}`} style={estilos.columna}>
          <View style={[estilos.ranura, periodo.actual && estilos.ranuraActual]}>
            <Barra estado={periodo.estado} />
          </View>
          <Texto
            variante="secundario"
            color={periodo.actual ? colores.texto : colores.textoSecundario}
            style={periodo.actual ? estilos.inicialActual : estilos.inicial}
          >
            {periodo.inicial}
          </Texto>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row' },
  columna: { flex: 1, alignItems: 'center', gap: 8 },
  ranura: {
    width: 22,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ranuraActual: { backgroundColor: conAlfa(colores.lima, 0.45) },
  barra: { width: 8, height: 26, borderRadius: 4, justifyContent: 'flex-end' },
  mitad: { height: 13, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  inicial: { fontFamily: fuentes.media },
  inicialActual: { fontFamily: fuentes.extranegrita },
});
