import { Pressable, StyleSheet, View } from 'react-native';

import type { Alerta } from '../../api/alertas';
import { presentacionDeAlerta } from '../../alertas/presentacion';
import { colores, coloresEstado, conAlfa, espaciado, tintaAlfa } from '../../tema';
import { Icono } from '../iconos/Icono';
import { Texto } from '../Texto';

interface Props {
  alerta: Alerta;
  /** Hora (Hoy, Ayer), día abreviado (Esta semana) o fecha (Antes), ya en Bogotá. */
  tiempo: string;
  separador: boolean;
  /** La alerta lleva a una pantalla (chevron). Sin destino es informativa. */
  conDestino: boolean;
  /** Sin esta función la fila no es un botón (informativa ya leída: no hay nada que hacer). */
  onPress?: () => void;
}

/**
 * Fila de alertas (R3-B, maqueta Alertas): icono con el tono del tipo, título corto y su hora o fecha,
 * el mensaje del servidor, punto lima si no está leída y chevron si lleva a una pantalla. Las leídas se
 * ven más tenues.
 */
export function FilaAlerta({ alerta, tiempo, separador, conDestino, onPress }: Props) {
  const presentacion = presentacionDeAlerta(alerta.tipo);
  const tono = coloresEstado[presentacion.tono];
  const contenido = (
    <>
      <View style={[estilos.icono, { backgroundColor: conAlfa(tono.senal, 0.14) }]}>
        <Icono nombre={presentacion.icono} tamano={20} color={tono.texto} grosor={2} />
      </View>
      <View style={estilos.textos}>
        <View style={estilos.encabezado}>
          <Texto variante="filaTitulo" numberOfLines={1} style={estilos.titulo}>
            {presentacion.titulo}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} cifras>
            {tiempo}
          </Texto>
        </View>
        <Texto variante="secundario" color={colores.textoFuerte}>
          {alerta.mensaje}
        </Texto>
      </View>
      {alerta.leida ? null : <View accessibilityLabel="Sin leer" style={estilos.punto} />}
      {conDestino ? (
        <Icono nombre="adelante" tamano={18} color={colores.iconoTenue} grosor={1.8} />
      ) : null}
    </>
  );

  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            estilos.fila,
            alerta.leida && estilos.leida,
            pressed && estilos.presionada,
          ]}
        >
          {contenido}
        </Pressable>
      ) : (
        <View style={[estilos.fila, alerta.leida && estilos.leida]}>{contenido}</View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  leida: { opacity: 0.72 },
  presionada: { backgroundColor: tintaAlfa(0.03) },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  encabezado: { flexDirection: 'row', alignItems: 'baseline', gap: espaciado.xs },
  titulo: { flex: 1 },
  // Lima sobre fondo claro casi no se ve: el aro de tinta lo asienta (igual que el punto de la campana).
  punto: {
    width: 10,
    height: 10,
    marginTop: 6,
    borderRadius: 5,
    backgroundColor: colores.lima,
    boxShadow: `0 0 0 1.5px ${colores.tinta}`,
  },
  separador: { height: 1, marginLeft: 66, backgroundColor: tintaAlfa(0.07) },
});
