import { StyleSheet, View } from 'react-native';

import type { PanelArrendador, RecaudoPanel } from '../../api/panel';
import { mesYAnio } from '../../panel/presentacion';
import { useSesion } from '../../sesion/SesionProvider';
import { blancoAlfa, colores, espaciado } from '../../tema';
import { centavosAPesosAbreviado, centavosAPesosTexto } from '../../utilidades/dinero';
import { CampanaAlertas } from '../alertas/CampanaAlertas';
import { AvatarRelieve } from '../avatar/AvatarRelieve';
import { CabeceraTinta } from '../CabeceraTinta';
import { AnilloRecaudo } from '../graficas/AnilloRecaudo';
import { Texto } from '../Texto';

/**
 * Recaudo del mes sobre tinta (maqueta Panel): el anillo con el porcentaje aprobado a la izquierda y, a la
 * derecha, "Recaudado este mes", lo aprobado, de cuánto se esperaba y la leyenda abreviada (en revisión y
 * lo que falta). Todas las cifras son las del servidor. Sin recaudo esperado no se dibuja un anillo vacío.
 */
function RecaudoDelMes({ recaudo }: { recaudo: RecaudoPanel }) {
  if (recaudo.esperado_centavos <= 0) {
    return (
      <View style={estilos.sinRecaudo}>
        <Texto variante="secundario" color={blancoAlfa(0.68)}>
          Recaudado este mes
        </Texto>
        <Texto variante="cifraMedia" color={colores.sobreTinta} cifras>
          {centavosAPesosTexto(recaudo.aprobado_centavos)}
        </Texto>
        <Texto variante="secundario" color={blancoAlfa(0.68)}>
          Aún no hay recaudo esperado este mes.
        </Texto>
      </View>
    );
  }
  return (
    <View style={estilos.recaudo}>
      <AnilloRecaudo
        aprobadoCentavos={recaudo.aprobado_centavos}
        enRevisionCentavos={recaudo.en_revision_centavos}
        sinReportarCentavos={recaudo.sin_reportar_centavos}
        conLeyenda={false}
      />
      <View style={estilos.textosRecaudo}>
        <Texto variante="secundario" color={blancoAlfa(0.68)}>
          Recaudado este mes
        </Texto>
        <Texto variante="cifraMedia" color={colores.sobreTinta} cifras numberOfLines={1}>
          {centavosAPesosTexto(recaudo.aprobado_centavos)}
        </Texto>
        <Texto variante="secundario" color={blancoAlfa(0.68)}>
          {`de ${centavosAPesosTexto(recaudo.esperado_centavos)} esperados`}
        </Texto>
        <View style={estilos.leyenda}>
          <View style={estilos.itemLeyenda}>
            <View style={[estilos.muestra, { backgroundColor: colores.enRevisionSobreTinta }]} />
            <Texto variante="secundario" color={blancoAlfa(0.8)}>
              {`En revisión ${centavosAPesosAbreviado(recaudo.en_revision_centavos)}`}
            </Texto>
          </View>
          <View style={estilos.itemLeyenda}>
            <View style={[estilos.muestra, estilos.muestraFalta]} />
            <Texto variante="secundario" color={blancoAlfa(0.8)}>
              {`Falta ${centavosAPesosAbreviado(recaudo.sin_reportar_centavos)}`}
            </Texto>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Cabecera de tinta del Panel: mes, saludo, campana de alertas y, con datos, el recaudo del mes. */
export function CabeceraPanel({ panel }: { panel: PanelArrendador | undefined }) {
  const { usuario } = useSesion();
  const nombre = usuario?.nombre ?? '';
  return (
    <CabeceraTinta conSolapa>
      <View style={estilos.saludo}>
        <AvatarRelieve nombre={nombre} tamano={40} />
        <View style={estilos.textos}>
          <Texto variante="secundario" color={blancoAlfa(0.64)}>
            {panel ? mesYAnio(panel.mes) : 'Arrendador'}
          </Texto>
          <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
            {`Hola, ${nombre}`}
          </Texto>
        </View>
        <CampanaAlertas rol="arrendador" />
      </View>
      {panel ? <RecaudoDelMes recaudo={panel.recaudo} /> : null}
    </CabeceraTinta>
  );
}

const estilos = StyleSheet.create({
  saludo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textos: { flex: 1, gap: 2 },
  recaudo: {
    marginTop: espaciado.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.lg,
  },
  sinRecaudo: { marginTop: espaciado.xl, gap: espaciado.xxs },
  textosRecaudo: { flex: 1, gap: 2 },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: espaciado.sm,
    rowGap: 4,
    marginTop: 6,
  },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muestra: { width: 8, height: 8, borderRadius: 3 },
  muestraFalta: { boxShadow: `inset 0 0 0 1.5px ${blancoAlfa(0.45)}` },
});
