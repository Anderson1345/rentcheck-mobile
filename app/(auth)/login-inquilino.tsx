import { iniciarSesionInquilino } from '@/api/auth';
import { FormularioLogin } from '@/componentes/FormularioLogin';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Texto } from '@/componentes/Texto';
import { colores } from '@/tema';

export default function LoginInquilino() {
  return (
    <PantallaFormulario titulo="Soy inquilino" subtitulo="Inicia sesión en tu cuenta">
      <FormularioLogin enviar={(datos) => iniciarSesionInquilino(datos.correo, datos.contrasena)} />
      {/* La activación con código llega en E2-B; aquí solo se explica. */}
      <Texto variante="secundario" color={colores.textoSecundario}>
        ¿Aún no tienes cuenta? Tu arrendador te dará un código de activación.
      </Texto>
    </PantallaFormulario>
  );
}
