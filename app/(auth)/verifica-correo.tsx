import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { colores, espaciado } from '@/tema';

// Con el correo activo, el registro no entrega token: la persona debe verificar su correo antes de
// iniciar sesión. La verificación con el código llega en E2-B; esta pantalla solo la avisa.
export default function VerificaCorreo() {
  const router = useRouter();
  const { correo } = useLocalSearchParams<{ correo?: string }>();

  return (
    <PantallaFormulario titulo="Revisa tu correo" subtitulo="Falta un paso">
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion">Revisa tu correo para verificar tu cuenta</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {correo
            ? `Te enviamos un código a ${correo}. Cuando tu cuenta esté verificada, podrás iniciar sesión.`
            : 'Te enviamos un código. Cuando tu cuenta esté verificada, podrás iniciar sesión.'}
        </Texto>
      </Superficie>
      <View style={estilos.accion}>
        <Boton
          titulo="Volver al inicio"
          variante="secundario"
          ancho="completo"
          onPress={() => router.dismissTo('/')}
        />
      </View>
    </PantallaFormulario>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.sm },
  accion: { marginTop: espaciado.xs },
});
