import { StyleSheet, View } from 'react-native';

import { useSesion } from '../sesion/SesionProvider';
import { blancoAlfa, colores, espaciado } from '../tema';
import { AvatarRelieve } from './avatar/AvatarRelieve';
import { Boton } from './Boton';
import { CabeceraTinta, ContenidoBajoCabecera } from './CabeceraTinta';
import { Superficie } from './Superficie';
import { Texto } from './Texto';

interface Props {
  /** "Arrendador" o "Inquilino". */
  rol: string;
  /** Entrega en la que llega la pantalla real ("E3"). */
  entrega: string;
}

/** Pantalla provisional de cada rol: saludo y "Cerrar sesión". Las reales llegan en E3 y E4. */
export function InicioProvisional({ rol, entrega }: Props) {
  const { usuario, cerrarSesion } = useSesion();
  const nombre = usuario?.nombre ?? '';

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <View style={estilos.saludo}>
          <AvatarRelieve nombre={nombre} tamano={40} />
          <View style={estilos.textos}>
            <Texto variante="secundario" color={blancoAlfa(0.64)}>
              {rol}
            </Texto>
            <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
              Hola, {nombre}
            </Texto>
          </View>
        </View>
      </CabeceraTinta>

      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <Superficie style={estilos.tarjeta}>
          <Texto variante="tituloSeccion">Tu cuenta está lista</Texto>
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Próximamente ({entrega}): aquí verás tu información.
          </Texto>
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
  saludo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textos: { flex: 1, gap: 2 },
  cuerpo: { flex: 1, paddingTop: espaciado.xl, gap: espaciado.md },
  tarjeta: { gap: espaciado.xs },
});
