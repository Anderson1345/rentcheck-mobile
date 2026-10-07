import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  type Comprobante,
  describirTamano,
  elegirPdf,
  mensajeDeResultadoPdf,
  prepararFoto,
} from '../../utilidades/comprobante';
import { elegirFoto, mensajeDeResultadoFoto, type OrigenFoto } from '../../utilidades/foto';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Icono, type NombreIcono } from '../iconos/Icono';
import { Texto } from '../Texto';
import { ImagenAmpliable } from '../VisorImagen';

interface Props {
  valor: Comprobante | null;
  onCambio: (comprobante: Comprobante | null) => void;
  deshabilitado?: boolean;
  /** Mensaje de error del formulario (p. ej. "Adjunta el comprobante del pago."). */
  error?: string;
}

/** Una de las tres opciones (maqueta Formulario): mosaico de 92 dp con su icono y su nombre. */
function Opcion({
  titulo,
  icono,
  deshabilitado,
  onPress,
}: {
  titulo: string;
  icono: NombreIcono;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.opcion,
        deshabilitado && estilos.apagada,
        pressed && estilos.presionada,
      ]}
    >
      <Icono nombre={icono} tamano={24} grosor={1.7} />
      <Texto variante="etiqueta">{titulo}</Texto>
    </Pressable>
  );
}

/**
 * Comprobante del pago (R4-A, maqueta Formulario): Cámara, Galería o PDF. La foto se reduce antes de
 * subir. Lo elegido se ve en una fila con la vista previa (la foto se amplía al tocarla), el nombre, el
 * peso y "Quitar". Si falta el permiso de la cámara o la galería se explica y, si se negó para siempre,
 * se ofrece abrir los ajustes.
 */
export function SelectorComprobante({ valor, onCambio, deshabilitado = false, error }: Props) {
  const [preparando, setPreparando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  // El selector del sistema tarda en abrir: un segundo toque no debe lanzar otro.
  const enCurso = useRef(false);
  const bloqueado = deshabilitado || preparando;

  async function ejecutar(trabajo: () => Promise<void>) {
    if (enCurso.current || bloqueado) return;
    enCurso.current = true;
    setMensaje(null);
    setVerAjustes(false);
    try {
      await trabajo();
    } finally {
      enCurso.current = false;
    }
  }

  const deFoto = (origen: OrigenFoto) =>
    ejecutar(async () => {
      const resultado = await elegirFoto(origen);
      if (resultado.tipo !== 'elegida') {
        setMensaje(mensajeDeResultadoFoto(resultado));
        setVerAjustes(resultado.tipo === 'denegado' && resultado.definitivo);
        return;
      }
      setPreparando(true);
      try {
        onCambio(await prepararFoto(resultado.archivo));
      } catch {
        setMensaje('No pudimos preparar la foto. Elígela de nuevo.');
      } finally {
        setPreparando(false);
      }
    });

  const dePdf = () =>
    ejecutar(async () => {
      const resultado = await elegirPdf();
      if (resultado.tipo === 'elegido') onCambio(resultado.comprobante);
      else setMensaje(mensajeDeResultadoPdf(resultado));
    });

  const esFoto = valor?.type === 'image/jpeg';
  const detalle = valor
    ? [
        valor.tamanoBytes !== undefined ? describirTamano(valor.tamanoBytes) : null,
        esFoto ? 'toca para ampliar' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <View style={estilos.grupo}>
      <View style={estilos.opciones}>
        <Opcion
          titulo="Cámara"
          icono="camara"
          deshabilitado={bloqueado}
          onPress={() => void deFoto('camara')}
        />
        <Opcion
          titulo="Galería"
          icono="anadir"
          deshabilitado={bloqueado}
          onPress={() => void deFoto('galeria')}
        />
        <Opcion
          titulo="PDF"
          icono="documento"
          deshabilitado={bloqueado}
          onPress={() => void dePdf()}
        />
      </View>
      {valor ? (
        <View style={estilos.elegido}>
          {esFoto ? (
            <ImagenAmpliable
              uri={valor.uri}
              descripcion="foto del comprobante"
              cachePolicy="memory"
            >
              <Image
                source={{ uri: valor.uri }}
                contentFit="cover"
                cachePolicy="memory"
                accessibilityLabel="Foto del comprobante"
                accessible
                style={estilos.miniatura}
              />
            </ImagenAmpliable>
          ) : (
            <View style={[estilos.miniatura, estilos.icono]}>
              <Icono nombre="documento" tamano={24} grosor={1.7} />
            </View>
          )}
          <View style={estilos.textos}>
            <Texto variante="filaTitulo" numberOfLines={1}>
              {valor.nombreVisible}
            </Texto>
            {detalle ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                {detalle}
              </Texto>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar comprobante"
            accessibilityState={{ disabled: bloqueado }}
            disabled={bloqueado}
            onPress={() => onCambio(null)}
            style={estilos.quitar}
          >
            <Texto variante="etiqueta" color={colores.peligroTexto}>
              Quitar
            </Texto>
          </Pressable>
        </View>
      ) : null}
      {preparando ? <Aviso tono="informacion" mensaje="Preparando el comprobante…" /> : null}
      {mensaje ? <Aviso mensaje={mensaje} tono="advertencia" /> : null}
      {verAjustes ? (
        <Boton
          titulo="Abrir ajustes"
          variante="secundario"
          ancho="completo"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
        />
      ) : null}
      {error ? <Aviso mensaje={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 10 },
  opciones: { flexDirection: 'row', gap: 10 },
  opcion: {
    flex: 1,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    borderRadius: radios.medio,
    borderWidth: 1,
    borderColor: tintaAlfa(0.12),
    backgroundColor: colores.superficie,
  },
  apagada: { opacity: 0.45 },
  presionada: { backgroundColor: tintaAlfa(0.04) },
  elegido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: 10,
    borderRadius: radios.medio,
    borderWidth: 1,
    borderColor: tintaAlfa(0.08),
    backgroundColor: colores.superficie,
  },
  miniatura: { width: 56, height: 56, borderRadius: 12 },
  icono: { backgroundColor: tintaAlfa(0.06), alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  quitar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado.sm },
});
