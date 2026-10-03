import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MoraPanel, PanelArrendador } from '../../api/panel';
import { inicialesDe } from '../../contratos/lectura';
import { destinoCartera } from '../../panel/destinos';
import { textoDias, textoMora, tonoDiasMora } from '../../panel/presentacion';
import { colores, coloresEstado, conAlfa, espaciado, fuentes, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { Icono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

type Moroso = PanelArrendador['morosos'][number];

/**
 * "Quién te debe" (R3-A): el total en mora, cuántos contratos y períodos, y una fila por contrato en mora
 * (hasta 10, en el orden del servidor: más deuda primero). Cada fila abre el contrato; "Ver cartera" abre
 * la lista de contratos con el filtro "En mora". Sin mora, la sección dice "Nadie te debe".
 */
export function QuienTeDebe({ mora, morosos }: { mora: MoraPanel; morosos: Moroso[] }) {
  const router = useRouter();
  const hayMora = mora.contratos > 0 || mora.total_centavos > 0;
  return (
    <View testID="quien-te-debe" style={estilos.seccion}>
      <EncabezadoSeccion
        titulo="Quién te debe"
        enlace={
          hayMora
            ? { etiqueta: 'Ver cartera', onPress: () => router.push(destinoCartera()) }
            : undefined
        }
      />
      {hayMora ? (
        <Superficie relleno="ninguno">
          <View style={estilos.resumen}>
            <View style={estilos.flex}>
              <Texto variante="secundario" color={colores.textoSecundario}>
                En mora hoy
              </Texto>
              <Texto variante="cifraMedia" cifras color={coloresEstado.peligro.texto}>
                {centavosAPesosTexto(mora.total_centavos)}
              </Texto>
            </View>
            <Texto variante="secundario" color={colores.textoSecundario} style={estilos.conteo}>
              {textoMora(mora)}
            </Texto>
          </View>
          {morosos.map((m) => (
            <FilaMoroso
              key={m.contrato_id}
              moroso={m}
              onPress={() =>
                router.push({ pathname: '/contrato/[id]', params: { id: m.contrato_id } })
              }
            />
          ))}
        </Superficie>
      ) : (
        <Superficie style={estilos.nadie}>
          <View
            style={[estilos.icono, { backgroundColor: conAlfa(coloresEstado.exito.senal, 0.14) }]}
          >
            <Icono nombre="aprobar" tamano={20} color={coloresEstado.exito.texto} grosor={2} />
          </View>
          <Texto variante="cuerpoFuerte">Nadie te debe</Texto>
        </Superficie>
      )}
    </View>
  );
}

function FilaMoroso({ moroso: m, onPress }: { moroso: Moroso; onPress: () => void }) {
  const nombre = m.inquilino?.nombre ?? 'Sin nombre';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`Debe ${centavosAPesosTexto(m.monto_centavos)}, ${textoDias(m.dias_mora)} de mora`}
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
    >
      <View style={estilos.iniciales}>
        <Texto variante="etiqueta" color={colores.lima} style={estilos.textoIniciales}>
          {inicialesDe(m.inquilino?.nombre ?? '')}
        </Texto>
      </View>
      <View style={estilos.flex}>
        <Texto variante="filaTitulo" numberOfLines={1}>
          {nombre}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
          {`${m.unidad.nombre} · ${m.inmueble.direccion}`}
        </Texto>
      </View>
      <View style={estilos.derecha}>
        <Texto variante="cuerpoFuerte" cifras>
          {centavosAPesosTexto(m.monto_centavos)}
        </Texto>
        <Texto
          variante="secundario"
          color={coloresEstado[tonoDiasMora(m.dias_mora)].texto}
          style={estilos.dias}
        >
          {textoDias(m.dias_mora)}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.xs },
  resumen: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: tintaAlfa(0.07),
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  conteo: { textAlign: 'right' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: espaciado.md,
    minHeight: 64,
  },
  presionada: { backgroundColor: tintaAlfa(0.04) },
  iniciales: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colores.tintaCapa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoIniciales: { fontFamily: fuentes.extranegrita },
  derecha: { alignItems: 'flex-end' },
  dias: { fontFamily: fuentes.negrita },
  nadie: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
