import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  type AdjuntoElegido,
  describirDuracion,
  elegirVideo,
  mensajeDeResultadoVideo,
  type OrigenVideo,
  prepararAdjuntoFoto,
} from '../../utilidades/adjuntoSolicitud';
import { describirTamano } from '../../utilidades/comprobante';
import { elegirFoto, mensajeDeResultadoFoto, type OrigenFoto } from '../../utilidades/foto';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Texto } from '../Texto';

interface Props {
  valor: AdjuntoElegido | null;
  onCambio: (adjunto: AdjuntoElegido | null) => void;
  deshabilitado?: boolean;
}

/** "Video · 0:12 · 8,0 MB": lo que se sabe del video antes de enviarlo. */
function resumenDeVideo(adjunto: AdjuntoElegido): string {
  const partes = ['Video'];
  const duracion = describirDuracion(adjunto.duracionMs);
  if (duracion) partes.push(duracion);
  if (adjunto.tamanoBytes !== undefined) partes.push(describirTamano(adjunto.tamanoBytes));
  return partes.join(' · ');
}

/**
 * Adjunto de la solicitud: UNA foto o UN video MP4, con cámara o galería. Elegir otro reemplaza al
 * anterior. La foto se reduce una vez al elegirla; el video no se toca (no hay compresión posible en
 * Expo Go), por eso se muestra su tamaño y se bloquea lo que pase de 20 MB.
 */
export function SelectorAdjunto({ valor, onCambio, deshabilitado = false }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  // El selector del sistema tarda en abrir: un segundo toque no debe lanzar otro.
  const enCurso = useRef(false);

  async function ejecutar(trabajo: () => Promise<void>) {
    if (enCurso.current || deshabilitado) return;
    enCurso.current = true;
    setTrabajando(true);
    setMensaje(null);
    setVerAjustes(false);
    try {
      await trabajo();
    } finally {
      enCurso.current = false;
      setTrabajando(false);
    }
  }

  const deFoto = (origen: OrigenFoto) =>
    ejecutar(async () => {
      const resultado = await elegirFoto(origen);
      if (resultado.tipo === 'elegida') {
        try {
          onCambio(await prepararAdjuntoFoto(resultado.archivo));
        } catch {
          setMensaje('No pudimos preparar la foto. Elígela de nuevo.');
        }
        return;
      }
      setMensaje(mensajeDeResultadoFoto(resultado));
      setVerAjustes(resultado.tipo === 'denegado' && resultado.definitivo);
    });

  const deVideo = (origen: OrigenVideo) =>
    ejecutar(async () => {
      const resultado = await elegirVideo(origen);
      if (resultado.tipo === 'elegido') {
        onCambio(resultado.adjunto);
        return;
      }
      setMensaje(mensajeDeResultadoVideo(resultado));
      setVerAjustes(resultado.tipo === 'denegado' && resultado.definitivo);
    });

  const bloqueado = deshabilitado || trabajando;
  return (
    <View style={estilos.grupo}>
      {valor ? (
        <View style={estilos.elegido}>
          {valor.tipo === 'IMAGEN' ? (
            <Image
              source={{ uri: valor.uri }}
              contentFit="cover"
              cachePolicy="memory"
              accessibilityLabel="Foto del adjunto"
              accessible
              style={estilos.miniatura}
            />
          ) : null}
          <View style={estilos.textos}>
            <Texto variante="cuerpoFuerte" numberOfLines={1}>
              {valor.tipo === 'IMAGEN' ? 'Foto lista para enviar' : valor.nombreVisible}
            </Texto>
            {valor.tipo === 'VIDEO' ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                {resumenDeVideo(valor)}
              </Texto>
            ) : null}
          </View>
          <Boton
            titulo="Quitar adjunto"
            variante="secundario"
            deshabilitado={bloqueado}
            onPress={() => onCambio(null)}
          />
        </View>
      ) : null}

      <Boton
        titulo="Tomar foto"
        icono="camara"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void deFoto('camara')}
      />
      <Boton
        titulo="Elegir foto de la galería"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void deFoto('galeria')}
      />
      <Boton
        titulo="Grabar video"
        icono="camara"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void deVideo('camara')}
      />
      <Boton
        titulo="Elegir video de la galería"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void deVideo('galeria')}
      />
      {mensaje ? <Aviso mensaje={mensaje} tono="advertencia" /> : null}
      {verAjustes ? (
        <Boton
          titulo="Abrir ajustes"
          variante="secundario"
          ancho="completo"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  elegido: {
    gap: espaciado.xs,
    padding: espaciado.sm,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.05),
  },
  miniatura: {
    width: '100%',
    height: 160,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.06),
  },
  textos: { gap: 2 },
});
