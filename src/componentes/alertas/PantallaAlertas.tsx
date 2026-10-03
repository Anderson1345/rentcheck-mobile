import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { Alerta, RolAlertas } from '../../api/alertas';
import { mensajeDeError } from '../../api/errores';
import { destinoDeAlerta } from '../../alertas/destino';
import {
  useFeedAlertas,
  useMarcarAlertaLeida,
  useMarcarTodasLeidas,
} from '../../consultas/alertas';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import { espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { ErrorConReintento } from '../inquilino/PortalInquilino';
import { PantallaPila } from '../PantallaPila';
import { Superficie } from '../Superficie';
import { FilaAlerta } from './FilaAlerta';

/**
 * Lista de alertas de un rol (la misma para arrendador e inquilino). Feed por cursor con "Cargar más"
 * (sin scroll infinito) y "Marcar todas como leídas". Tocar una alerta la marca leída SIN esperar ni
 * bloquear (si la marca falla, se navega igual y no se muestra error) y navega a su destino; una
 * informativa (sin destino) solo se marca leída. El servidor decide qué alertas son del usuario.
 */
export function PantallaAlertas({ rol }: { rol: RolAlertas }) {
  const router = useRouter();
  const feed = useFeedAlertas(rol);
  const marcarUna = useMarcarAlertaLeida(rol);
  const marcarTodas = useMarcarTodasLeidas(rol);
  const [refrescando, setRefrescando] = useState(false);
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

  let cuerpo;
  if (feed.data === undefined) {
    cuerpo = feed.isPending ? (
      <EsqueletoCarga filas={4} />
    ) : (
      <ErrorConReintento error={feed.error} onReintentar={() => void feed.refetch()} />
    );
  } else if (alertas.length === 0) {
    cuerpo = (
      <EstadoMensaje
        titulo="No tienes alertas"
        mensaje="Aquí verás los avisos de tus pagos, contratos y solicitudes."
      />
    );
  } else {
    cuerpo = (
      <>
        <Boton
          titulo="Marcar todas como leídas"
          tituloCargando="Marcando…"
          variante="secundario"
          ancho="completo"
          deshabilitado={noLeidas === 0}
          cargando={marcarTodas.isPending}
          onPress={() => marcarTodas.mutate()}
        />
        {marcarTodas.isError ? <Aviso mensaje={mensajeDeError(marcarTodas.error)} /> : null}
        <Superficie relleno="ninguno">
          {alertas.map((alerta, indice) => {
            const destino = destinoDeAlerta(alerta.recurso, rol);
            const accionable = destino !== null || !alerta.leida;
            return (
              <FilaAlerta
                key={alerta.id}
                alerta={alerta}
                separador={indice > 0}
                conDestino={destino !== null}
                onPress={accionable ? () => abrir(alerta, destino) : undefined}
              />
            );
          })}
        </Superficie>
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
      </>
    );
  }

  return (
    <PantallaPila
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
    >
      <View style={estilos.contenido}>{cuerpo}</View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: espaciado.md },
});
