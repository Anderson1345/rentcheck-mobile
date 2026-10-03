import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContenidoBajoCabecera } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { CabeceraPanel } from '@/componentes/panel/CabeceraPanel';
import { CentroPendientes } from '@/componentes/panel/CentroPendientes';
import { TarjetaMora, TarjetaOcupacion, TarjetaTendencia } from '@/componentes/panel/TarjetasPanel';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { usePanelArrendador } from '@/consultas/panel';
import { colores, espaciado } from '@/tema';

// Panel del arrendador (E9-B): lo que calcula el servidor para el mes actual de Bogotá, sin recalcular
// nada en la app. La campana de alertas va en la cabecera; "Cerrar sesión" vive en la pestaña Más. Se
// refresca al enfocar la pestaña (si los datos ya están viejos) y al arrastrar; no hay intervalo.
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
            <EsqueletoCarga filas={3} />
          ) : (
            <ErrorConReintento
              error={consulta.error}
              onReintentar={() => void consulta.refetch()}
            />
          )
        ) : (
          <>
            <TarjetaOcupacion ocupacion={panel.ocupacion} />
            <TarjetaMora mora={panel.mora} calculadoPara={panel.calculado_para} />
            <TarjetaTendencia panel={panel} />
            <CentroPendientes pendientes={panel.pendientes} />
          </>
        )}
      </ContenidoBajoCabecera>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { paddingTop: espaciado.xl, gap: espaciado.md },
});
