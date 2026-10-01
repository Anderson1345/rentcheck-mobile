import { StyleSheet, View } from 'react-native';

import { colores, coloresEstado, conAlfa, espaciado, radios, type TonoEstado } from '../tema';
import { Texto } from './Texto';

interface Props {
  mensaje: string;
  /** peligro para errores; advertencia para avisos como "Tu sesión venció"; éxito al confirmar. */
  tono?: Extract<TonoEstado, 'peligro' | 'advertencia' | 'informacion' | 'exito'>;
}

/** Mensaje en línea con la "señal" vertical del sistema de estados. Lo lee el lector de pantalla. */
export function Aviso({ mensaje, tono = 'peligro' }: Props) {
  const color = coloresEstado[tono];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.caja, { backgroundColor: conAlfa(color.senal, 0.1) }]}
    >
      <View style={[estilos.senal, { backgroundColor: color.senal }]} />
      <Texto
        variante="secundario"
        color={tono === 'peligro' ? colores.texto : color.texto}
        style={estilos.texto}
      >
        {mensaje}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: espaciado.sm,
    borderRadius: radios.pequeno,
    paddingVertical: espaciado.sm,
    paddingRight: espaciado.md,
    paddingLeft: espaciado.sm,
  },
  senal: { width: 4, borderRadius: 2 },
  texto: { flex: 1 },
});
