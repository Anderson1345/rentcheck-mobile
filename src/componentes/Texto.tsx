import { StyleSheet, Text, type TextProps } from 'react-native';

import { cifras as estiloCifras, colores, tipografia } from '../tema';

export type VarianteTexto = keyof typeof tipografia;

interface Props extends TextProps {
  variante?: VarianteTexto;
  color?: string;
  /** Cifras de ancho fijo (montos, porcentajes, fechas). */
  cifras?: boolean;
}

/**
 * Todo texto de la app pasa por aquí: aplica Manrope y la escala tipográfica del tema.
 * En Android cada peso es una familia distinta, por eso el peso va en `variante`, no en fontWeight.
 */
export function Texto({
  variante = 'cuerpo',
  color = colores.texto,
  cifras = false,
  style,
  ...resto
}: Props) {
  return (
    <Text {...resto} style={[tipografia[variante], { color }, cifras && estilos.cifras, style]} />
  );
}

const estilos = StyleSheet.create({
  cifras: estiloCifras,
});
