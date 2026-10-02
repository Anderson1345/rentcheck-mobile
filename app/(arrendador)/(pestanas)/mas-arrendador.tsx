import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

export default function MasArrendador() {
  const router = useRouter();
  const { cerrarSesion } = useSesion();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Más" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <Superficie relleno="ninguno">
          <FilaLista
            icono="mantenimiento"
            titulo="Mantenimiento"
            subtitulo="Solicitudes de tus inquilinos"
            conChevron
            onPress={() => router.push('/mantenimiento')}
          />
          <FilaLista
            icono="perfil"
            titulo="Mi perfil"
            subtitulo="Nombre, teléfono y cédula"
            conChevron
            separador
            onPress={() => router.push('/perfil')}
          />
        </Superficie>
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
});
