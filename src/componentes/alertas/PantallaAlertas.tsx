import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import type { Alerta, RolAlertas } from '../../api/alertas';
import { mensajeDeError } from '../../api/errores';
import { agruparPorDia, resumenGrupo, tiempoDeAlerta } from '../../alertas/agrupacion';
import { destinoDeAlerta } from '../../alertas/destino';
import {
  useFeedAlertas,
  useMarcarAlertaLeida,
  useMarcarTodasLeidas,
} from '../../consultas/alertas';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ControlSegmentado } from '../ControlSegmentado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { PantallaPila } from '../PantallaPila';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { FilaAlerta } from './FilaAlerta';

type Filtro = 'sinLeer' | 'todas';

/** "Marcar todas" a la derecha del encabezado nativo (maqueta Alertas). Deshabilitado sin no leídas. */
function MarcarTodas({
  deshabilitado,
  marcando,
  onPress,
}: {
  deshabilitado: boolean;
  marcando: boolean;
  onPress: () => void;
}) {
  const apagado = deshabilitado || marcando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: apagado, busy: marcando }}
      disabled={apagado}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [estilos.marcarTodas, pressed && estilos.presionado]}
    >
      <Texto variante="etiqueta" color={apagado ? colores.textoDeshabilitado : colores.tintaCapa}>
        {marcando ? 'Marcando…' : 'Marcar todas'}
      </Texto>
    </Pressable>
  );
}

/**
 * Lista de alertas de un rol (la misma para arrendador e inquilino; rediseño R3-B). Feed por cursor con
 * "Cargar más" (sin scroll infinito), filtro "Sin leer · N" / "Todas" (N es el total del servidor; el
 * filtro es solo de presentación sobre las páginas cargadas) y grupos por día de Bogotá. Por defecto
 * abre en "Sin leer" si hay alguna; si no, en "Todas". Tocar una alerta la marca leída SIN esperar ni
 * bloquear (si la marca falla, se navega igual y no se muestra error) y navega a su destino; una
 * informativa (sin destino) solo se marca leída. El servidor decide qué alertas son del usuario y oculta
 * las leídas a los 7 días (D-13): la app solo lo informa.
 */
export function PantallaAlertas({ rol }: { rol: RolAlertas }) {
  const router = useRouter();
  const feed = useFeedAlertas(rol);
  const marcarUna = useMarcarAlertaLeida(rol);
  const marcarTodas = useMarcarTodasLeidas(rol);
  const [refrescando, setRefrescando] = useState(false);
  const [eleccion, setEleccion] = useState<Filtro | null>(null);
  useRefrescarAlEnfocar(feed);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await feed.refetch();
    } finally {
      setRefrescando(false);
    }
  }

  function abrir(alerta: Alerta, destino: ReturnType<typeof destinoDeAlerta>) {
    if (!alerta.leida) marcarUna.mutate(alerta.id);
    if (destino) router.push(destino);
  }

  const alertas = feed.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  // `no_leidas` es el total del usuario; la primera página es la que más recién se pidió.
  const noLeidas = feed.data?.pages[0]?.no_leidas ?? 0;
  const filtro: Filtro = eleccion ?? (noLeidas > 0 ? 'sinLeer' : 'todas');
  const visibles = filtro === 'sinLeer' ? alertas.filter((a) => !a.leida) : alertas;
  const grupos = agruparPorDia(visibles);

  let cuerpo;
  if (feed.data === undefined) {
    cuerpo = feed.isPending ? (
      <EsqueletoCarga filas={4} />
    ) : (
      <ErrorConReintento error={feed.error} onReintentar={() => void feed.refetch()} />
    );
  } else if (alertas.length === 0 && !feed.hasNextPage) {
    cuerpo = (
      <EstadoMensaje
        titulo="No tienes alertas"
        mensaje="Aquí verás los avisos de tus pagos, contratos y solicitudes."
      />
    );
  } else {
    cuerpo = (
      <>
        <ControlSegmentado
          opciones={[
            { valor: 'sinLeer', etiqueta: `Sin leer · ${noLeidas}` },
            { valor: 'todas', etiqueta: 'Todas' },
          ]}
          valor={filtro}
          onCambio={setEleccion}
        />
        {marcarTodas.isError ? <Aviso mensaje={mensajeDeError(marcarTodas.error)} /> : null}
        {visibles.length === 0 ? (
          <EstadoMensaje titulo="Estás al día" mensaje="No tienes alertas sin leer." />
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.clave} style={estilos.grupo}>
              <Texto
                testID="grupo-alertas"
                variante="etiqueta"
                color={colores.textoFuerte}
                accessibilityRole="header"
                accessibilityLabel={resumenGrupo(grupo)}
                style={estilos.tituloGrupo}
              >
                {grupo.titulo}
              </Texto>
              <Superficie relleno="ninguno" style={estilos.tarjeta}>
                {grupo.alertas.map((alerta, indice) => {
                  const destino = destinoDeAlerta(alerta.recurso, rol);
                  const accionable = destino !== null || !alerta.leida;
                  return (
                    <FilaAlerta
                      key={alerta.id}
                      alerta={alerta}
                      tiempo={tiempoDeAlerta(alerta.creado_en, grupo.clave)}
                      separador={indice > 0}
                      conDestino={destino !== null}
                      onPress={accionable ? () => abrir(alerta, destino) : undefined}
                    />
                  );
                })}
              </Superficie>
            </View>
          ))
        )}
        {feed.isFetchNextPageError ? <Aviso mensaje={mensajeDeError(feed.error)} /> : null}
        {feed.hasNextPage ? (
          <Boton
            titulo="Cargar más"
            tituloCargando="Cargando…"
            variante="secundario"
            ancho="completo"
            cargando={feed.isFetchingNextPage}
            onPress={() => void feed.fetchNextPage()}
          />
        ) : null}
        <Texto variante="secundario" color={colores.textoSecundario} style={estilos.nota}>
          Las alertas leídas se ocultan a los 7 días.
        </Texto>
      </>
    );
  }

  return (
    <PantallaPila
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <MarcarTodas
              deshabilitado={noLeidas === 0}
              marcando={marcarTodas.isPending}
              onPress={() => marcarTodas.mutate()}
            />
          ),
        }}
      />
      <View style={estilos.contenido}>{cuerpo}</View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: espaciado.md },
  grupo: { gap: 6 },
  tituloGrupo: {
    paddingHorizontal: espaciado.xxs,
    paddingTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tarjeta: { overflow: 'hidden' },
  nota: { textAlign: 'center', marginTop: espaciado.xs },
  marcarTodas: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado.sm },
  presionado: { opacity: 0.6 },
});
