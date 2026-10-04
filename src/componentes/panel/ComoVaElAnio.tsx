import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PanelArrendador } from '../../api/panel';
import {
  escalarBarras,
  inicialDeMes,
  nombreDelMes,
  textoVariacion,
} from '../../panel/presentacion';
import { colores, coloresEstado, conAlfa, espaciado, fuentes, radios, tintaAlfa } from '../../tema';
import { centavosAPesosAbreviado, centavosAPesosTexto } from '../../utilidades/dinero';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { BarrasPareadas } from '../graficas/BarrasPareadas';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

/** Inmuebles que se ven antes de "Ver todos". */
const INMUEBLES_VISIBLES = 5;

/**
 * "Cómo va el año" (R3-A): ingresos del año en curso frente al anterior (totales, variación y barras
 * pareadas por mes), los ingresos del mes y, debajo, los ingresos del año por inmueble. Todo viene del
 * servidor (`anio`, `ingresos_mes_centavos`, `por_inmueble`); aquí solo se da formato y se escalan barras.
 */
export function ComoVaElAnio({ panel }: { panel: PanelArrendador }) {
  const { anio } = panel;
  const variacion = textoVariacion(anio.variacion_porcentual);
  const valores = escalarBarras(
    anio.meses.flatMap((m) => [m.actual_centavos, m.anterior_centavos]),
  );
  const enCurso = anio.meses.findIndex((m) => m.mes === panel.mes);
  const pares = anio.meses.map((m, i) => ({
    etiqueta: inicialDeMes(m.mes),
    actual: valores[i * 2],
    anterior: valores[i * 2 + 1],
  }));
  const descripcion = `Ingresos de ${anio.anio} frente a ${anio.anio - 1}: ${anio.meses
    .map(
      (m, i) =>
        `${nombreDelMes(m.mes)}${i === enCurso ? ' (en curso)' : ''}: ${centavosAPesosAbreviado(m.actual_centavos)} frente a ${centavosAPesosAbreviado(m.anterior_centavos)}`,
    )
    .join('; ')}`;
  const sinIngresos =
    anio.total_actual_centavos === 0 && anio.meses.every((m) => m.actual_centavos === 0);

  return (
    <View testID="como-va-el-anio" style={estilos.seccion}>
      <EncabezadoSeccion titulo="Cómo va el año" />
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.filaTotal}>
          <View style={estilos.flex}>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Ingresos ${anio.anio}`}
            </Texto>
            <Texto variante="cifraMedia" cifras>
              {centavosAPesosAbreviado(anio.total_actual_centavos)}
            </Texto>
          </View>
          {variacion ? (
            <View
              style={[
                estilos.chip,
                { backgroundColor: conAlfa(coloresEstado[variacion.tono].senal, 0.14) },
              ]}
            >
              <Texto variante="etiqueta" color={coloresEstado[variacion.tono].texto}>
                {variacion.sube ? '↑' : '↓'}
              </Texto>
              <Texto
                variante="etiqueta"
                color={coloresEstado[variacion.tono].texto}
                style={estilos.textoChip}
              >
                {variacion.texto}
              </Texto>
              <Texto variante="secundario" color={coloresEstado[variacion.tono].texto}>
                {`vs ${anio.anio - 1} a la fecha`}
              </Texto>
            </View>
          ) : null}
        </View>
        {sinIngresos ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            Aún no hay ingresos este año
          </Texto>
        ) : null}
        <BarrasPareadas
          pares={pares}
          enCurso={enCurso >= 0 ? enCurso : null}
          descripcion={descripcion}
          leyendaActual={String(anio.anio)}
          leyendaAnterior={String(anio.anio - 1)}
        />
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Ingresos de ${nombreDelMes(panel.mes)}: ${centavosAPesosTexto(panel.ingresos_mes_centavos)}`}
        </Texto>
        <PorInmueble porInmueble={panel.por_inmueble} />
      </Superficie>
    </View>
  );
}

function PorInmueble({ porInmueble }: { porInmueble: PanelArrendador['por_inmueble'] }) {
  const [todos, setTodos] = useState(false);
  if (porInmueble.length === 0) return null;
  const fracciones = escalarBarras(porInmueble.map((i) => i.ingresos_anio_centavos));
  const visibles = todos ? porInmueble : porInmueble.slice(0, INMUEBLES_VISIBLES);
  return (
    <View style={estilos.porInmueble}>
      <View style={estilos.separador} />
      <Texto variante="etiqueta" color={colores.textoFuerte}>
        Por inmueble
      </Texto>
      {visibles.map((inmueble, indice) => (
        <View key={inmueble.inmueble_id} testID="fila-inmueble" style={estilos.filaInmueble}>
          <View style={estilos.filaTextos}>
            <Texto
              variante="secundario"
              color={colores.texto}
              numberOfLines={1}
              style={estilos.flex}
            >
              {inmueble.direccion}
            </Texto>
            <Texto variante="secundario" color={colores.texto} cifras style={estilos.valor}>
              {centavosAPesosAbreviado(inmueble.ingresos_anio_centavos)}
            </Texto>
          </View>
          <View style={estilos.pista}>
            <View
              testID="barra-inmueble"
              style={[estilos.relleno, { width: `${Math.round(fracciones[indice] * 100)}%` }]}
            />
          </View>
        </View>
      ))}
      {!todos && porInmueble.length > INMUEBLES_VISIBLES ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setTodos(true)}
          style={estilos.verTodos}
          hitSlop={8}
        >
          <Texto variante="etiqueta" color={colores.tintaCapa}>
            Ver todos
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.sm },
  filaTotal: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  flex: { flex: 1, minWidth: 0 },
  chip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    maxWidth: '55%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radios.pildora,
  },
  textoChip: { fontFamily: fuentes.extranegrita },
  porInmueble: { gap: espaciado.xs },
  separador: { height: 1, backgroundColor: tintaAlfa(0.07), marginVertical: espaciado.xs },
  filaInmueble: { gap: 4 },
  filaTextos: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  valor: { fontFamily: fuentes.negrita },
  pista: { height: 8, borderRadius: 4, backgroundColor: tintaAlfa(0.07), overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4, backgroundColor: colores.serie },
  verTodos: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
