import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { ColaPagos } from '@/componentes/pagos/ColaPagos';
import { colores, espaciado } from '@/tema';

// Cola de validación del arrendador: los pagos que reportan sus inquilinos, por estado.
export default function PagosArrendador() {
  const cliente = useQueryClient();
  const { bottom } = useSafeAreaInsets();
  const [refrescando, setRefrescando] = useState(false);

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
        <TituloCabecera titulo="Pagos" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
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
