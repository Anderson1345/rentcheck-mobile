import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { ColaPagos } from '@/componentes/pagos/ColaPagos';
import { usePagos } from '@/consultas/pagos';
import { colores, espaciado } from '@/tema';

// Cola de validación del arrendador: los pagos que reportan sus inquilinos, por estado. R4-C: la
// cabecera dice cuántos hay por validar (la misma consulta del segmento "En revisión").
export default function PagosArrendador() {
  const cliente = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const [refrescando, setRefrescando] = useState(false);
  const pendientes = usePagos('PENDIENTE');

  async function arrastrar() {
    setRefrescando(true);
    try {
      await cliente.invalidateQueries({ queryKey: ['contratos', 'pagos'] });
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera
          titulo="Pagos"
          subtitulo={
            pendientes.data !== undefined ? `${pendientes.data.length} por validar` : undefined
          }
        />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
        >
          <ColaPagos />
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
