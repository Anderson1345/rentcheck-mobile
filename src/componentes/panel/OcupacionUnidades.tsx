import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { EstadoOcupacionUnidad, OcupacionPanel } from '../../api/panel';
import { agruparPorInmueble, textoOcupadas } from '../../panel/presentacion';
import { colores, coloresEstado, espaciado, tintaAlfa } from '../../tema';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

/** Cómo se pinta y se nombra cada estado de una unidad (el estado lo da el servidor). */
const ESTADOS: Record<EstadoOcupacionUnidad, { etiqueta: string; estilo: ViewStyle }> = {
  AL_DIA: { etiqueta: 'Al día', estilo: { backgroundColor: colores.serie } },
  EN_MORA: { etiqueta: 'En mora', estilo: { backgroundColor: coloresEstado.peligro.senal } },
  PROGRAMADA: {
    etiqueta: 'Programada',
    estilo: { backgroundColor: coloresEstado.programado.senal },
  },
  LIBRE: {
    etiqueta: 'Libre',
    estilo: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: tintaAlfa(0.3) },
  },
};
const ORDEN_LEYENDA: EstadoOcupacionUnidad[] = ['AL_DIA', 'EN_MORA', 'PROGRAMADA', 'LIBRE'];

/**
 * "Ocupación" (R3-A): "X de Y" unidades ocupadas con el porcentaje del servidor y un cuadro por unidad
 * (8 por fila) con su estado; con más de un inmueble, agrupados con la dirección de cada uno. Los cuadros
 * no navegan: el lector de pantalla dice el nombre y el estado de cada unidad.
 */
export function OcupacionUnidades({ ocupacion }: { ocupacion: OcupacionPanel }) {
  const grupos = agruparPorInmueble(ocupacion.unidades_detalle);
  const conTitulos = grupos.length > 1;
  return (
    <View testID="ocupacion" style={estilos.seccion}>
      <EncabezadoSeccion titulo="Ocupación" />
      <Superficie style={estilos.tarjeta}>
        {ocupacion.unidades === 0 ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Aún no tienes unidades
          </Texto>
        ) : (
          <>
            <View style={estilos.resumen}>
              <Texto variante="cifraMedia" cifras>
                {`${ocupacion.ocupadas} de ${ocupacion.unidades}`}
              </Texto>
              <Texto variante="secundario" color={colores.textoSecundario} style={estilos.flex}>
                {textoOcupadas(ocupacion.porcentaje)}
              </Texto>
            </View>
            {grupos.map((grupo) => (
              <View key={grupo.inmuebleId} testID="grupo-ocupacion" style={estilos.grupo}>
                {conTitulos ? (
                  <Texto variante="secundario" color={colores.textoFuerte} numberOfLines={1}>
                    {grupo.direccion}
                  </Texto>
                ) : null}
                <View style={estilos.cuadros}>
                  {grupo.unidades.map((u) => (
                    <View key={u.unidad_id} style={estilos.celda}>
                      <View
                        testID="cuadro-unidad"
                        accessible
                        accessibilityLabel={`${u.nombre}: ${ESTADOS[u.estado].etiqueta.toLowerCase()}`}
                        style={[estilos.cuadro, ESTADOS[u.estado].estilo]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={estilos.leyenda}>
              {ORDEN_LEYENDA.map((estado) => (
                <View key={estado} style={estilos.item}>
                  <View style={[estilos.muestra, ESTADOS[estado].estilo]} />
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    {ESTADOS[estado].etiqueta}
                  </Texto>
                </View>
              ))}
            </View>
          </>
        )}
      </Superficie>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.sm },
  resumen: { flexDirection: 'row', alignItems: 'baseline', gap: espaciado.xs },
  flex: { flex: 1 },
  grupo: { gap: 6 },
  cuadros: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  celda: { width: `${100 / 8}%`, padding: 3 },
  cuadro: { aspectRatio: 1, borderRadius: 8 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muestra: { width: 12, height: 12, borderRadius: 4 },
});
