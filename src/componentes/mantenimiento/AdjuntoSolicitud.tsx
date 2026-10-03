// Ver el adjunto de una solicitud (foto o video). La URL firmada caduca en 1 hora y es sensible:
// ANTES de ampliar la foto, reproducir el video o abrir el archivo se vuelve a pedir la solicitud y
// se usa la URL nueva; solo vive en el estado de este componente (memoria), nada se guarda en disco
// y ningún error la repite.

import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TipoAdjunto } from '../../api/mantenimiento';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { descargarYCompartir } from '../../utilidades/documentos';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Texto } from '../Texto';
import { VisorImagen } from '../VisorImagen';

export interface AdjuntoFresco {
  adjunto_url: string | null;
  adjunto_tipo: TipoAdjunto | null;
}

interface Props {
  solicitudId: string;
  tipo: TipoAdjunto | null;
  url: string | null;
  /** Vuelve a pedir la solicitud y entrega su adjunto con la URL FRESCA (null si ya no existe). */
  obtenerFresco: () => Promise<AdjuntoFresco | null | undefined>;
}

const MENSAJE_NO_SE_PUDO = 'No pudimos abrir el adjunto. Inténtalo de nuevo.';
const MENSAJE_VIDEO_NO_SE_PUDO = 'No pudimos reproducir el video. Inténtalo de nuevo.';

function Reproductor({ url, alFallar }: { url: string; alFallar: () => void }) {
  const jugador = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  const fallo = useRef(alFallar);
  useEffect(() => {
    fallo.current = alFallar;
  });
  useEffect(() => {
    const suscripcion = jugador.addListener('statusChange', ({ status }) => {
      if (status === 'error') fallo.current();
    });
    return () => suscripcion.remove();
  }, [jugador]);
  return (
    <VideoView
      player={jugador}
      nativeControls
      contentFit="contain"
      accessibilityLabel="Video de la solicitud"
      style={estilos.video}
    />
  );
}

/** Nada si la solicitud no trae adjunto; "Adjunto no disponible" si lo tiene pero no hay URL. */
export function AdjuntoSolicitud({ solicitudId, tipo, url, obtenerFresco }: Props) {
  const [tipoActual, setTipoActual] = useState(tipo);
  const [urlImagen, setUrlImagen] = useState<string | null>(tipo === 'IMAGEN' ? url : null);
  const [urlVideo, setUrlVideo] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  // Un toque a la vez: pedir la solicitud y descargar tardan.
  const enCurso = useRef(false);
  // Si la imagen o el video fallan (URL vencida) se vuelve a pedir una sola vez.
  const reintentoDeImagen = useRef(false);
  const reintentoDeVideo = useRef(false);

  if (tipo === null && url === null && !noDisponible) return null;
  if (noDisponible || (url === null && urlImagen === null && urlVideo === null)) {
    return (
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        Adjunto no disponible
      </Texto>
    );
  }

  /** El adjunto con la URL nueva (o null si ya no hay). Nunca se muestra ni se registra. */
  async function frescos(): Promise<{ url: string } | null> {
    const fresco = await obtenerFresco();
    if (!fresco || !fresco.adjunto_url) {
      setNoDisponible(true);
      setUrlImagen(null);
      setUrlVideo(null);
      return null;
    }
    setTipoActual(fresco.adjunto_tipo);
    return { url: fresco.adjunto_url };
  }

  async function accion(trabajo: () => Promise<void>) {
    if (enCurso.current) return;
    enCurso.current = true;
    setTrabajando(true);
    setError(null);
    try {
      await trabajo();
    } catch {
      // Cualquier fallo (el nativo puede traer la URL en su texto) es el mismo mensaje.
      setError(MENSAJE_NO_SE_PUDO);
    } finally {
      enCurso.current = false;
      setTrabajando(false);
    }
  }

  const ampliar = () =>
    accion(async () => {
      const fresco = await frescos();
      if (!fresco) return;
      reintentoDeImagen.current = false;
      setUrlImagen(fresco.url);
      setAmpliada(true);
    });

  const reproducir = () =>
    accion(async () => {
      const fresco = await frescos();
      if (!fresco) return;
      reintentoDeVideo.current = false;
      setUrlVideo(fresco.url);
    });

  const abrirArchivo = () =>
    accion(async () => {
      const fresco = await frescos();
      if (!fresco) return;
      // Sin tipo conocido no se supone ninguno: se ofrece como un archivo cualquiera.
      await descargarYCompartir(fresco.url, `adjunto-${solicitudId}`, {
        titulo: 'Compartir adjunto',
        mimeType: '*/*',
        uti: 'public.data',
      });
    });

  async function alFallarImagen() {
    if (reintentoDeImagen.current) return;
    reintentoDeImagen.current = true;
    try {
      const fresco = await obtenerFresco();
      if (fresco?.adjunto_url) setUrlImagen(fresco.adjunto_url);
    } catch {
      setError(MENSAJE_NO_SE_PUDO);
    }
  }

  async function alFallarVideo() {
    if (reintentoDeVideo.current) {
      // Segundo fallo seguido: se detiene y se puede volver a intentar con el botón.
      reintentoDeVideo.current = false;
      setUrlVideo(null);
      setError(MENSAJE_VIDEO_NO_SE_PUDO);
      return;
    }
    reintentoDeVideo.current = true;
    try {
      const fresco = await obtenerFresco();
      if (fresco?.adjunto_url) setUrlVideo(fresco.adjunto_url);
      else setNoDisponible(true);
    } catch {
      setUrlVideo(null);
      setError(MENSAJE_VIDEO_NO_SE_PUDO);
    }
  }

  return (
    <View style={estilos.grupo}>
      {error ? <Aviso mensaje={error} /> : null}

      {tipoActual === 'IMAGEN' ? (
        <>
          {urlImagen ? (
            // Tocar la foto la amplía igual que "Ampliar" (con la URL recién pedida).
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ampliar foto de la solicitud"
              disabled={trabajando}
              onPress={() => void ampliar()}
            >
              <Image
                source={{ uri: urlImagen }}
                contentFit="cover"
                cachePolicy="memory"
                accessibilityLabel="Foto de la solicitud"
                accessible
                onError={() => void alFallarImagen()}
                style={estilos.vistaPrevia}
              />
            </Pressable>
          ) : null}
          <Boton
            titulo="Ampliar"
            tituloCargando="Abriendo…"
            cargando={trabajando}
            variante="secundario"
            ancho="completo"
            onPress={() => void ampliar()}
          />
        </>
      ) : tipoActual === 'VIDEO' ? (
        urlVideo ? (
          <Reproductor key={urlVideo} url={urlVideo} alFallar={() => void alFallarVideo()} />
        ) : (
          <Boton
            titulo="Reproducir video"
            tituloCargando="Abriendo…"
            cargando={trabajando}
            variante="secundario"
            ancho="completo"
            onPress={() => void reproducir()}
          />
        )
      ) : (
        <Boton
          titulo="Abrir archivo"
          tituloCargando="Abriendo…"
          cargando={trabajando}
          variante="secundario"
          ancho="completo"
          onPress={() => void abrirArchivo()}
        />
      )}

      <VisorImagen
        visible={ampliada}
        uri={urlImagen}
        descripcion="Foto de la solicitud"
        cachePolicy="memory"
        onCerrar={() => setAmpliada(false)}
        onError={() => void alFallarImagen()}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  vistaPrevia: {
    width: '100%',
    height: 220,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.06),
  },
  video: { width: '100%', height: 220, borderRadius: radios.medio, backgroundColor: colores.tinta },
});
