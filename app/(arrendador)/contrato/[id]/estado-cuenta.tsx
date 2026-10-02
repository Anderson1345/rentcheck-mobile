import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { PeriodoCuenta } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { FilaLista } from '@/componentes/FilaLista';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useEstadoCuenta } from '@/consultas/contratos';
import { mesDePeriodo } from '@/contratos/acciones';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta } from '@/utilidades/fechas';

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

function FilaPeriodo({ p, separador }: { p: PeriodoCuenta; separador: boolean }) {
  return (
    <FilaLista
      titulo={mesDePeriodo(p.periodo)}
      separador={separador}
      valor={centavosAPesosTexto(p.canonVigenteCentavos)}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Fecha límite ${formatearFechaCorta(p.fechaLimite)}`}
          </Texto>
          <ChipEstado tipo="periodo" estado={p.estado} />
          {p.estado === 'PARCIAL' ? (
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Aprobado ${centavosAPesosTexto(p.montoAprobadoCentavos)} de ${centavosAPesosTexto(p.canonVigenteCentavos)}`}
            </Texto>
          ) : null}
        </View>
      }
    />
  );
}

export default function EstadoCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useEstadoCuenta(id);

  if (data === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={4} />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        Estado de cuenta
      </Texto>
      <Superficie style={estilos.encabezado}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Estado de pago
        </Texto>
        <ChipEstado tipo="pagoContrato" estado={ESTADO_PAGO[data.estadoPago]} />
      </Superficie>
      {data.periodos.length === 0 ? (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Este contrato aún no tiene períodos
        </Texto>
      ) : (
        <Superficie relleno="ninguno">
          {data.periodos.map((p, indice) => (
            <FilaPeriodo key={p.periodo} p={p} separador={indice > 0} />
          ))}
        </Superficie>
      )}
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: espaciado.xs },
  detalle: { gap: 4, flexShrink: 1 },
});
