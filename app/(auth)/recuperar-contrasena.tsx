import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import { recuperarContrasena } from '@/api/auth';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { PantallaFormulario } from '@/componentes/PantallaFormulario';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { type DatosRecuperar, esquemaRecuperar } from '@/sesion/esquemas';
import { colores, espaciado } from '@/tema';

// Siempre el mismo mensaje, exista o no el correo: el servidor tampoco lo revela.
const MENSAJE_ENVIADO = 'Si el correo tiene cuenta, te enviamos un código.';

// Las rutas existen aunque el enlace de los logins esté oculto (recuperación apagada en el servidor).
export default function RecuperarContrasena() {
  const router = useRouter();
  const { rol, correo: correoParam } = useLocalSearchParams<{ rol?: string; correo?: string }>();
  const rolEfectivo = rol === 'inquilino' ? 'inquilino' : 'arrendador';
  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DatosRecuperar>({
    resolver: zodResolver(esquemaRecuperar),
    defaultValues: { correo: typeof correoParam === 'string' ? correoParam : '' },
  });

  const alEnviar = handleSubmit(async ({ correo }) => {
    setErrorServidor(null);
    try {
      await recuperarContrasena(correo);
      setCorreoEnviado(correo);
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  function irARestablecer(correo: string) {
    router.push({
      pathname: '/restablecer-contrasena',
      params: correo ? { correo, rol: rolEfectivo } : { rol: rolEfectivo },
    });
  }

  return (
    <PantallaFormulario titulo="Recupera tu contraseña" subtitulo="Te enviamos un código al correo">
      {correoEnviado ? (
        <>
          <Superficie style={estilos.tarjeta}>
            <Texto variante="tituloSeccion">Revisa tu correo</Texto>
            <Texto variante="cuerpo" color={colores.textoSecundario}>
              {MENSAJE_ENVIADO}
            </Texto>
          </Superficie>
          <Boton
            titulo="Ya tengo el código"
            ancho="completo"
            onPress={() => irARestablecer(correoEnviado)}
          />
        </>
      ) : (
        <>
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
                returnKeyType="go"
                onSubmitEditing={() => void alEnviar()}
              />
            )}
          />
          <Boton
            titulo="Enviar código"
            tituloCargando="Enviando…"
            cargando={isSubmitting}
            ancho="completo"
            onPress={() => void alEnviar()}
          />
          <Boton
            titulo="Ya tengo un código"
            variante="secundario"
            ancho="completo"
            onPress={() => irARestablecer(getValues('correo').trim().toLowerCase())}
          />
        </>
      )}
    </PantallaFormulario>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
