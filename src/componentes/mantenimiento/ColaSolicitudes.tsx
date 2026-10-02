// Solicitudes de mantenimiento del arrendador: un segmento por estado (Pendiente, En proceso,
// Resuelta) con su contador, y filtros de urgencia y unidad. Se pide UNA lista sin filtro de estado y
// los segmentos y contadores se calculan aquí, así los contadores no cambian al cambiar de segmento
// pero sí al filtrar. Orden: el del servidor (más reciente primero). Sin paginación (B-72).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { EstadoSolicitud, SolicitudArrendador } from '../../api/mantenimiento';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import { useInmuebles } from '../../consultas/inmuebles';
import { useSolicitudes } from '../../consultas/mantenimiento';
import {
  contarPorEstado,
  type FiltroUrgencia,
  filtrarPorEstado,
  filtrosAParametros,
  hayFiltros,
  OPCIONES_FILTRO_URGENCIA,
  opcionesDeUnidad,
  SEGMENTOS_ARRENDADOR,
  SIN_FILTROS,
} from '../../mantenimiento/reglas';
import { colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { ControlSegmentado } from '../ControlSegmentado';
import { OpcionesRadio } from '../contratos/AccionesContrato';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { FilaLista } from '../FilaLista';
import { Icono } from '../iconos/Icono';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

const TODAS_LAS_UNIDADES = '__todas__';

const VACIO_POR_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'No hay solicitudes pendientes',
  EN_PROCESO: 'No hay solicitudes en proceso',
  RESUELTO: 'No hay solicitudes resueltas',
};

function FilaSolicitudArrendador({
  solicitud,
  separador,
}: {
  solicitud: SolicitudArrendador;
  separador: boolean;
}) {
  const router = useRouter();
  return (
    <FilaLista
      titulo={solicitud.descripcion}
      separador={separador}
      conChevron
      onPress={() => router.push({ pathname: '/mantenimiento/[id]', params: { id: solicitud.id } })}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${solicitud.unidad.nombre} · ${solicitud.unidad.inmueble.direccion}`}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {solicitud.inquilino.nombre ?? 'Inquilino sin datos'}
          </Texto>
          <View style={estilos.chips}>
            <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
            <ChipEstado tipo="urgencia" estado={solicitud.urgencia} />
          </View>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Creada el ${formatearFechaCorta(solicitud.creado_en)}`}
          </Texto>
          {solicitud.adjunto_tipo ? (
            <View style={estilos.adjunto} accessibilityLabel="Tiene adjunto">
              <Icono nombre="camara" tamano={16} color={colores.textoSecundario} />
              <Texto variante="secundario" color={colores.textoSecundario}>
                {solicitud.adjunto_tipo === 'VIDEO' ? 'Video' : 'Foto'}
              </Texto>
            </View>
          ) : null}
        </View>
      }
    />
  );
}

export function ColaSolicitudes() {
  const [estado, setEstado] = useState<EstadoSolicitud>('PENDIENTE');
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [verUnidades, setVerUnidades] = useState(false);
  const consulta = useSolicitudes(filtrosAParametros(filtros));
  useRefrescarAlEnfocar(consulta);
  // Las unidades salen de los inmuebles del arrendador; si no cargan, solo falta ese filtro.
  const inmuebles = useInmuebles();
  const unidades = inmuebles.data ? opcionesDeUnidad(inmuebles.data) : [];
  const unidadElegida = unidades.find((u) => u.valor === filtros.unidadId);

  const cuenta = consulta.data ? contarPorEstado(consulta.data) : null;
  const conFiltros = hayFiltros(filtros);

  function elegirUnidad(valor: string) {
    setFiltros((f) => ({ ...f, unidadId: valor === TODAS_LAS_UNIDADES ? null : valor }));
    setVerUnidades(false);
  }

  let contenido;
  if (consulta.data === undefined) {
    contenido = consulta.isPending ? (
      <EsqueletoCarga filas={3} />
    ) : (
      <ErrorConReintento error={consulta.error} onReintentar={() => void consulta.refetch()} />
    );
  } else {
    const visibles = filtrarPorEstado(consulta.data, estado);
    if (visibles.length > 0) {
      contenido = (
        <Superficie relleno="ninguno">
          {visibles.map((s, indice) => (
            <FilaSolicitudArrendador key={s.id} solicitud={s} separador={indice > 0} />
          ))}
        </Superficie>
      );
    } else if (conFiltros) {
      contenido = (
        <EstadoMensaje
          titulo="No hay solicitudes con estos filtros"
          mensaje="Prueba con otra urgencia u otra unidad."
        >
          <Boton
            titulo="Quitar filtros"
            variante="acento"
            ancho="completo"
            onPress={() => setFiltros(SIN_FILTROS)}
          />
        </EstadoMensaje>
      );
    } else if (consulta.data.length === 0) {
      contenido = (
        <EstadoMensaje
          titulo="Aún no hay solicitudes de mantenimiento"
          mensaje="Cuando tus inquilinos pidan un arreglo, aparecerán aquí."
        />
      );
    } else {
      contenido = <EstadoMensaje titulo={VACIO_POR_ESTADO[estado]} />;
    }
  }

  return (
    <View style={estilos.grupo}>
      <ControlSegmentado
        opciones={SEGMENTOS_ARRENDADOR.map((s) => ({
          valor: s.valor,
          etiqueta: s.etiqueta,
          ...(cuenta ? { contador: cuenta[s.valor] } : {}),
        }))}
        valor={estado}
        onCambio={setEstado}
      />

      <View style={estilos.filtros}>
        <ControlSegmentado<FiltroUrgencia>
          opciones={OPCIONES_FILTRO_URGENCIA}
          valor={filtros.urgencia}
          onCambio={(urgencia) => setFiltros((f) => ({ ...f, urgencia }))}
        />
        {unidades.length > 0 ? (
          <>
            <Boton
              titulo={`Unidad: ${unidadElegida?.etiqueta ?? 'Todas las unidades'}`}
              variante="secundario"
              ancho="completo"
              onPress={() => setVerUnidades((v) => !v)}
            />
            {verUnidades ? (
              <Superficie>
                <OpcionesRadio
                  opciones={[
                    { valor: TODAS_LAS_UNIDADES, etiqueta: 'Todas las unidades' },
                    ...unidades,
                  ]}
                  valor={filtros.unidadId ?? TODAS_LAS_UNIDADES}
                  onCambio={elegirUnidad}
                />
              </Superficie>
            ) : null}
          </>
        ) : null}
      </View>

      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  filtros: { gap: espaciado.xs },
  detalle: { gap: 4, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: espaciado.sm },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
