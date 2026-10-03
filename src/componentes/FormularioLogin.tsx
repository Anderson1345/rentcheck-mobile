import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, type TextInput } from 'react-native';

import type { RespuestaAutenticacion } from '../api/auth';
import { ErrorApi } from '../api/cliente';
import { MENSAJE_SESION_VENCIDA, mensajeDeError } from '../api/errores';
import { useCapacidades } from '../consultas/capacidades';
import { type DatosLogin, esquemaLogin } from '../sesion/esquemas';
import { useSesion } from '../sesion/SesionProvider';
import type { RolSesion } from '../sesion/tipos';
import { colores } from '../tema';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { Texto } from './Texto';

interface Props {
  rol: RolSesion;
  /** Llama al endpoint de login del rol y devuelve su respuesta. */
  enviar: (datos: DatosLogin) => Promise<RespuestaAutenticacion>;
  /** Correo ya escrito (al volver de verificar el correo o de restablecer la contraseña). */
  correoInicial?: string;
}

/** Correo y contraseña: el mismo formulario para arrendador e inquilino. */
export function FormularioLogin({ rol, enviar, correoInicial = '' }: Props) {
  const router = useRouter();
  const { aviso, iniciarSesion } = useSesion();
  // Si el servidor no responde, la recuperación queda oculta; nunca se bloquea el acceso.
  const { recuperacion_contrasena: hayRecuperacion } = useCapacidades();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [correoSinVerificar, setCorreoSinVerificar] = useState(false);
  const contrasena = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { correo: correoInicial, contrasena: '' },
  });

  const correoEscrito = () => getValues('correo').trim().toLowerCase();

  const alEnviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    setCorreoSinVerificar(false);
    try {
      await iniciarSesion(await enviar(datos));
      // Al iniciar sesión, las rutas protegidas llevan solas a la pantalla del rol.
    } catch (error) {
      setCorreoSinVerificar(error instanceof ErrorApi && error.codigo === 'CORREO_NO_VERIFICADO');
      setErrorServidor(mensajeDeError(error));
    }
  });

  function irARecuperar() {
    const correo = correoEscrito();
    router.push({
      pathname: '/recuperar-contrasena',
      params: correo ? { rol, correo } : { rol },
    });
  }

  function irAVerificar() {
    // Al entrar, la pantalla pide el reenvío del código una sola vez.
    router.push({
      pathname: '/verifica-correo',
      params: { correo: correoEscrito(), rol, reenviar: '1' },
    });
  }

  // "¿La olvidaste?" va a la derecha de la etiqueta Contraseña (maqueta); si la recuperación está apagada
  // en el servidor no se muestra.
  const enlaceOlvido = hayRecuperacion ? (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="¿Olvidaste tu contraseña?"
      onPress={irARecuperar}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
    >
      <Texto variante="etiqueta" color={colores.tintaCapa}>
        ¿La olvidaste?
      </Texto>
    </Pressable>
  ) : undefined;

  return (
    <>
      {aviso === 'SESION_VENCIDA' ? (
        <Aviso tono="advertencia" mensaje={MENSAJE_SESION_VENCIDA} />
      ) : null}
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}
      {correoSinVerificar ? (
        <Boton
          titulo="Verificar mi correo"
          variante="secundario"
          ancho="completo"
          onPress={irAVerificar}
        />
      ) : null}

      <Controller
        control={control}
        name="correo"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Correo"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.correo?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => contrasena.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="contrasena"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Contraseña"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.contrasena?.message}
            contrasena
            etiquetaDerecha={enlaceOlvido}
            inputRef={contrasena}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void alEnviar()}
          />
        )}
      />
      <Boton
        titulo="Iniciar sesión"
        tituloCargando="Entrando…"
        cargando={isSubmitting}
        ancho="completo"
        onPress={() => void alEnviar()}
      />
    </>
  );
}
