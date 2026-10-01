import { useLocalSearchParams, useRouter } from 'expo-router';

import { iniciarSesionArrendador } from '@/api/auth';
import { Boton } from '@/componentes/Boton';
import { FormularioLogin } from '@/componentes/FormularioLogin';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Texto } from '@/componentes/Texto';
import { colores } from '@/tema';

export default function LoginArrendador() {
  const router = useRouter();
  const { correo } = useLocalSearchParams<{ correo?: string }>();

  return (
    <PantallaFormulario titulo="Soy arrendador" subtitulo="Inicia sesión en tu cuenta">
      <FormularioLogin
        rol="arrendador"
        correoInicial={typeof correo === 'string' ? correo : ''}
        enviar={(datos) => iniciarSesionArrendador(datos.correo, datos.contrasena)}
      />
      <Texto variante="secundario" color={colores.textoSecundario}>
        ¿Aún no tienes cuenta?
      </Texto>
      <Boton
        titulo="Crear cuenta de arrendador"
        variante="secundario"
        ancho="completo"
        onPress={() => router.push('/registro-arrendador')}
      />
    </PantallaFormulario>
  );
}
