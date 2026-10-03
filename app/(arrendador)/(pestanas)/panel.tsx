import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContenidoBajoCabecera } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { CabeceraPanel } from '@/componentes/panel/CabeceraPanel';
import { ComoVaElAnio } from '@/componentes/panel/ComoVaElAnio';
import { OcupacionUnidades } from '@/componentes/panel/OcupacionUnidades';
import { ParaHoy } from '@/componentes/panel/ParaHoy';
import { QuienTeDebe } from '@/componentes/panel/QuienTeDebe';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { usePanelArrendador } from '@/consultas/panel';
import { colores, espaciado } from '@/tema';

// Panel del arrendador v2 (R3-A): responde las cuatro preguntas (D-14) — qué hacer hoy, quién debe, cómo
// va el año y la ocupación — con lo que calcula el servidor, sin recalcular nada en la app. La campana de
// alertas va en la cabecera; "Cerrar sesión" vive en Más. Se refresca al enfocar (si los datos ya están
// viejos) y al arrastrar; no hay intervalo.
export default function PanelArrendador() {
  const { bottom } = useSafeAreaInsets();
  const consulta = usePanelArrendador();
  const { data: panel } = consulta;
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(consulta);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await consulta.refetch();
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={estilos.pantalla}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
      contentContainerStyle={{ paddingBottom: bottom + espaciado.xl }}
    >
      <CabeceraPanel panel={panel} />
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        {panel === undefined ? (
          consulta.isPending ? (
            <EsqueletoPanel />
          ) : (
            <ErrorConReintento
              error={consulta.error}
              onReintentar={() => void consulta.refetch()}
            />
          )
        ) : (
          <>
            <ParaHoy pendientes={panel.pendientes} />
            <QuienTeDebe mora={panel.mora} morosos={panel.morosos} />
            <ComoVaElAnio panel={panel} />
            <OcupacionUnidades ocupacion={panel.ocupacion} />
          </>
        )}
      </ContenidoBajoCabecera>
    </ScrollView>
  );
}

/** Mientras carga: un bloque por sección, con su forma (mosaicos, filas, gráfica y cuadros). */
function EsqueletoPanel() {
  return (
    <View style={estilos.esqueleto}>
      <EsqueletoCarga filas={1} />
      <EsqueletoCarga filas={2} />
      <EsqueletoCarga filas={3} />
      <EsqueletoCarga filas={1} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { paddingTop: espaciado.xl, gap: espaciado.lg },
  esqueleto: { gap: espaciado.lg },
});
