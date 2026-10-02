import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ArchivoFoto } from '../../api/inmuebles';
import {
  type Comprobante,
  describirTamano,
  elegirPdf,
  mensajeDeResultadoPdf,
  prepararFoto,
} from '../../utilidades/comprobante';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { OpcionesFoto } from '../inmuebles/OpcionesFoto';
import { Texto } from '../Texto';

interface Props {
  valor: Comprobante | null;
  onCambio: (comprobante: Comprobante | null) => void;
  deshabilitado?: boolean;
  /** Mensaje de error del formulario (p. ej. "Adjunta el comprobante del pago."). */
  error?: string;
}

/**
 * Comprobante del pago: foto con la cámara o la galería (se reduce antes de subir) o un PDF. Muestra
 * lo elegido (miniatura de la foto, o nombre y tamaño del PDF) y permite cambiarlo o quitarlo.
 */
export function SelectorComprobante({ valor, onCambio, deshabilitado = false, error }: Props) {
  const [preparando, setPreparando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // El selector de archivos tarda en abrir: un segundo toque no debe lanzar otro.
  const enCurso = useRef(false);

  async function alElegirFoto(foto: ArchivoFoto) {
    setMensaje(null);
    setPreparando(true);
    try {
      onCambio(await prepararFoto(foto));
    } catch {
      setMensaje('No pudimos preparar la foto. Elígela de nuevo.');
    } finally {
      setPreparando(false);
    }
  }

  async function elegirUnPdf() {
    if (enCurso.current || deshabilitado || preparando) return;
    enCurso.current = true;
    setMensaje(null);
    try {
      const resultado = await elegirPdf();
      if (resultado.tipo === 'elegido') onCambio(resultado.comprobante);
      else setMensaje(mensajeDeResultadoPdf(resultado));
    } finally {
      enCurso.current = false;
    }
  }

  const bloqueado = deshabilitado || preparando;
  const esFoto = valor?.type === 'image/jpeg';

  return (
    <View style={estilos.grupo}>
      {valor ? (
        <View style={estilos.elegido}>
          {esFoto ? (
            <Image
              source={{ uri: valor.uri }}
              contentFit="cover"
              cachePolicy="memory"
              accessibilityLabel="Foto del comprobante"
              accessible
              style={estilos.miniatura}
            />
          ) : null}
          <View style={estilos.textos}>
            <Texto variante="cuerpoFuerte" numberOfLines={1}>
              {esFoto ? 'Foto del comprobante' : valor.nombreVisible}
            </Texto>
            {!esFoto && valor.tamanoBytes !== undefined ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                {describirTamano(valor.tamanoBytes)}
              </Texto>
            ) : null}
          </View>
        </View>
      ) : null}
      {preparando ? <Aviso tono="informacion" mensaje="Preparando el comprobante…" /> : null}
      {mensaje ? <Aviso mensaje={mensaje} /> : null}
      {error ? <Aviso mensaje={error} /> : null}
      <OpcionesFoto onElegida={(foto) => void alElegirFoto(foto)} deshabilitado={bloqueado} />
      <Boton
        titulo="Elegir un PDF"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void elegirUnPdf()}
      />
      {valor ? (
        <Boton
          titulo="Quitar comprobante"
          variante="destructivo"
          ancho="completo"
          deshabilitado={bloqueado}
          onPress={() => onCambio(null)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  elegido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.sm,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.05),
  },
  miniatura: { width: 64, height: 64, borderRadius: radios.pequeno },
  textos: { flex: 1, gap: 2 },
});
