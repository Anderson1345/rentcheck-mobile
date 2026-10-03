import { StyleSheet, View } from 'react-native';

import type { PanelArrendador, RecaudoPanel } from '../../api/panel';
import { nombreDelMes, mesYAnio } from '../../panel/presentacion';
import { useSesion } from '../../sesion/SesionProvider';
import { blancoAlfa, colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { CampanaAlertas } from '../alertas/CampanaAlertas';
import { AvatarRelieve } from '../avatar/AvatarRelieve';
import { CabeceraTinta } from '../CabeceraTinta';
import { AnilloRecaudo } from '../graficas/AnilloRecaudo';
import { Texto } from '../Texto';

/**
 * Recaudo del mes sobre tinta: lo aprobado, de cuánto se esperaba, y el anillo con aprobado, en
 * revisión y sin reportar. Todas las cifras son las del servidor, tal cual; el porcentaje del anillo
 * sale de esas tres. Sin recaudo esperado (arrendador nuevo) no se dibuja un anillo vacío.
 */
function RecaudoDelMes({ recaudo, mes }: { recaudo: RecaudoPanel; mes: string }) {
  return (
    <View style={estilos.recaudo}>
      <Texto variante="secundario" color={blancoAlfa(0.68)}>
        {`Recaudado en ${nombreDelMes(mes)}`}
      </Texto>
      <Texto variante="cifraProtagonista" color={colores.sobreTinta} cifras>
        {centavosAPesosTexto(recaudo.aprobado_centavos)}
      </Texto>
      {recaudo.esperado_centavos > 0 ? (
        <>
          <Texto variante="secundario" color={blancoAlfa(0.68)}>
            {`de ${centavosAPesosTexto(recaudo.esperado_centavos)} esperados`}
          </Texto>
          <View style={estilos.anillo}>
            <AnilloRecaudo
              aprobadoCentavos={recaudo.aprobado_centavos}
              enRevisionCentavos={recaudo.en_revision_centavos}
              sinReportarCentavos={recaudo.sin_reportar_centavos}
            />
          </View>
        </>
      ) : (
        <Texto variante="secundario" color={blancoAlfa(0.68)}>
          Aún no hay recaudo esperado este mes.
        </Texto>
      )}
    </View>
  );
}

/** Cabecera de tinta del Panel: saludo, mes, campana de alertas y, con datos, el recaudo del mes. */
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
      {panel ? <RecaudoDelMes recaudo={panel.recaudo} mes={panel.mes} /> : null}
    </CabeceraTinta>
  );
}

const estilos = StyleSheet.create({
  saludo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textos: { flex: 1, gap: 2 },
  recaudo: { marginTop: espaciado.xl, gap: espaciado.xxs },
  anillo: { marginTop: espaciado.md },
});
