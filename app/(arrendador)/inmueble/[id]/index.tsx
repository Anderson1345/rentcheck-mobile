import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { ErrorApi, sanearCausa } from '@/api/cliente';
import {
  detalleTecnico,
  mensajeDeError,
  mensajeDeErrorFoto,
  mensajeDeErrorInmueble,
} from '@/api/errores';
import type { ArchivoFoto, Inmueble } from '@/api/inmuebles';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { DetalleTecnico } from '@/componentes/DetalleTecnico';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaUnidad } from '@/componentes/inmuebles/FilaUnidad';
import { OpcionesFoto } from '@/componentes/inmuebles/OpcionesFoto';
import { PortadaInmueble } from '@/componentes/inmuebles/PortadaInmueble';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useEliminarInmueble, useInmueble, useSubirPortada } from '@/consultas/inmuebles';
import { colores, espaciado } from '@/tema';

const AVISO_FOTO_FALLIDA =
  'Inmueble creado, pero la foto no se pudo subir. Puedes volver a intentarlo con Cambiar foto.';

export default function DetalleInmueble() {
  const router = useRouter();
  const { id, foto, detalle } = useLocalSearchParams<{
    id: string;
    foto?: string;
    detalle?: string;
  }>();
  // Al eliminar se deja de consultar el detalle: pedirlo otra vez daría 404.
  const [eliminando, setEliminando] = useState(false);
  const consulta = useInmueble(id, !eliminando);
  const eliminarInmueble = useEliminarInmueble(id);
  const [errorEliminar, setErrorEliminar] = useState<{
    mensaje: string;
    detalle: string | null;
  } | null>(null);
  const subirPortada = useSubirPortada(id);
  const { data: inmueble, isPending, isError, error, refetch } = consulta;
  const [refrescando, setRefrescando] = useState(false);
  const [verOpciones, setVerOpciones] = useState(false);
  // Foto elegida que se está subiendo (o que falló): se ve como vista previa y se puede reintentar.
  const [pendiente, setPendiente] = useState<ArchivoFoto | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<{ mensaje: string; detalle: string | null } | null>(
    null,
  );
  const [avisoFotoFallida, setAvisoFotoFallida] = useState(foto === 'fallida');
  // Llega por la ruta desde el formulario: se vuelve a sanear por si la ruta vino de otro lado.
  const detalleAviso = typeof detalle === 'string' ? (sanearCausa(detalle) ?? null) : null;
  useRefrescarAlEnfocar(consulta);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/inmuebles');
  }

  function confirmarEliminar() {
    Alert.alert(
      'Eliminar inmueble',
      'Se eliminará este inmueble y no se puede deshacer. Solo se puede si no tiene unidades ni documentos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setErrorEliminar(null);
            setEliminando(true);
            eliminarInmueble.mutateAsync().then(
              () => router.replace('/inmuebles'),
              (falla: unknown) => {
                setEliminando(false);
                setErrorEliminar({
                  mensaje: mensajeDeErrorInmueble(falla),
                  detalle: detalleTecnico(falla),
                });
              },
            );
          },
        },
      ],
    );
  }

  async function arrastrar() {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }

  async function subir(archivo: ArchivoFoto) {
    if (subiendo) return;
    setPendiente(archivo);
    setErrorFoto(null);
    setSubiendo(true);
    try {
      await subirPortada.mutateAsync(archivo);
      setPendiente(null);
      setAvisoFotoFallida(false);
      setVerOpciones(false);
    } catch (falla) {
      setErrorFoto({ mensaje: mensajeDeErrorFoto(falla), detalle: detalleTecnico(falla) });
    } finally {
      setSubiendo(false);
    }
  }

  if (inmueble === undefined) {
    if (isPending) {
      return (
        <PantallaPila>
          <EsqueletoCarga filas={3} />
        </PantallaPila>
      );
    }
    if (isError && error instanceof ErrorApi && error.status === 404) {
      return (
        <PantallaPila>
          <EstadoMensaje
            titulo="No encontrado"
            mensaje="Este inmueble no existe o no tienes acceso a él."
          >
            <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
          </EstadoMensaje>
        </PantallaPila>
      );
    }
    return (
      <PantallaPila>
        <Aviso mensaje={mensajeDeError(error)} />
        <Boton
          titulo="Reintentar"
          variante="secundario"
          ancho="completo"
          onPress={() => void refetch()}
        />
      </PantallaPila>
    );
  }

  return (
    <PantallaPila
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
    >
      {avisoFotoFallida ? (
        <View style={estilos.grupo}>
          <Aviso mensaje={AVISO_FOTO_FALLIDA} tono="advertencia" />
          <DetalleTecnico detalle={detalleAviso} />
        </View>
      ) : null}

      <PortadaInmueble
        inmuebleId={inmueble.id}
        url={pendiente?.uri ?? inmueble.foto_portada_url}
        variante="grande"
        descripcion={`Foto de portada de ${inmueble.direccion}`}
        alFallarUrl={() => void refetch({ cancelRefetch: false })}
      />
      {subiendo ? (
        <Texto variante="secundario" color={colores.textoSecundario}>
          Subiendo foto…
        </Texto>
      ) : null}
      {errorFoto && pendiente ? (
        <View style={estilos.grupo}>
          <Aviso mensaje={errorFoto.mensaje} />
          <DetalleTecnico detalle={errorFoto.detalle} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            ancho="completo"
            deshabilitado={subiendo}
            onPress={() => void subir(pendiente)}
          />
        </View>
      ) : null}

      <DatosInmueble inmueble={inmueble} />

      <View style={estilos.acciones}>
        <Boton
          titulo="Editar"
          variante="primario"
          ancho="completo"
          style={estilos.accion}
          onPress={() =>
            router.push({ pathname: '/inmueble/[id]/editar', params: { id: inmueble.id } })
          }
        />
        <Boton
          titulo="Cambiar foto"
          icono="camara"
          variante="secundario"
          ancho="completo"
          style={estilos.accion}
          onPress={() => setVerOpciones((visible) => !visible)}
        />
      </View>
      {verOpciones ? (
        <Superficie>
          <OpcionesFoto onElegida={(archivo) => void subir(archivo)} deshabilitado={subiendo} />
        </Superficie>
      ) : null}

      <Texto variante="tituloSeccion" accessibilityRole="header" style={estilos.titulo}>
        Unidades
      </Texto>
      <Boton
        titulo="Agregar unidad"
        icono="anadir"
        variante="secundario"
        ancho="completo"
        onPress={() =>
          router.push({ pathname: '/inmueble/[id]/unidad/nueva', params: { id: inmueble.id } })
        }
      />
      {inmueble.unidades.length === 0 ? (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Este inmueble aún no tiene unidades.
        </Texto>
      ) : (
        <Superficie relleno="ninguno" style={estilos.unidades}>
          {inmueble.unidades.map((unidad, indice) => (
            <FilaUnidad
              key={unidad.id}
              unidad={unidad}
              separador={indice > 0}
              onPress={() =>
                router.push({
                  pathname: '/inmueble/[id]/unidad/[unidadId]',
                  params: { id: inmueble.id, unidadId: unidad.id },
                })
              }
            />
          ))}
        </Superficie>
      )}

      <View style={estilos.eliminar}>
        {errorEliminar ? (
          <>
            <Aviso mensaje={errorEliminar.mensaje} />
            <DetalleTecnico detalle={errorEliminar.detalle} />
          </>
        ) : null}
        {inmueble.unidades.length > 0 ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            Para eliminar el inmueble, primero elimina sus unidades (incluida la unidad principal).
            Solo se puede si nunca tuvieron contratos.
          </Texto>
        ) : null}
        <Boton
          titulo="Eliminar inmueble"
          variante="destructivo"
          ancho="completo"
          deshabilitado={eliminando}
          onPress={confirmarEliminar}
        />
      </View>
    </PantallaPila>
  );
}

function DatosInmueble({ inmueble }: { inmueble: Inmueble }) {
  return (
    <Superficie style={estilos.datos}>
      <Texto variante="titulo" accessibilityRole="header">
        {inmueble.direccion}
      </Texto>
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        {inmueble.ciudad}
      </Texto>
      {inmueble.estrato !== null ? (
        <Texto variante="cuerpoFuerte">{`Estrato ${inmueble.estrato}`}</Texto>
      ) : null}
      <Texto variante="secundario" color={colores.textoSecundario}>
        {`Matrícula inmobiliaria ${inmueble.matricula_inmobiliaria}`}
      </Texto>
    </Superficie>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  datos: { gap: espaciado.xxs },
  acciones: { flexDirection: 'row', gap: espaciado.xs },
  accion: { flex: 1 },
  titulo: { marginTop: espaciado.xs },
  unidades: { paddingVertical: espaciado.xxs },
  eliminar: { gap: espaciado.xs, marginTop: espaciado.lg },
});
