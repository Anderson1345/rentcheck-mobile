import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampanaAlertas } from '@/componentes/alertas/CampanaAlertas';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import {
  AvisoVinculacionPendiente,
  ErrorConReintento,
  PanelDelContrato,
  SelectorContrato,
} from '@/componentes/inquilino/PortalInquilino';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { clavesInquilino } from '@/consultas/inquilino';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { colores, espaciado } from '@/tema';

// Entrada del inquilino: el panel del contrato seleccionado. Todo es de solo lectura.
export default function MiPanel() {
  const router = useRouter();
  const cliente = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const { lista, contratoId, contrato } = useContratoSeleccionado();
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(lista);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await cliente.invalidateQueries({ queryKey: clavesInquilino.todos });
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Mi panel" accion={<CampanaAlertas rol="inquilino" />} />
        {contrato ? <SelectorContrato contrato={contrato} /> : null}
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
        >
          <AvisoVinculacionPendiente />
          {lista.data === undefined && lista.isPending ? (
            <EsqueletoCarga filas={3} />
          ) : lista.data === undefined ? (
            <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
          ) : contratoId === null || contrato === null ? (
            <EstadoMensaje
              titulo="Aún no tienes contratos"
              mensaje="Agrega tu contrato con el código que te dio tu arrendador."
            >
              <Boton
                titulo="Agregar contrato con código"
                variante="acento"
                ancho="completo"
                onPress={() => router.push('/agregar-contrato')}
              />
            </EstadoMensaje>
          ) : (
            <PanelDelContrato key={contratoId} contratoId={contratoId} estado={contrato.estado} />
          )}
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl },
  contenido: { gap: espaciado.md, flexGrow: 1 },
});
