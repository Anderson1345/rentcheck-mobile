import { StyleSheet } from 'react-native';

import type { MoraPanel, OcupacionPanel, PanelArrendador } from '../../api/panel';
import {
  etiquetaMesCorto,
  mesesDeGrafica,
  nombreDelMes,
  plural,
  tendenciaSinIngresos,
  textoMora,
  textoUnidades,
} from '../../panel/presentacion';
import { colores, coloresEstado, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { GraficaAreaIngresos } from '../graficas/GraficaAreaIngresos';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

/** Ocupación como conteo (sin mini-plano): ocupadas de todas las unidades, libres y con contrato programado. */
export function TarjetaOcupacion({ ocupacion }: { ocupacion: OcupacionPanel }) {
  return (
    <Superficie style={estilos.tarjeta}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Ocupación
      </Texto>
      {ocupacion.unidades > 0 ? (
        <>
          <Texto variante="cifraMedia" cifras>
            {textoUnidades(ocupacion)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${ocupacion.libres} ${plural(ocupacion.libres, 'libre', 'libres')}`}
          </Texto>
          {ocupacion.con_contrato_programado > 0 ? (
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`${ocupacion.con_contrato_programado} con contrato programado`}
            </Texto>
          ) : null}
        </>
      ) : (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Aún no tienes unidades
        </Texto>
      )}
    </Superficie>
  );
}

/** Cartera en mora tal como la calcula el servidor (períodos vencidos o parciales, "a hoy"). */
export function TarjetaMora({ mora, calculadoPara }: { mora: MoraPanel; calculadoPara: string }) {
  const hayMora = mora.contratos > 0 || mora.periodos > 0 || mora.total_centavos > 0;
  return (
    <Superficie style={estilos.tarjeta}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Cartera en mora
      </Texto>
      {hayMora ? (
        <>
          <Texto variante="cifraMedia" cifras color={coloresEstado.peligro.texto}>
            {centavosAPesosTexto(mora.total_centavos)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {textoMora(mora)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Calculada al ${formatearFechaCorta(calculadoPara)}`}
          </Texto>
        </>
      ) : (
        <Aviso mensaje="Sin cartera en mora" tono="exito" />
      )}
    </Superficie>
  );
}

/**
 * Ingresos aprobados de los meses que entrega el servidor (hoy 6, el actual al final y en curso). La
 * gráfica no dibuja promedio: el servidor no entrega uno. Con todos los meses en cero se dice con un texto.
 */
export function TarjetaTendencia({ panel }: { panel: PanelArrendador }) {
  const { tendencia } = panel;
  const meses = mesesDeGrafica(tendencia);
  const ultimo = tendencia[tendencia.length - 1];
  return (
    <Superficie style={estilos.tarjeta}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Ingresos aprobados
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Pagos aprobados, por la fecha en que el inquilino dijo haber pagado.
      </Texto>
      {tendenciaSinIngresos(tendencia) ? (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {tendencia.length > 1
            ? `Aún no hay ingresos aprobados en los últimos ${tendencia.length} meses.`
            : 'Aún no hay ingresos aprobados.'}
        </Texto>
      ) : (
        <>
          <GraficaAreaIngresos
            meses={meses}
            ultimoEnCurso
            conPromedio={false}
            etiquetaBurbuja={`${etiquetaMesCorto(ultimo.mes)}. en curso`}
            descripcion={`Ingresos aprobados de ${meses.map((m) => m.etiqueta).join(', ')}; ${nombreDelMes(ultimo.mes)} en curso`}
          />
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Ingresos de ${nombreDelMes(panel.mes)}: ${centavosAPesosTexto(panel.ingresos_mes_centavos)}`}
          </Texto>
        </>
      )}
    </Superficie>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
