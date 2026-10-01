import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { blancoAlfa, colores, espaciado, radios } from '../tema';
import { MotivoCurvas } from './motivo/MotivoCurvas';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  mensaje?: string;
  /** Botones debajo del texto. */
  children?: ReactNode;
}

/**
 * Estado de pantalla completa (lista vacía, no encontrado, "Próximamente"): bloque de tinta con el
 * motivo de curvas de la marca, título, mensaje y, si hace falta, las acciones.
 */
export function EstadoMensaje({ titulo, mensaje, children }: Props) {
  return (
    <View style={estilos.bloque}>
      <MotivoCurvas />
      <Texto variante="tituloSeccion" color={colores.sobreTinta} accessibilityRole="header">
        {titulo}
      </Texto>
      {mensaje ? (
        <Texto variante="cuerpo" color={blancoAlfa(0.72)}>
          {mensaje}
        </Texto>
      ) : null}
      {children ? <View style={estilos.acciones}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    backgroundColor: colores.tinta,
    borderRadius: radios.grande,
    overflow: 'hidden',
    padding: espaciado.lg,
    gap: espaciado.xs,
  },
  acciones: { marginTop: espaciado.sm, gap: espaciado.xs },
});
