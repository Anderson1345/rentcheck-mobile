import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alturas, colores, fuentes, sombras, tintaAlfa } from '../../tema';
import { Icono } from '../iconos/Icono';
import { Texto } from '../Texto';
import { type PestanaNav, textoInsignia } from './configuracion';

interface Props {
  pestanas: readonly PestanaNav[];
  activa: string;
  onSeleccionar: (clave: string) => void;
  /** Insignias numéricas por clave (p. ej. { pagos: 3 }). */
  insignias?: Partial<Record<string, number>>;
}

/**
 * Barra inferior propia. La pestaña activa pasa de contorno a duotono con una píldora detrás;
 * las etiquetas siempre se ven (12 sp para que quepan en 360 dp).
 *
 * Se conecta a Expo Router con `<Tabs tabBar={(p) => <NavInferior pestanas={…}
 * activa={p.state.routes[p.state.index].name} onSeleccionar={(c) => p.navigation.navigate(c)} />}>`
 * (ver app/(arrendador)/(pestanas)/_layout.tsx).
 */
export function NavInferior({ pestanas, activa, onSeleccionar, insignias = {} }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        estilos.barra,
        {
          paddingBottom: Math.max(bottom, 8),
          height: alturas.barraInferior + Math.max(bottom - 8, 0),
        },
      ]}
    >
      {pestanas.map((pestana) => {
        const esActiva = pestana.clave === activa;
        const insignia = textoInsignia(insignias[pestana.clave]);
        const color = esActiva ? colores.tinta : colores.textoSecundario;
        return (
          <Pressable
            key={pestana.clave}
            accessibilityRole="tab"
            accessibilityState={{ selected: esActiva }}
            accessibilityLabel={
              insignia ? `${pestana.etiqueta}, ${insignia} pendientes` : pestana.etiqueta
            }
            onPress={() => onSeleccionar(pestana.clave)}
            style={estilos.pestana}
          >
            <View style={[estilos.pildora, esActiva && estilos.pildoraActiva]}>
              <Icono
                nombre={pestana.icono}
                variante={esActiva ? 'duotono' : 'contorno'}
                color={color}
                grosor={esActiva ? 1.75 : 1.6}
              />
              {insignia ? (
                <View style={estilos.insignia}>
                  <Texto
                    variante="etiqueta"
                    cifras
                    color={colores.lima}
                    style={estilos.textoInsignia}
                  >
                    {insignia}
                  </Texto>
                </View>
              ) : null}
            </View>
            <Texto
              variante="pestana"
              color={color}
              numberOfLines={1}
              style={esActiva && estilos.etiquetaActiva}
            >
              {pestana.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: colores.superficie,
    boxShadow: sombras.barraInferior,
  },
  pestana: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingTop: 10 },
  pildora: {
    width: 60,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pildoraActiva: { backgroundColor: tintaAlfa(0.08) },
  insignia: {
    position: 'absolute',
    top: -5,
    left: 36,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 2px ${colores.superficie}`,
  },
  textoInsignia: { fontFamily: fuentes.extranegrita, lineHeight: 18 },
  etiquetaActiva: { fontFamily: fuentes.negrita },
});
