import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, type TextInput } from 'react-native';

import {
  completarRegistroInquilino,
  requiereVerificacion,
  type RespuestaValidarCodigo,
  validarCodigoAcceso,
} from '../api/auth';
import { ErrorApi } from '../api/cliente';
import { MENSAJES_ERROR, mensajeDeErrorActivacion } from '../api/errores';
import { formatearCodigoEscrito, validarCodigo } from '../sesion/codigo';
import { guardarCodigoPendiente } from '../sesion/codigoPendiente';
import { type DatosActivacionForm, esquemaActivacion } from '../sesion/esquemas';
import { useSesion } from '../sesion/SesionProvider';
import { colores, espaciado } from '../tema';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { PantallaFormulario } from './PantallaFormulario';
import { Superficie } from './Superficie';
import { Texto } from './Texto';

const TITULO = 'Activa tu cuenta';
const SUBTITULO = 'Con el código de tu arrendador';
const MENSAJE_FORMATO = 'Revisa el código: tiene el formato RC-XXXX-XXXX.';

type Paso =
  | { tipo: 'codigo' }
  | { tipo: 'cuenta'; codigo: string; datos: RespuestaValidarCodigo }
  | { tipo: 'iniciarSesion'; codigo: string; mensaje: string };

interface Props {
  /** Código ya escrito (enlace rentcheck://activar/<codigo>): se muestra, pero NO se envía solo. */
  codigoInicial?: string;
  /** Aviso al abrir (enlace con un código mal formado). */
  avisoInicial?: string;
}

/** Activación del inquilino: 1) el código, 2) crear la cuenta. Quien ya tiene cuenta inicia sesión. */
export function ActivacionInquilino({ codigoInicial = '', avisoInicial }: Props) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'codigo' });
  const [aviso, setAviso] = useState<string | null>(null);

  // El paso de la cuenta (el formulario largo) lleva su propio marco para anclar el botón abajo.
  if (paso.tipo === 'cuenta') {
    return (
      <PasoCuenta
        codigo={paso.codigo}
        datos={paso.datos}
        onYaTieneCuenta={() =>
          setPaso({
            tipo: 'iniciarSesion',
            codigo: paso.codigo,
            mensaje: MENSAJES_ERROR.REQUIERE_INICIO_SESION,
          })
        }
        onCodigoInvalido={(mensaje) => {
          setAviso(mensaje);
          setPaso({ tipo: 'codigo' });
        }}
      />
    );
  }

  return (
    <PantallaFormulario titulo={TITULO} subtitulo={SUBTITULO}>
      {paso.tipo === 'codigo' ? (
        <PasoCodigo
          codigoInicial={codigoInicial}
          aviso={aviso ?? avisoInicial ?? null}
          onValidado={(codigo, datos) =>
            setPaso(
              datos.requiere_inicio_sesion
                ? { tipo: 'iniciarSesion', codigo, mensaje: datos.mensaje }
                : { tipo: 'cuenta', codigo, datos },
            )
          }
        />
      ) : (
        <PasoYaTengoCuenta codigo={paso.codigo} mensaje={paso.mensaje} />
      )}
    </PantallaFormulario>
  );
}

function PasoCodigo({
  codigoInicial,
  aviso,
  onValidado,
}: {
  codigoInicial: string;
  aviso: string | null;
  onValidado: (codigo: string, datos: RespuestaValidarCodigo) => void;
}) {
  const [valor, setValor] = useState(formatearCodigoEscrito(codigoInicial));
  const [errorCampo, setErrorCampo] = useState<string | undefined>();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function continuar() {
    if (enviando) return;
    const resultado = validarCodigo(valor);
    // Un código mal formado no se envía: cada fallo en el servidor cuenta para el bloqueo de 15 min.
    if (!resultado.valido) {
      setErrorCampo(MENSAJE_FORMATO);
      return;
    }
    setErrorCampo(undefined);
    setErrorServidor(null);
    setEnviando(true);
    try {
      onValidado(resultado.codigo, await validarCodigoAcceso(resultado.codigo));
    } catch (error) {
      setErrorServidor(mensajeDeErrorActivacion(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {aviso ? <Aviso tono="advertencia" mensaje={aviso} /> : null}
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}
      <CampoTexto
        etiqueta="Código de activación"
        valor={valor}
        onCambio={(texto) => {
          setValor(formatearCodigoEscrito(texto));
          setErrorCampo(undefined);
        }}
        error={errorCampo}
        ayuda="Lo encuentras en el mensaje de tu arrendador."
        autoCapitalize="characters"
        returnKeyType="go"
        onSubmitEditing={() => void continuar()}
      />
      <Boton
        titulo="Continuar"
        tituloCargando="Validando…"
        cargando={enviando}
        ancho="completo"
        onPress={() => void continuar()}
      />
    </>
  );
}

function PasoCuenta({
  codigo,
  datos,
  onYaTieneCuenta,
  onCodigoInvalido,
}: {
  codigo: string;
  datos: RespuestaValidarCodigo;
  onYaTieneCuenta: () => void;
  onCodigoInvalido: (mensaje: string) => void;
}) {
  const router = useRouter();
  const { iniciarSesion } = useSesion();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const contrasena = useRef<TextInput>(null);
  const confirmacion = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosActivacionForm>({
    resolver: zodResolver(esquemaActivacion),
    defaultValues: { correo: '', contrasena: '', confirmacion: '' },
  });

  const alEnviar = handleSubmit(async (valores) => {
    setErrorServidor(null);
    try {
      const respuesta = await completarRegistroInquilino({
        codigo,
        correo: valores.correo,
        contrasena: valores.contrasena,
      });
      if (requiereVerificacion(respuesta)) {
        // Con correo activo el servidor no entrega token: primero hay que verificar el correo.
        router.replace({
          pathname: '/verifica-correo',
          params: { correo: respuesta.correo, rol: 'inquilino' },
        });
        return;
      }
      await iniciarSesion(respuesta);
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'REQUIERE_INICIO_SESION') {
        onYaTieneCuenta();
      } else if (error instanceof ErrorApi && error.status === 404) {
        onCodigoInvalido(mensajeDeErrorActivacion(error));
      } else {
        setErrorServidor(mensajeDeErrorActivacion(error));
      }
    }
  });

  return (
    <PantallaFormulario
      titulo={TITULO}
      subtitulo={SUBTITULO}
      accionFija={
        <Boton
          titulo="Crear mi cuenta"
          tituloCargando="Creando cuenta…"
          cargando={isSubmitting}
          ancho="completo"
          onPress={() => void alEnviar()}
        />
      }
    >
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Hola, {datos.nombreInquilino}
        </Texto>
        {datos.nombreUnidad ? <Texto variante="cuerpoFuerte">{datos.nombreUnidad}</Texto> : null}
        {datos.direccionInmueble ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            {datos.direccionInmueble}
          </Texto>
        ) : null}
        <Texto variante="secundario" color={colores.textoSecundario}>
          Crea tu cuenta para ver tu contrato.
        </Texto>
      </Superficie>

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
            ayuda="Mínimo 8 caracteres, con una letra y un número."
            contrasena
            inputRef={contrasena}
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
    </PantallaFormulario>
  );
}

function PasoYaTengoCuenta({ codigo, mensaje }: { codigo: string; mensaje: string }) {
  const router = useRouter();

  function iniciarSesion() {
    // El código espera (solo en memoria) a que la persona inicie sesión para vincular el contrato.
    guardarCodigoPendiente(codigo);
    router.push({ pathname: '/login-inquilino', params: { codigo } });
  }

  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Ya tienes una cuenta
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {mensaje}
        </Texto>
      </Superficie>
      <Boton titulo="Iniciar sesión" ancho="completo" onPress={iniciarSesion} />
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
