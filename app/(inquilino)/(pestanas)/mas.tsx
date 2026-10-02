import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// "Más" del inquilino: Mi perfil y cerrar sesión.
export default function MasInquilino() {
  const router = useRouter();
  const { cerrarSesion } = useSesion();
  const { limpiar } = useContratoSeleccionado();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Más" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <Superficie relleno="ninguno">
          <FilaLista
            icono="perfil"
            titulo="Mi perfil"
            subtitulo="Nombre, teléfono y foto de tu cédula"
            conChevron
            onPress={() => router.push('/mi-perfil')}
          />
        </Superficie>
        <Boton
          titulo="Cerrar sesión"
          variante="secundario"
          ancho="completo"
          onPress={() => {
            // El contrato elegido es de esta cuenta: se olvida antes de salir.
            limpiar();
            void cerrarSesion();
          }}
        />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.md },
});
