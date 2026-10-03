import { useLocalSearchParams, useRouter } from 'expo-router';

import { iniciarSesionArrendador } from '@/api/auth';
import { PieAcceso, SelectorRolAcceso } from '@/componentes/ElementosAcceso';
import { FormularioLogin } from '@/componentes/FormularioLogin';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';

export default function LoginArrendador() {
  const router = useRouter();
  const { correo } = useLocalSearchParams<{ correo?: string }>();

  return (
    <PantallaFormulario>
      <SelectorRolAcceso rol="arrendador" />
      {/* G1: aquí irán "Continuar con Google" y el separador "o con tu correo" (aún no existen). */}
      <FormularioLogin
        rol="arrendador"
        correoInicial={typeof correo === 'string' ? correo : ''}
        enviar={(datos) => iniciarSesionArrendador(datos.correo, datos.contrasena)}
      />
      <PieAcceso
        pregunta="¿No tienes cuenta?"
        enlace="Crear cuenta"
        onPress={() => router.push('/registro-arrendador')}
      />
    </PantallaFormulario>
  );
}
