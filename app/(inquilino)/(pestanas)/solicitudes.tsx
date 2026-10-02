import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { ErrorConReintento, SelectorContrato } from '@/componentes/inquilino/PortalInquilino';
import { ListaSolicitudes } from '@/componentes/mantenimiento/ListaSolicitudes';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { clavesInquilino } from '@/consultas/inquilino';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { colores, espaciado } from '@/tema';

// Solicitudes de mantenimiento del inquilino, del contrato seleccionado: lista por "Abiertas" y
// "Resueltas", y "Nueva solicitud" solo con contrato ACTIVO. No hay alertas del cambio de estado
// (B-18): la lista se vuelve a pedir al abrir, al volver a enfocar y al arrastrar.
export default function SolicitudesInquilino() {
  const router = useRouter();
  const cliente = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const { lista, contrato } = useContratoSeleccionado();
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
        <TituloCabecera titulo="Solicitudes" />
        {contrato ? <SelectorContrato contrato={contrato} /> : null}
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
        >
          {lista.data === undefined && lista.isPending ? (
            <EsqueletoCarga filas={3} />
          ) : lista.data === undefined ? (
            <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
          ) : contrato === null ? (
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
            <ListaSolicitudes key={contrato.id} contrato={contrato} />
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
