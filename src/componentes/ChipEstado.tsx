import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { colores, coloresEstado, conAlfa, fuentes, type TonoEstado } from '../tema';
import {
  type DefinicionEstado,
  type EstadoContrato,
  type EstadoDatos,
  type EstadoMantenimiento,
  type EstadoPago,
  type EstadoPagoContrato,
  type EstadoPeriodo,
  type EstadoUnidad,
  type EstadoVinculo,
  etiquetaVenceEn,
  type FormaSenal,
  MAPAS_ESTADO,
  type Urgencia,
  URGENCIAS,
} from './estados';
import { Texto } from './Texto';

type Fondo = 'claro' | 'tinta';

export type PropsChipEstado = { sobre?: Fondo } & (
  | { tipo: 'pago'; estado: EstadoPago }
  | { tipo: 'periodo'; estado: EstadoPeriodo }
  | { tipo: 'pagoContrato'; estado: EstadoPagoContrato }
  | { tipo: 'contrato'; estado: EstadoContrato }
  | { tipo: 'vinculo'; estado: EstadoVinculo }
  | { tipo: 'unidad'; estado: EstadoUnidad }
  | { tipo: 'datos'; estado: EstadoDatos }
  | { tipo: 'mantenimiento'; estado: EstadoMantenimiento }
  | { tipo: 'urgencia'; estado: Urgencia }
  | { tipo: 'venceEn'; dias: number }
);

function Senal({ forma, color, sobre }: { forma: FormaSenal; color: string; sobre: Fondo }) {
  const brillo = `0 0 0 3px ${conAlfa(color, 0.14)}, 0 0 12px ${conAlfa(color, 0.55)}`;
  if (forma === 'hueca') {
    return (
      <View
        style={[
          estilos.senal,
          { borderWidth: 1.5, borderColor: sobre === 'tinta' ? colores.sobreTinta : color },
        ]}
      />
    );
  }
  if (forma === 'media') {
    // "Parcial" enciende media luz: la mitad de abajo llena, la de arriba tenue.
    return (
      <View style={[estilos.senal, { backgroundColor: conAlfa(color, 0.28), boxShadow: brillo }]}>
        <View style={[estilos.mitad, { backgroundColor: color }]} />
      </View>
    );
  }
  return <View style={[estilos.senal, { backgroundColor: color, boxShadow: brillo }]} />;
}

function Cuerpo({
  definicion,
  sobre,
  punteado = false,
}: {
  definicion: Pick<DefinicionEstado, 'etiqueta' | 'tono' | 'senal'>;
  sobre: Fondo;
  punteado?: boolean;
}) {
  const tono = coloresEstado[definicion.tono];
  // Sobre tinta, el éxito brilla en lima (la marca) y el texto va en blanco.
  const senal = sobre === 'tinta' && definicion.tono === 'exito' ? colores.lima : tono.senal;
  const alfa = sobre === 'tinta' ? 0.22 : 0.13;

  return (
    <View
      style={[
        estilos.chip,
        punteado && {
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: conAlfa(tono.senal, 0.7),
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={definicion.etiqueta}
    >
      <LinearGradient
        colors={[conAlfa(senal, alfa), conAlfa(senal, alfa * 0.35), conAlfa(senal, 0)]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, estilos.fondo]}
      />
      <Senal forma={definicion.senal} color={senal} sobre={sobre} />
      <Texto
        variante="etiqueta"
        color={sobre === 'tinta' ? colores.sobreTinta : tono.texto}
        style={estilos.texto}
        numberOfLines={1}
      >
        {definicion.etiqueta}
      </Texto>
    </View>
  );
}

const TONO_URGENCIA: Record<TonoEstado, string> = {
  neutro: coloresEstado.neutro.texto,
  advertencia: coloresEstado.advertencia.texto,
  peligro: coloresEstado.peligro.texto,
  exito: coloresEstado.exito.texto,
  informacion: coloresEstado.informacion.texto,
  programado: coloresEstado.programado.texto,
  tinta: coloresEstado.tinta.texto,
};

/**
 * Estado con "señal": una luz vertical del color del estado más su nombre. Una sola pieza para
 * todos los estados reales del Contexto. La urgencia se escribe con palabras (no es un estado).
 */
export function ChipEstado(props: PropsChipEstado) {
  const sobre = props.sobre ?? 'claro';

  if (props.tipo === 'urgencia') {
    const urgencia = URGENCIAS[props.estado];
    const colorPalabra = sobre === 'tinta' ? colores.sobreTinta : TONO_URGENCIA[urgencia.tono];
    return (
      <View
        style={estilos.urgencia}
        accessibilityLabel={`Urgencia ${urgencia.etiqueta.toLowerCase()}`}
      >
        <Texto
          variante="secundario"
          color={sobre === 'tinta' ? colores.sobreTinta : colores.textoSecundario}
        >
          Urgencia
        </Texto>
        <Texto variante="etiqueta" color={colorPalabra} style={estilos.palabraUrgencia}>
          {urgencia.etiqueta.toLowerCase()}
        </Texto>
      </View>
    );
  }

  if (props.tipo === 'venceEn') {
    return (
      <Cuerpo
        definicion={{ etiqueta: etiquetaVenceEn(props.dias), tono: 'advertencia', senal: 'llena' }}
        sobre={sobre}
        punteado
      />
    );
  }

  const mapa: Record<string, DefinicionEstado> = MAPAS_ESTADO[props.tipo];
  return <Cuerpo definicion={mapa[props.estado]} sobre={sobre} />;
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    height: 30,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 10,
  },
  fondo: { borderRadius: 10 },
  senal: { width: 4, height: 14, borderRadius: 2, justifyContent: 'flex-end' },
  mitad: { height: 7, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  texto: { letterSpacing: -0.1 },
  urgencia: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30 },
  palabraUrgencia: { fontFamily: fuentes.extranegrita },
});
