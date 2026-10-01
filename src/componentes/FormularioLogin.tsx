import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { TextInput } from 'react-native';

import type { RespuestaAutenticacion } from '../api/auth';
import { MENSAJE_SESION_VENCIDA, mensajeDeError } from '../api/errores';
import { type DatosLogin, esquemaLogin } from '../sesion/esquemas';
import { useSesion } from '../sesion/SesionProvider';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';

interface Props {
  /** Llama al endpoint de login del rol y devuelve su respuesta. */
  enviar: (datos: DatosLogin) => Promise<RespuestaAutenticacion>;
}

/** Correo y contraseña: el mismo formulario para arrendador e inquilino. */
export function FormularioLogin({ enviar }: Props) {
  const { aviso, iniciarSesion } = useSesion();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const contrasena = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { correo: '', contrasena: '' },
  });

  const alEnviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await iniciarSesion(await enviar(datos));
      // Al iniciar sesión, las rutas protegidas llevan solas a la pantalla del rol.
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  return (
    <>
      {aviso === 'SESION_VENCIDA' ? (
        <Aviso tono="advertencia" mensaje={MENSAJE_SESION_VENCIDA} />
      ) : null}
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}

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
