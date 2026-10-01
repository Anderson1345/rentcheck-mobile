import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import { reenviarVerificacion, verificarCorreo } from '@/api/auth';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoCodigoSeisDigitos } from '@/componentes/CampoCodigoSeisDigitos';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { type DatosVerificacion, esquemaVerificacion } from '@/sesion/esquemas';
import { colores, espaciado } from '@/tema';
import { useCuentaRegresiva } from '@/utilidades/cuentaRegresiva';

const SEGUNDOS_ENTRE_ENVIOS = 60;

// Verificación del correo con el código de 6 dígitos. Solo existe con un proveedor de correo
// activo (apagado en producción): el registro y el login mandan aquí cuando el servidor lo pide.
export default function VerificaCorreo() {
  const router = useRouter();
  const {
    correo = '',
    rol,
    reenviar,
  } = useLocalSearchParams<{
    correo?: string;
    rol?: string;
    reenviar?: string;
  }>();
  const esInquilino = rol === 'inquilino';

  const [verificado, setVerificado] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [avisoReenvio, setAvisoReenvio] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const { restantes, reiniciar } = useCuentaRegresiva(SEGUNDOS_ENTRE_ENVIOS);
  const pidioReenvio = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosVerificacion>({
    resolver: zodResolver(esquemaVerificacion),
    defaultValues: { codigo: '' },
  });

  // Desde el login (403) se pide un código nuevo, pero una sola vez al entrar.
  useEffect(() => {
    if (reenviar !== '1' || pidioReenvio.current || !correo) return;
    pidioReenvio.current = true;
    reenviarVerificacion(correo).catch((error: unknown) => setErrorServidor(mensajeDeError(error)));
  }, [reenviar, correo]);

  const alVerificar = handleSubmit(async ({ codigo }) => {
    setErrorServidor(null);
    try {
      await verificarCorreo(correo, codigo);
      setVerificado(true);
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  async function alReenviar() {
    if (restantes > 0 || reenviando) return;
    setErrorServidor(null);
    setAvisoReenvio(null);
    setReenviando(true);
    try {
      await reenviarVerificacion(correo);
      reiniciar();
      setAvisoReenvio('Te enviamos un código nuevo. Revisa tu correo.');
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    } finally {
      setReenviando(false);
    }
  }

  function irAlLogin() {
    router.replace({
      pathname: esInquilino ? '/login-inquilino' : '/login-arrendador',
      params: { correo },
    });
  }

  if (verificado) {
    return (
      <PantallaFormulario titulo="Correo verificado" subtitulo="Todo listo">
        <Superficie style={estilos.tarjeta}>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            Correo verificado
          </Texto>
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Ya puedes iniciar sesión con tu correo y tu contraseña.
          </Texto>
        </Superficie>
        <Boton titulo="Ir a iniciar sesión" ancho="completo" onPress={irAlLogin} />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario titulo="Revisa tu correo" subtitulo="Falta un paso">
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion">Escribe el código que te enviamos</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {correo
            ? `Te enviamos un código de 6 dígitos a ${correo}. Vale 10 minutos.`
            : 'Te enviamos un código de 6 dígitos. Vale 10 minutos.'}
        </Texto>
      </Superficie>

      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}
      {avisoReenvio ? <Aviso tono="exito" mensaje={avisoReenvio} /> : null}

      <Controller
        control={control}
        name="codigo"
        render={({ field }) => (
          <CampoCodigoSeisDigitos
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.codigo?.message}
            returnKeyType="go"
            onSubmitEditing={() => void alVerificar()}
          />
        )}
      />
      <Boton
        titulo="Verificar"
        tituloCargando="Verificando…"
        cargando={isSubmitting}
        ancho="completo"
        onPress={() => void alVerificar()}
      />
      <Boton
        titulo={restantes > 0 ? `Reenviar código (${restantes} s)` : 'Reenviar código'}
        variante="secundario"
        ancho="completo"
        deshabilitado={restantes > 0 || reenviando}
        onPress={() => void alReenviar()}
      />
    </PantallaFormulario>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
