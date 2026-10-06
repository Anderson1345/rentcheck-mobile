import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampanaAlertas } from '@/componentes/alertas/CampanaAlertas';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera } from '@/componentes/CabeceraTinta';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import {
  AvisoVinculacionPendiente,
  ErrorConReintento,
  EsqueletoMiPanel,
  PanelDelContrato,
  PildoraContrato,
} from '@/componentes/inquilino/PortalInquilino';
import { Texto } from '@/componentes/Texto';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { clavesInquilino } from '@/consultas/inquilino';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// Entrada del inquilino (R3-B, maqueta PanelInquilino): saludo, el contrato elegido (píldora que abre
// "Mis contratos") y la campana; debajo, el panel del contrato. Todo es de solo lectura.
export default function MiPanel() {
  const router = useRouter();
  const cliente = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const { usuario } = useSesion();
  const { lista, contratoId, contrato } = useContratoSeleccionado();
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(lista);

  async function arrastrar() {
    setRefrescando(true);
    try {
      // "inquilino" incluye panel, detalle, estado de cuenta, solicitudes y alertas del inquilino.
      await cliente.invalidateQueries({ queryKey: clavesInquilino.todos });
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <View style={estilos.saludo}>
          <Texto
            variante="titulo"
            color={colores.sobreTinta}
            accessibilityRole="header"
            numberOfLines={1}
            style={estilos.flex}
          >
            {`Hola, ${usuario?.nombre ?? ''}`}
          </Texto>
          <CampanaAlertas rol="inquilino" />
        </View>
        {contrato ? <PildoraContrato contrato={contrato} /> : null}
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
        >
          <AvisoVinculacionPendiente />
          {lista.data === undefined && lista.isPending ? (
            <EsqueletoMiPanel />
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
            <PanelDelContrato key={contratoId} contrato={contrato} />
          )}
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  saludo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flex: { flex: 1 },
  cuerpo: { flex: 1, paddingTop: espaciado.xl },
  contenido: { gap: espaciado.lg, flexGrow: 1 },
});
