import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaLista } from '@/componentes/FilaLista';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { colores } from '@/tema';
import { formatearFechaCorta } from '@/utilidades/fechas';

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

// Selector de contrato: elegir uno lo deja seleccionado para el panel y el detalle.
export default function MisContratos() {
  const router = useRouter();
  const { lista, contratoId, seleccionar } = useContratoSeleccionado();

  const agregar = () => router.push('/agregar-contrato');

  function elegir(id: string) {
    seleccionar(id);
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  if (lista.data === undefined) {
    return (
      <PantallaPila>
        {lista.isPending ? (
          <>
            <Texto variante="cuerpo" color={colores.textoSecundario}>
              Cargando tus contratos…
            </Texto>
            <EsqueletoCarga filas={3} />
          </>
        ) : (
          <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
        )}
      </PantallaPila>
    );
  }

  if (lista.data.length === 0) {
    return (
      <PantallaPila>
        <EstadoMensaje
          titulo="Aún no tienes contratos"
          mensaje="Agrega tu contrato con el código que te dio tu arrendador."
        >
          <Boton
            titulo="Agregar contrato con código"
            variante="acento"
            ancho="completo"
            onPress={agregar}
          />
        </EstadoMensaje>
      </PantallaPila>
    );
  }

  return (
    <PantallaPila>
      <Superficie relleno="ninguno">
        {lista.data.map((c, indice) => (
          <FilaLista
            key={c.id}
            icono="contratos"
            titulo={c.unidad.nombre}
            separador={indice > 0}
            conChevron
            onPress={() => elegir(c.id)}
            detalle={
              <View style={estilos.detalle}>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {c.inmueble.direccion}
                </Texto>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {c.inmueble.ciudad}
                </Texto>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {`${formatearFechaCorta(c.fecha_inicio)} – ${formatearFechaCorta(c.fecha_fin)}`}
                </Texto>
                <View style={estilos.chips}>
                  <ChipEstado tipo="contrato" estado={c.estado} />
                  {c.estado_pago ? (
                    <ChipEstado tipo="pagoContrato" estado={ESTADO_PAGO[c.estado_pago]} />
                  ) : null}
                </View>
                {c.id === contratoId ? (
                  <Texto variante="etiqueta" color={colores.textoSecundario}>
                    Contrato seleccionado
                  </Texto>
                ) : null}
              </View>
            }
          />
        ))}
        <FilaLista
          icono="anadir"
          titulo="Agregar contrato con código"
          separador
          conChevron
          onPress={agregar}
        />
      </Superficie>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  detalle: { gap: 4, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
