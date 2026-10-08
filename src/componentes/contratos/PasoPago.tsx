import { StyleSheet, View } from 'react-native';

import type { BorradorContrato } from '../../contratos/esquemas';
import { esPlantillaVivienda } from '../../contratos/plantilla';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoDinero } from '../CampoDinero';
import { CampoTexto } from '../CampoTexto';
import { Texto } from '../Texto';

type Errores = Partial<Record<keyof BorradorContrato, string>>;

interface Props {
  valores: BorradorContrato;
  errores: Errores;
  cambiar: (parcial: Partial<BorradorContrato>) => void;
}

const ATAJOS_FORMA_PAGO = ['Transferencia', 'Consignación', 'Efectivo'];

/** Paso 3: canon, día de pago, forma de pago, datos de recaudo y (si no es vivienda) depósito. */
export function PasoPago({ valores, errores, cambiar }: Props) {
  const vivienda = valores.plantilla !== null && esPlantillaVivienda(valores.plantilla);
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        ¿Cómo se paga el arriendo?
      </Texto>
      {/* R4-D: los dos datos cortos en dos columnas; la ayuda del día va debajo, a todo el ancho. */}
      <View testID="dos-columnas" style={estilos.columnas}>
        <View style={estilos.columnaAncha}>
          <CampoDinero
            etiqueta="Canon mensual"
            valorCentavos={valores.canonCentavos}
            onCambio={(canonCentavos) => cambiar({ canonCentavos })}
            error={errores.canonCentavos}
          />
        </View>
        <View style={estilos.columna}>
          <CampoTexto
            etiqueta="Día de pago (1 a 31)"
            valor={valores.diaPago}
            onCambio={(diaPago) => cambiar({ diaPago })}
            error={errores.diaPago}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="next"
          />
        </View>
      </View>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Si el mes no tiene ese día, vence el último día del mes.
      </Texto>
      <CampoTexto
        etiqueta="Forma de pago"
        valor={valores.formaPago}
        onCambio={(formaPago) => cambiar({ formaPago })}
        error={errores.formaPago}
        keyboardType="default"
        autoCapitalize="sentences"
        returnKeyType="next"
      />
      <View style={estilos.atajos}>
        {ATAJOS_FORMA_PAGO.map((atajo) => (
          <Boton
            key={atajo}
            titulo={atajo}
            variante="secundario"
            onPress={() => cambiar({ formaPago: atajo })}
          />
        ))}
      </View>
      <CampoTexto
        etiqueta="Datos de recaudo"
        valor={valores.datosRecaudo}
        onCambio={(datosRecaudo) => cambiar({ datosRecaudo })}
        error={errores.datosRecaudo}
        keyboardType="default"
        autoCapitalize="sentences"
        returnKeyType="done"
        ayuda="El inquilino los verá solo cuando el contrato esté activo."
      />
      {vivienda ? (
        <Aviso
          tono="informacion"
          mensaje="En vivienda urbana la ley no permite depósito en dinero (Ley 820, art. 16). Puedes pactar fiador, codeudor o póliza en el paso de garantías."
        />
      ) : (
        <CampoDinero
          etiqueta="Depósito (opcional)"
          valorCentavos={valores.depositoCentavos}
          onCambio={(depositoCentavos) => cambiar({ depositoCentavos })}
          error={errores.depositoCentavos}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  columnas: { flexDirection: 'row', gap: espaciado.sm, alignItems: 'flex-start' },
  columnaAncha: { flex: 3, minWidth: 0 },
  columna: { flex: 2, minWidth: 0 },
});
