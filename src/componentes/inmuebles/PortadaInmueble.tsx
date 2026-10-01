import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { claveCachePortada } from '../../inmuebles/claveImagen';
import { colores, radios, tintaAlfa } from '../../tema';
import { Icono, type NombreIcono } from '../iconos/Icono';
import { MotivoCurvas } from '../motivo/MotivoCurvas';

export type VariantePortada = 'miniatura' | 'grande';

interface Props {
  /** URL firmada de la portada (expira en 1 hora), una imagen local de vista previa o null. */
  url: string | null;
  variante: VariantePortada;
  /** Inmueble de la foto: con él la imagen usa una clave de caché estable (ver claveImagen). */
  inmuebleId?: string;
  /** Documentos sensibles (cédula): 'memory' no guarda la imagen en disco. Por defecto memory-disk. */
  cachePolicy?: 'memory' | 'memory-disk';
  /** Icono del marcador sin foto. */
  icono?: NombreIcono;
  /** Lo que lee el lector de pantalla; sin él la imagen se trata como decorativa. */
  descripcion?: string;
  /**
   * Se llama una vez por pantalla cuando la imagen no carga (lo habitual: la URL firmada expiró)
   * para que la pantalla vuelva a pedir el inmueble y reciba una URL nueva.
   */
  alFallarUrl?: () => void;
}

/** Refrescos automáticos permitidos por portada: uno solo, para no entrar en bucle sin red. */
const REFRESCOS_AUTOMATICOS = 1;

/**
 * Portada del inmueble. Sin foto, o si la imagen no carga, se ve el marcador con el motivo de
 * curvas (nunca un cuadro roto). Cuando llega una URL distinta, se vuelve a intentar con la imagen.
 */
export function PortadaInmueble({
  url,
  variante,
  inmuebleId,
  cachePolicy = 'memory-disk',
  icono = 'inmuebles',
  descripcion,
  alFallarUrl,
}: Props) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const refrescos = useRef(0);
  const grande = variante === 'grande';
  const mostrarImagen = url !== null && url !== urlFallida;
  const cacheKey = inmuebleId ? claveCachePortada(inmuebleId, url) : null;

  function alFallarImagen() {
    setUrlFallida(url);
    if (alFallarUrl && refrescos.current < REFRESCOS_AUTOMATICOS) {
      refrescos.current += 1;
      alFallarUrl();
    }
  }

  return (
    <View
      style={[
        estilos.base,
        grande ? estilos.grande : estilos.miniatura,
        mostrarImagen ? estilos.cargando : estilos.marco,
      ]}
    >
      {mostrarImagen ? (
        <Image
          source={cacheKey ? { uri: url, cacheKey } : { uri: url }}
          contentFit="cover"
          cachePolicy={cachePolicy}
          transition={150}
          accessibilityLabel={descripcion}
          accessible={descripcion !== undefined}
          onError={alFallarImagen}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View testID="portada-marcador" style={estilos.marcador}>
          <MotivoCurvas opacidad={grande ? 0.16 : 0.22} />
          <Icono nombre={icono} tamano={grande ? 40 : 24} color={colores.lima} grosor={1.7} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { overflow: 'hidden' },
  // Fondo neutro mientras la imagen carga; la tinta queda para el marcador sin foto.
  cargando: { backgroundColor: tintaAlfa(0.06) },
  marco: { backgroundColor: colores.tinta },
  miniatura: { width: 56, height: 56, borderRadius: radios.medio, flexShrink: 0 },
  grande: { width: '100%', height: 200, borderRadius: radios.grande },
  marcador: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
