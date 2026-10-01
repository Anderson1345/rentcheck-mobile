import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

export default function MasArrendador() {
  const { cerrarSesion } = useSesion();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Más" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        {/* Mi perfil llega en E3-B: fila deshabilitada, sin acción. */}
        <View accessible accessibilityState={{ disabled: true }} style={estilos.deshabilitada}>
          <Superficie relleno="ninguno">
            <FilaLista icono="perfil" titulo="Mi perfil" subtitulo="Próximamente (E3-B)" />
          </Superficie>
        </View>
        <Boton
          titulo="Cerrar sesión"
          variante="secundario"
          ancho="completo"
          onPress={() => void cerrarSesion()}
        />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.md },
  deshabilitada: { opacity: 0.6 },
});
