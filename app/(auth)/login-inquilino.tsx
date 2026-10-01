import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { iniciarSesionInquilino } from '@/api/auth';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { FormularioLogin } from '@/componentes/FormularioLogin';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Texto } from '@/componentes/Texto';
import { validarCodigo } from '@/sesion/codigo';
import { guardarCodigoPendiente, limpiarCodigoPendiente } from '@/sesion/codigoPendiente';
import { useSesion } from '@/sesion/SesionProvider';
import { colores } from '@/tema';

export default function LoginInquilino() {
  const router = useRouter();
  const { estado } = useSesion();
  const { correo, codigo } = useLocalSearchParams<{ correo?: string; codigo?: string }>();

  // "Ya tengo cuenta": el código de la activación espera, solo en memoria, a que inicie sesión.
  const resultado = validarCodigo(typeof codigo === 'string' ? codigo : '');
  const codigoPendiente = resultado.valido ? resultado.codigo : null;

  const estadoActual = useRef(estado);
  useEffect(() => {
    estadoActual.current = estado;
  }, [estado]);

  useEffect(() => {
    if (codigoPendiente === null) return undefined;
    guardarCodigoPendiente(codigoPendiente);
    return () => {
      // Si se sale sin haber iniciado sesión, el código no debe quedar para otra cuenta.
      if (estadoActual.current !== 'inquilino') limpiarCodigoPendiente();
    };
  }, [codigoPendiente]);

  return (
    <PantallaFormulario titulo="Soy inquilino" subtitulo="Inicia sesión en tu cuenta">
      {codigoPendiente ? (
        <Aviso
          tono="informacion"
          mensaje={`Al iniciar sesión agregaremos tu código ${codigoPendiente}.`}
        />
      ) : null}
      <FormularioLogin
        rol="inquilino"
        correoInicial={typeof correo === 'string' ? correo : ''}
        enviar={(datos) => iniciarSesionInquilino(datos.correo, datos.contrasena)}
      />
      {/* La activación con el código del arrendador es la otra forma de entrar. */}
      <Texto variante="secundario" color={colores.textoSecundario}>
        ¿Aún no tienes cuenta? Tu arrendador te dará un código de activación.
      </Texto>
      <Boton
        titulo="Tengo un código de activación"
        variante="secundario"
        ancho="completo"
        onPress={() => router.push('/activar')}
      />
    </PantallaFormulario>
  );
}
