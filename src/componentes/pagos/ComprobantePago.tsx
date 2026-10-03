// Ver el comprobante de un pago, del arrendador y del inquilino. La URL firmada caduca en 1 hora y es
// sensible: ANTES de abrir o ampliar se vuelve a pedir el pago y se usa la URL nueva; solo vive en el
// estado de este componente (memoria), la imagen no se guarda en disco y ningún error la repite.

import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { descargarYCompartir } from '../../utilidades/documentos';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Texto } from '../Texto';
import { VisorImagen } from '../VisorImagen';

export type TipoComprobante = 'IMAGEN' | 'PDF' | null;

export interface ComprobanteFresco {
  comprobante_url: string | null;
  comprobante_tipo: TipoComprobante;
}

interface Props {
  pagoId: string;
  tipo: TipoComprobante;
  url: string | null;
  /** Vuelve a pedir el pago y entrega su comprobante con la URL FRESCA (null si el pago ya no existe). */
  obtenerFresco: () => Promise<ComprobanteFresco | null | undefined>;
  /**
   * Arrendador: una imagen se ve de entrada (con la URL del pago recién cargado) y el PDF se abre con
   * "Abrir comprobante". Inquilino (lista de pagos): todo empieza con el botón "Ver comprobante".
   */
  vistaPrevia?: boolean;
}

const MENSAJE_NO_SE_PUDO = 'No pudimos abrir el comprobante. Inténtalo de nuevo.';

export function ComprobantePago({ pagoId, tipo, url, obtenerFresco, vistaPrevia = false }: Props) {
  const [tipoActual, setTipoActual] = useState(tipo);
  const [urlImagen, setUrlImagen] = useState<string | null>(
    vistaPrevia && tipo === 'IMAGEN' ? url : null,
  );
  const [ampliada, setAmpliada] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  // Un toque a la vez: pedir el pago y descargar tardan.
  const enCurso = useRef(false);
  // Si la imagen no carga (URL vencida) se vuelve a pedir una sola vez.
  const reintentoDeImagen = useRef(false);

  const hayComprobante = (url !== null || urlImagen !== null) && !noDisponible;

  /** La URL nueva (o null si ya no hay). Nunca se muestra ni se registra. */
  async function frescos(): Promise<ComprobanteFresco | null> {
    const fresco = await obtenerFresco();
    if (!fresco || !fresco.comprobante_url) {
      setNoDisponible(true);
      setUrlImagen(null);
      return null;
    }
    setTipoActual(fresco.comprobante_tipo);
    return fresco;
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

  const verImagen = (abrirAmpliada: boolean) =>
    accion(async () => {
      const fresco = await frescos();
      if (!fresco?.comprobante_url) return;
      reintentoDeImagen.current = false;
      setUrlImagen(fresco.comprobante_url);
      if (abrirAmpliada) setAmpliada(true);
    });

  const abrirArchivo = () =>
    accion(async () => {
      const fresco = await frescos();
      if (!fresco?.comprobante_url) return;
      const esPdf = fresco.comprobante_tipo === 'PDF';
      await descargarYCompartir(
        fresco.comprobante_url,
        `comprobante-${pagoId}${esPdf ? '.pdf' : ''}`,
        esPdf
          ? { titulo: 'Compartir comprobante', mimeType: 'application/pdf' }
          : { titulo: 'Compartir comprobante', mimeType: '*/*', uti: 'public.data' },
      );
    });

  async function alFallarImagen() {
    if (reintentoDeImagen.current) return;
    reintentoDeImagen.current = true;
    try {
      const fresco = await obtenerFresco();
      if (fresco?.comprobante_url) setUrlImagen(fresco.comprobante_url);
    } catch {
      setError(MENSAJE_NO_SE_PUDO);
    }
  }

  if (!hayComprobante) {
    return (
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        Comprobante no disponible
      </Texto>
    );
  }

  const esImagen = tipoActual === 'IMAGEN';
  return (
    <View style={estilos.grupo}>
      {error ? <Aviso mensaje={error} /> : null}

      {esImagen && urlImagen ? (
        <>
          {/* Tocar la imagen la amplía igual que "Ampliar" (con la URL recién pedida). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ampliar comprobante"
            disabled={trabajando}
            onPress={() => void verImagen(true)}
          >
            <Image
              source={{ uri: urlImagen }}
              contentFit="cover"
              cachePolicy="memory"
              accessibilityLabel="Comprobante del pago"
              accessible
              onError={() => void alFallarImagen()}
              style={estilos.vistaPrevia}
            />
          </Pressable>
          <Boton
            titulo="Ampliar"
            variante="secundario"
            ancho="completo"
            deshabilitado={trabajando}
            onPress={() => void verImagen(true)}
          />
        </>
      ) : esImagen ? (
        <Boton
          titulo="Ver comprobante"
          tituloCargando="Abriendo…"
          cargando={trabajando}
          variante="secundario"
          ancho="completo"
          onPress={() => void verImagen(false)}
        />
      ) : (
        <Boton
          titulo={vistaPrevia ? 'Abrir comprobante' : 'Ver comprobante'}
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
        descripcion="Comprobante del pago"
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
});
