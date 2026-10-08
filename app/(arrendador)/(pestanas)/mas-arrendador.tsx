import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// "Más" del arrendador (rediseño R4-C, como el del inquilino en R4-B): filas agrupadas con icono (tu
// trabajo: Mantenimiento; tu cuenta: Mi perfil) y "Cerrar sesión" al final, en su propio grupo. Cerrar
// sesión no pide confirmación (hoy no la pide).
export default function MasArrendador() {
  const router = useRouter();
  const { cerrarSesion } = useSesion();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Más" />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <View testID="grupo-trabajo" style={estilos.grupo}>
          <EncabezadoSeccion titulo="Tu trabajo" />
          <Superficie relleno="ninguno">
            <FilaLista
              icono="mantenimiento"
              titulo="Mantenimiento"
              subtitulo="Solicitudes de tus inquilinos"
              conChevron
              onPress={() => router.push('/mantenimiento')}
            />
          </Superficie>
        </View>
        <View testID="grupo-cuenta" style={estilos.grupo}>
          <EncabezadoSeccion titulo="Tu cuenta" />
          <Superficie relleno="ninguno">
            <FilaLista
              icono="perfil"
              titulo="Mi perfil"
              subtitulo="Nombre, teléfono y cédula"
              conChevron
              onPress={() => router.push('/perfil')}
            />
          </Superficie>
        </View>
        <View testID="grupo-sesion">
          <Superficie relleno="ninguno">
            <FilaLista
              icono="atras"
              tonoIcono="peligro"
              titulo="Cerrar sesión"
              onPress={() => void cerrarSesion()}
            />
          </Superficie>
        </View>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.lg },
  grupo: { gap: espaciado.xs },
});
