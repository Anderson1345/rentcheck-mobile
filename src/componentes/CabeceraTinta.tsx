import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blancoAlfa, colores, espaciado } from '../tema';
import { BotonIcono } from './BotonIcono';
import { MotivoCurvas } from './motivo/MotivoCurvas';
import { Texto } from './Texto';

/** Lo que la cabecera deja por debajo para que el contenido la "muerda" con su borde redondeado. */
export const SOLAPA_CABECERA = 28;

interface Props {
  children: ReactNode;
  /** Deja espacio abajo para un ContenidoBajoCabecera que se monta encima. */
  conSolapa?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bloque de tinta bajo la barra de estado, con el motivo de curvas de nivel. Arriba va la fila de
 * saludo o navegación; debajo, el dato principal (la cifra protagonista).
 */
export function CabeceraTinta({ children, conSolapa = false, style }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View
      style={[
        estilos.cabecera,
        {
          paddingTop: top + espaciado.sm,
          paddingBottom: (conSolapa ? SOLAPA_CABECERA : 0) + espaciado.xl,
        },
        style,
      ]}
    >
      <StatusBar style="light" />
      <MotivoCurvas />
      {children}
    </View>
  );
}

/** Fila superior de una pantalla secundaria: volver + título (+ subtítulo). */
export function TituloCabecera({
  titulo,
  subtitulo,
  onVolver,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  onVolver?: () => void;
  /** Ranura derecha de la fila (p. ej. la campana de alertas). */
  accion?: ReactNode;
}) {
  return (
    <View style={estilos.filaTitulo}>
      {onVolver ? (
        <BotonIcono
          icono="atras"
          etiqueta="Volver"
          tamano="compacto"
          sobreTinta
          onPress={onVolver}
        />
      ) : null}
      <View style={estilos.textosTitulo}>
        <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="secundario" color={blancoAlfa(0.64)} numberOfLines={1}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

/** El cuerpo claro de la pantalla que sube sobre la cabecera con esquinas redondeadas. */
export function ContenidoBajoCabecera({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[estilos.cuerpo, style]}>{children}</View>;
}

const estilos = StyleSheet.create({
  cabecera: {
    backgroundColor: colores.tinta,
    paddingHorizontal: espaciado.lg,
    overflow: 'hidden',
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textosTitulo: { flex: 1, gap: 2 },
  cuerpo: {
    marginTop: -SOLAPA_CABECERA,
    backgroundColor: colores.fondo,
    borderTopLeftRadius: SOLAPA_CABECERA,
    borderTopRightRadius: SOLAPA_CABECERA,
    paddingTop: espaciado.lg,
    paddingHorizontal: espaciado.md,
  },
});
