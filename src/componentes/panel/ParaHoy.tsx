import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PendientesPanel } from '../../api/panel';
import { mosaicosParaHoy } from '../../panel/presentacion';
import { colores, coloresEstado, conAlfa, espaciado, fuentes, radios, sombras } from '../../tema';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { Icono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

/**
 * "Para hoy" (R3-A): un mosaico por cada pendiente con algo por hacer (3 por fila, envuelven), con su
 * número, su texto y a dónde lleva. Si no hay nada, una sola línea positiva. Los conteos son del servidor.
 */
export function ParaHoy({ pendientes }: { pendientes: PendientesPanel }) {
  const router = useRouter();
  const mosaicos = mosaicosParaHoy(pendientes);
  return (
    <View testID="para-hoy" style={estilos.seccion}>
      <EncabezadoSeccion titulo="Para hoy" />
      {mosaicos.length === 0 ? (
        <Superficie style={estilos.todoAlDia}>
          <View
            style={[estilos.icono, { backgroundColor: conAlfa(coloresEstado.exito.senal, 0.14) }]}
          >
            <Icono nombre="aprobar" tamano={20} color={coloresEstado.exito.texto} grosor={2} />
          </View>
          <Texto variante="cuerpoFuerte">Todo al día por hoy</Texto>
        </Superficie>
      ) : (
        <View style={estilos.grilla}>
          {mosaicos.map((m) => (
            <View key={m.clave} style={estilos.celda}>
              <Pressable
                testID="mosaico-hoy"
                accessibilityRole="button"
                accessibilityLabel={`${m.cantidad} ${m.texto}${m.urgentes ? ` ${m.urgentes}` : ''}`}
                onPress={() => router.push(m.destino)}
                style={({ pressed }) => [estilos.mosaico, pressed && estilos.presionado]}
              >
                <View
                  style={[
                    estilos.icono,
                    { backgroundColor: conAlfa(coloresEstado[m.tono].senal, 0.14) },
                  ]}
                >
                  <Icono nombre={m.icono} tamano={20} color={coloresEstado[m.tono].texto} />
                </View>
                <Texto variante="cifraMedia" cifras style={estilos.numero}>
                  {String(m.cantidad)}
                </Texto>
                <Texto variante="secundario" color={colores.textoFuerte} numberOfLines={3}>
                  {m.texto}
                  {m.urgentes ? ' ' : null}
                  {m.urgentes ? (
                    <Texto
                      variante="secundario"
                      color={coloresEstado.peligro.texto}
                      style={estilos.urgentes}
                    >
                      {m.urgentes}
                    </Texto>
                  ) : null}
                </Texto>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.xs },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  celda: { width: `${100 / 3}%`, padding: 5 },
  mosaico: {
    flex: 1,
    minHeight: 128,
    padding: 12,
    gap: 4,
    borderRadius: radios.grande - 4,
    backgroundColor: colores.superficie,
    boxShadow: sombras.tarjeta,
  },
  presionado: { opacity: 0.85 },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { marginTop: 4 },
  urgentes: { fontFamily: fuentes.negrita },
  todoAlDia: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
});
