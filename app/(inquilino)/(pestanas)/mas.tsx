import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// "Más" del inquilino: por ahora solo cerrar sesión (el perfil llega en E6-B).
export default function MasInquilino() {
  const { cerrarSesion } = useSesion();
  const { limpiar } = useContratoSeleccionado();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Más" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
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
