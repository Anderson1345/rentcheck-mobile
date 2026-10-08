import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import type { EstadoCuenta as DatosCuenta, EstadoPeriodoApi } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { NoEncontradoContrato } from '@/componentes/contratos/AccionesContrato';
import { VistaEstadoCuenta } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useEstadoCuenta } from '@/consultas/contratos';
import { colores, espaciado } from '@/tema';

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

/** Orden y nombre (singular, plural) de cada estado en la línea de conteos del resumen. */
const CONTEO: readonly [EstadoPeriodoApi, string, string][] = [
  ['PAGADO', 'pagado', 'pagados'],
  ['PARCIAL', 'parcial', 'parciales'],
  ['VENCIDO', 'vencido', 'vencidos'],
  ['EN_REVISION', 'en revisión', 'en revisión'],
  ['PENDIENTE', 'por vencer', 'por vencer'],
];

/** "2 pagados · 1 vencido · 1 por vencer": cuenta los estados que dio el servidor; no calcula nada más. */
export function textoConteoPeriodos(periodos: DatosCuenta['periodos']): string {
  return CONTEO.map(([estado, uno, varios]) => {
    const n = periodos.filter((p) => p.estado === estado).length;
    return n === 0 ? null : `${n} ${n === 1 ? uno : varios}`;
  })
    .filter((parte): parte is string => parte !== null)
    .join(' · ');
}

/** Resumen arriba (R4-E): el estado de pago y cuántos períodos hay en cada estado, todo del servidor. */
function ResumenCuenta({ data }: { data: DatosCuenta }) {
  const total = data.periodos.length;
  return (
    <View testID="resumen-cuenta">
      <Superficie style={estilos.resumen}>
        <View style={estilos.fila}>
          <Texto variante="etiqueta" color={colores.textoSecundario} style={estilos.flex}>
            Estado de pago
          </Texto>
          <ChipEstado tipo="pagoContrato" estado={ESTADO_PAGO[data.estadoPago]} />
        </View>
        {total > 0 ? (
          <>
            <Texto variante="cifraMedia" cifras>
              {total === 1 ? '1 período' : `${total} períodos`}
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {textoConteoPeriodos(data.periodos)}
            </Texto>
          </>
        ) : null}
      </Superficie>
    </View>
  );
}

// Estado de cuenta del arrendador (rediseño R4-E): arriba el resumen con datos del servidor; los períodos
// en filas de un mismo contenedor (mes, monto esperado, fecha límite y chip; la vista compartida con el
// inquilino, que no usa estas opciones); sin períodos, un estado vacío que explica qué verá aquí.
export default function EstadoCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useEstadoCuenta(id);

  if (error instanceof ErrorApi && error.status === 404) {
    return (
      <PantallaPila>
        <NoEncontradoContrato />
      </PantallaPila>
    );
  }

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
      <VistaEstadoCuenta
        data={data}
        resumen={<ResumenCuenta data={data} />}
        vacio={
          <EstadoMensaje
            titulo="Este contrato aún no tiene períodos"
            mensaje="Cuando el contrato tenga períodos de pago, verás aquí cada mes con su monto, su fecha límite y su estado."
          />
        }
      />
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  resumen: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flex: { flex: 1 },
});
