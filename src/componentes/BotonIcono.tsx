import { Pressable, StyleSheet, View } from 'react-native';

import { alturas, blancoAlfa, colores, tintaAlfa } from '../tema';
import { Icono, type NombreIcono } from './iconos/Icono';

interface Props {
  icono: NombreIcono;
  /** Lo que lee el lector de pantalla ("Alertas", "Volver"). */
  etiqueta: string;
  onPress: () => void;
  /** 48 dp por defecto; 44 dp en barras compactas (Volver, Copiar). */
  tamano?: 'normal' | 'compacto';
  sobreTinta?: boolean;
  /** Punto lima de novedad (alertas sin leer). */
  conPunto?: boolean;
  deshabilitado?: boolean;
}

/** Botón de icono circular. El área táctil nunca baja de 44 dp. */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  tamano = 'normal',
  sobreTinta = false,
  conPunto = false,
  deshabilitado = false,
}: Props) {
  const lado = tamano === 'normal' ? alturas.botonIcono : alturas.botonIconoCompacto;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          width: lado,
          height: lado,
          backgroundColor: sobreTinta
            ? blancoAlfa(pressed ? 0.16 : 0.09)
            : tintaAlfa(pressed ? 0.12 : 0.06),
          opacity: deshabilitado ? 0.4 : 1,
        },
        pressed && estilos.presionado,
      ]}
    >
      <Icono
        nombre={icono}
        tamano={22}
        grosor={1.7}
        color={sobreTinta ? colores.sobreTinta : colores.tinta}
      />
      {conPunto ? (
        <View
          style={[
            estilos.punto,
            { boxShadow: `0 0 0 2px ${sobreTinta ? colores.tinta : colores.superficie}` },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  presionado: { transform: [{ scale: 0.96 }] },
  punto: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.lima,
  },
});
