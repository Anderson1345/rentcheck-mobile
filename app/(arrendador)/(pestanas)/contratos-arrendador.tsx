import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { colores, espaciado } from '@/tema';

// La lista de contratos llega en E5; por ahora la pestaña solo ofrece crear uno.
export default function ContratosArrendador() {
  const router = useRouter();
  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Contratos" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <Superficie>
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Aquí verás tus contratos.
          </Texto>
        </Superficie>
        <Boton
          titulo="Nuevo contrato"
          icono="anadir"
          ancho="completo"
          onPress={() => router.push('/contrato/nuevo')}
        />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.md },
});
