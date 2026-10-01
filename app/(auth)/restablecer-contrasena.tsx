import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, type TextInput } from 'react-native';

import { restablecerContrasena } from '@/api/auth';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoCodigoSeisDigitos } from '@/componentes/CampoCodigoSeisDigitos';
import { CampoTexto } from '@/componentes/CampoTexto';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { type DatosRestablecerForm, esquemaRestablecer } from '@/sesion/esquemas';
import { colores, espaciado } from '@/tema';

export default function RestablecerContrasena() {
  const router = useRouter();
  const { rol, correo: correoParam } = useLocalSearchParams<{ rol?: string; correo?: string }>();
  const esInquilino = rol === 'inquilino';
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [correoActualizado, setCorreoActualizado] = useState<string | null>(null);
  const codigo = useRef<TextInput>(null);
  const nueva = useRef<TextInput>(null);
  const confirmacion = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosRestablecerForm>({
    resolver: zodResolver(esquemaRestablecer),
    defaultValues: {
      correo: typeof correoParam === 'string' ? correoParam : '',
      codigo: '',
      nueva_contrasena: '',
      confirmacion: '',
    },
  });

  const alEnviar = handleSubmit(async (valores) => {
    setErrorServidor(null);
    try {
      await restablecerContrasena({
        correo: valores.correo,
        codigo: valores.codigo,
        nueva_contrasena: valores.nueva_contrasena,
      });
      setCorreoActualizado(valores.correo);
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  if (correoActualizado !== null) {
    return (
      <PantallaFormulario titulo="Contraseña actualizada" subtitulo="Todo listo">
        <Superficie style={estilos.tarjeta}>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            Contraseña actualizada
          </Texto>
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Ya puedes iniciar sesión con tu contraseña nueva.
          </Texto>
        </Superficie>
        <Boton
          titulo="Ir a iniciar sesión"
          ancho="completo"
          onPress={() =>
            router.replace({
              pathname: esInquilino ? '/login-inquilino' : '/login-arrendador',
              params: { correo: correoActualizado },
            })
          }
        />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario titulo="Nueva contraseña" subtitulo="Escribe el código que te enviamos">
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
            onSubmitEditing={() => codigo.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="codigo"
        render={({ field }) => (
          <CampoCodigoSeisDigitos
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.codigo?.message}
            inputRef={codigo}
            returnKeyType="next"
            onSubmitEditing={() => nueva.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="nueva_contrasena"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Nueva contraseña"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.nueva_contrasena?.message}
            ayuda="Mínimo 8 caracteres, con una letra y un número."
            contrasena
            inputRef={nueva}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmacion.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmacion"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Confirmar contraseña"
            valor={field.value}
            onCambio={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmacion?.message}
            contrasena
            inputRef={confirmacion}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void alEnviar()}
          />
        )}
      />
      <Boton
        titulo="Cambiar contraseña"
        tituloCargando="Cambiando…"
        cargando={isSubmitting}
        ancho="completo"
        onPress={() => void alEnviar()}
      />
    </PantallaFormulario>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
