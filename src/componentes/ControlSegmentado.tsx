import { Pressable, StyleSheet, View } from 'react-native';

import { alturas, colores, fuentes, radios, sombras, tintaAlfa } from '../tema';
import { Texto } from './Texto';

export interface OpcionSegmento<T extends string> {
  valor: T;
  etiqueta: string;
  /** Contador opcional ("Por validar 3"). */
  contador?: number;
  /** Lo que el lector agrega a la etiqueta ("ordenado por urgencia"), antes del contador. */
  descripcion?: string;
}

interface Props<T extends string> {
  opciones: readonly OpcionSegmento<T>[];
  valor: T;
  onCambio: (valor: T) => void;
}

/** Filtro en píldora: la opción activa es una píldora blanca con sombra. */
export function ControlSegmentado<T extends string>({ opciones, valor, onCambio }: Props<T>) {
  return (
    <View accessibilityRole="tablist" style={estilos.contenedor}>
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={[
              opcion.etiqueta,
              opcion.descripcion,
              opcion.contador !== undefined ? String(opcion.contador) : undefined,
            ]
              .filter(Boolean)
              .join(', ')}
            onPress={() => onCambio(opcion.valor)}
            // La opción mide 40 dp (48 menos el relleno): 2 dp más por arriba y por abajo llegan a 44.
            hitSlop={{ top: 2, bottom: 2 }}
            style={[estilos.opcion, activa && estilos.activa]}
          >
            <Texto
              variante="etiqueta"
              color={activa ? colores.tinta : colores.textoFuerte}
              style={!activa && estilos.inactiva}
              numberOfLines={1}
            >
              {opcion.etiqueta}
            </Texto>
            {opcion.contador !== undefined ? (
              <View
                style={[
                  estilos.contador,
                  activa ? estilos.contadorActivo : estilos.contadorInactivo,
                ]}
              >
                <Texto
                  variante="etiqueta"
                  cifras
                  color={activa ? colores.lima : colores.textoFuerte}
                  style={estilos.textoContador}
                >
                  {opcion.contador > 99 ? '99+' : opcion.contador}
                </Texto>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: alturas.segmentado,
    padding: 4,
    borderRadius: radios.pildora,
    backgroundColor: tintaAlfa(0.06),
    flexDirection: 'row',
    gap: 2,
  },
  opcion: {
    flex: 1,
    borderRadius: radios.pildora,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  activa: { backgroundColor: colores.superficie, boxShadow: sombras.segmentoActivo },
  inactiva: { fontFamily: fuentes.seminegrita },
  contador: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorActivo: { backgroundColor: colores.tinta },
  contadorInactivo: { backgroundColor: tintaAlfa(0.08) },
  textoContador: { fontFamily: fuentes.extranegrita, lineHeight: 18 },
});
