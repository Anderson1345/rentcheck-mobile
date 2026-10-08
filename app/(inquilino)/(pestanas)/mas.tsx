import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { VersionApp } from '@/componentes/VersionApp';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { useSesion } from '@/sesion/SesionProvider';
import { colores, espaciado } from '@/tema';

// "Más" del inquilino (rediseño R4-B): filas agrupadas con icono (tu cuenta: Mi perfil y Mis contratos)
// y "Cerrar sesión" al final, en su propio grupo. Cerrar sesión no pide confirmación (hoy no la pide).
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
        <View testID="grupo-cuenta" style={estilos.grupo}>
          <EncabezadoSeccion titulo="Tu cuenta" />
          <Superficie relleno="ninguno">
            <FilaLista
              icono="perfil"
              titulo="Mi perfil"
              subtitulo="Nombre, teléfono y foto de tu cédula"
              conChevron
              onPress={() => router.push('/mi-perfil')}
            />
            <FilaLista
              icono="contratos"
              titulo="Mis contratos"
              subtitulo="Cambia de contrato o agrega otro con su código"
              separador
              conChevron
              onPress={() => router.push('/mis-contratos')}
            />
          </Superficie>
        </View>
        <View testID="grupo-sesion">
          <Superficie relleno="ninguno">
            <FilaLista
              icono="atras"
              tonoIcono="peligro"
              titulo="Cerrar sesión"
              onPress={() => {
                // El contrato elegido es de esta cuenta: se olvida antes de salir.
                limpiar();
                void cerrarSesion();
              }}
            />
          </Superficie>
        </View>
        <VersionApp />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.lg },
  grupo: { gap: espaciado.xs },
});
