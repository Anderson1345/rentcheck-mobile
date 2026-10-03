import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alturas, blancoAlfa, colores, espaciado, radios, sombras, tintaAlfa } from '../tema';
import { Icono, type NombreIcono } from './iconos/Icono';
import { Indicador } from './Indicador';
import { Texto } from './Texto';

export type VarianteBoton =
  'primario' | 'acento' | 'secundario' | 'destructivo' | 'confirmarDestructivo' | 'sobreTinta';

interface Apariencia {
  /** Degradado vertical [arriba, abajo] o color plano. */
  fondo: readonly [string, string] | string;
  texto: string;
  icono: string;
  sombra?: string;
  brillo?: number;
  /** Borde fino (variante secundaria). */
  borde?: string;
}

/** Normal y presionado de cada variante, tomados de la hoja de componentes. */
const APARIENCIAS: Record<VarianteBoton, { normal: Apariencia; presionado: Apariencia }> = {
  primario: {
    normal: {
      fondo: [colores.tintaElevada, colores.tinta],
      texto: colores.sobreTinta,
      icono: colores.lima,
      sombra: sombras.botonPrimario,
      brillo: 0.14,
    },
    presionado: {
      fondo: [colores.tintaPresionada, colores.tintaPresionadaBase],
      texto: colores.sobreTinta,
      icono: colores.lima,
      brillo: 0.06,
    },
  },
  acento: {
    normal: {
      fondo: [colores.limaClara, colores.limaBase],
      texto: colores.tinta,
      icono: colores.tinta,
      sombra: sombras.botonAcento,
      brillo: 0.6,
    },
    presionado: {
      fondo: [colores.limaPresionada, colores.limaPresionadaBase],
      texto: colores.tinta,
      icono: colores.tinta,
      brillo: 0.3,
    },
  },
  // R1: botón con borde fino y fondo superficie (antes, una píldora gris). Texto en tinta: contraste AA.
  secundario: {
    normal: {
      fondo: colores.superficie,
      texto: colores.tinta,
      icono: colores.tinta,
      borde: tintaAlfa(0.14),
    },
    presionado: {
      fondo: colores.fondo,
      texto: colores.tinta,
      icono: colores.tinta,
      borde: tintaAlfa(0.24),
    },
  },
  destructivo: {
    normal: {
      fondo: 'rgba(180,35,42,0.09)',
      texto: colores.peligroTexto,
      icono: colores.peligroTexto,
    },
    presionado: {
      fondo: 'rgba(180,35,42,0.16)',
      texto: colores.peligroTexto,
      icono: colores.peligroTexto,
    },
  },
  confirmarDestructivo: {
    normal: {
      fondo: [colores.peligro, colores.peligroBase],
      texto: colores.sobreTinta,
      icono: colores.sobreTinta,
      sombra: sombras.botonPeligro,
      brillo: 0.18,
    },
    presionado: {
      fondo: [colores.peligroBase, colores.peligroTexto],
      texto: colores.sobreTinta,
      icono: colores.sobreTinta,
      brillo: 0.08,
    },
  },
  sobreTinta: {
    normal: {
      fondo: blancoAlfa(0.1),
      texto: colores.sobreTinta,
      icono: colores.sobreTinta,
      brillo: 0.06,
    },
    presionado: {
      fondo: blancoAlfa(0.16),
      texto: colores.sobreTinta,
      icono: colores.sobreTinta,
      brillo: 0.06,
    },
  },
};

const DESHABILITADO: Apariencia = {
  fondo: colores.deshabilitado,
  texto: colores.textoDeshabilitado,
  icono: colores.textoDeshabilitado,
};

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  /** Icono líder opcional. */
  icono?: NombreIcono;
  deshabilitado?: boolean;
  cargando?: boolean;
  /** Texto mientras carga ("Aprobando…"); por defecto, el título. */
  tituloCargando?: string;
  /** Ocupa todo el ancho disponible (o el flex que se pase en `style`). */
  ancho?: 'contenido' | 'completo';
  style?: StyleProp<ViewStyle>;
}

function Fondo({ apariencia }: { apariencia: Apariencia }) {
  if (typeof apariencia.fondo === 'string') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: apariencia.fondo }]} />;
  }
  return <LinearGradient colors={apariencia.fondo} style={StyleSheet.absoluteFill} />;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  deshabilitado = false,
  cargando = false,
  tituloCargando,
  ancho = 'contenido',
  style,
}: Props) {
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => {
        const apariencia = deshabilitado
          ? DESHABILITADO
          : APARIENCIAS[variante][pressed ? 'presionado' : 'normal'];
        return [
          estilos.base,
          ancho === 'completo' && estilos.completo,
          apariencia.sombra ? { boxShadow: apariencia.sombra } : null,
          apariencia.borde ? { borderWidth: 1, borderColor: apariencia.borde } : null,
          pressed && !inactivo && estilos.presionado,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const apariencia = deshabilitado
          ? DESHABILITADO
          : APARIENCIAS[variante][pressed ? 'presionado' : 'normal'];
        return (
          <>
            <View style={estilos.recorte}>
              <Fondo apariencia={apariencia} />
            </View>
            {cargando ? (
              <Indicador
                color={apariencia.icono}
                colorPista={
                  apariencia.texto === colores.sobreTinta ? blancoAlfa(0.22) : tintaAlfa(0.15)
                }
              />
            ) : icono ? (
              <Icono nombre={icono} tamano={20} color={apariencia.icono} grosor={2} />
            ) : null}
            <Texto variante="cuerpoFuerte" color={apariencia.texto} numberOfLines={1}>
              {cargando ? (tituloCargando ?? titulo) : titulo}
            </Texto>
            {apariencia.brillo ? (
              <View
                pointerEvents="none"
                style={[estilos.recorte, { boxShadow: sombras.brillo(apariencia.brillo) }]}
              />
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: alturas.boton,
    borderRadius: radios.medio,
    paddingHorizontal: espaciado.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'flex-start',
  },
  completo: { alignSelf: 'stretch' },
  recorte: { ...StyleSheet.absoluteFill, borderRadius: radios.medio, overflow: 'hidden' },
  presionado: { transform: [{ scale: 0.98 }] },
});
