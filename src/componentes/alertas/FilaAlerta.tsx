import { StyleSheet, View } from 'react-native';

import type { Alerta } from '../../api/alertas';
import { presentacionDeAlerta } from '../../alertas/presentacion';
import { colores } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { FilaLista } from '../FilaLista';
import { Texto } from '../Texto';

interface Props {
  alerta: Alerta;
  separador: boolean;
  /** La alerta lleva a una pantalla (chevron). Sin destino es informativa. */
  conDestino: boolean;
  /** Sin esta función la fila no es un botón (informativa ya leída: no hay nada que hacer). */
  onPress?: () => void;
}

/**
 * Fila de la lista de alertas: icono con el tono del tipo, título corto, mensaje del servidor, fecha
 * (día de Bogotá, sin "hace 2 h"), punto lima si no está leída y chevron si lleva a una pantalla.
 */
export function FilaAlerta({ alerta, separador, conDestino, onPress }: Props) {
  const presentacion = presentacionDeAlerta(alerta.tipo);
  return (
    <FilaLista
      icono={presentacion.icono}
      tonoIcono={presentacion.tono}
      titulo={presentacion.titulo}
      separador={separador}
      conChevron={conDestino}
      onPress={onPress}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.texto}>
            {alerta.mensaje}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {formatearFechaCorta(alerta.creado_en)}
          </Texto>
        </View>
      }
      valor={
        alerta.leida ? undefined : <View accessibilityLabel="Sin leer" style={estilos.punto} />
      }
    />
  );
}

const estilos = StyleSheet.create({
  detalle: { width: '100%', gap: 2 },
  // Lima sobre fondo claro casi no se ve: el aro de tinta lo asienta (igual que el punto de la campana).
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colores.lima,
    boxShadow: `0 0 0 1.5px ${colores.tinta}`,
  },
});
