import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { registrarArrendador, requiereVerificacion } from '@/api/auth';
import { mensajeDeErrorRegistro } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { type DatosRegistro, esquemaRegistro } from '@/sesion/esquemas';
import { useSesion } from '@/sesion/SesionProvider';

export default function RegistroArrendador() {
  const router = useRouter();
  const { iniciarSesion } = useSesion();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const correo = useRef<TextInput>(null);
  const telefono = useRef<TextInput>(null);
  const contrasena = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosRegistro>({
    resolver: zodResolver(esquemaRegistro),
    defaultValues: { nombre: '', correo: '', telefono: '', contrasena: '' },
  });

  const alEnviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      const respuesta = await registrarArrendador(datos);
      if (requiereVerificacion(respuesta)) {
        // Con correo activo el servidor no entrega token: no se inicia sesión.
        router.replace({
          pathname: '/verifica-correo',
          params: { correo: respuesta.correo, rol: 'arrendador' },
        });
        return;
      }
      await iniciarSesion(respuesta);
    } catch (error) {
      setErrorServidor(mensajeDeErrorRegistro(error));
    }
  });

  return (
    <PantallaFormulario
      titulo="Crea tu cuenta"
      subtitulo="Para arrendadores"
      accionFija={
        <Boton
          titulo="Crear cuenta"
          tituloCargando="Creando cuenta…"
          cargando={isSubmitting}
          ancho="completo"
          onPress={() => void alEnviar()}
        />
      }
    >
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}

      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Nombre completo"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.nombre?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => correo.current?.focus()}
          />
        )}
      />
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
            inputRef={correo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => telefono.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="telefono"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Teléfono"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.telefono?.message}
            inputRef={telefono}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
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
            ayuda="Mínimo 8 caracteres, con una letra y un número."
            contrasena
            inputRef={contrasena}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void alEnviar()}
          />
        )}
      />
    </PantallaFormulario>
  );
}
