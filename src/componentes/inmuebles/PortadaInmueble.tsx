import { useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colores, radios } from '../../tema';
import { Icono } from '../iconos/Icono';
import { MotivoCurvas } from '../motivo/MotivoCurvas';

export type VariantePortada = 'miniatura' | 'grande';

interface Props {
  /** URL firmada de la portada (expira en 1 hora), una imagen local de vista previa o null. */
  url: string | null;
  variante: VariantePortada;
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
export function PortadaInmueble({ url, variante, descripcion, alFallarUrl }: Props) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const refrescos = useRef(0);
  const grande = variante === 'grande';
  const mostrarImagen = url !== null && url !== urlFallida;

  function alFallarImagen() {
    setUrlFallida(url);
    if (alFallarUrl && refrescos.current < REFRESCOS_AUTOMATICOS) {
      refrescos.current += 1;
      alFallarUrl();
    }
  }

  return (
    <View style={[estilos.base, grande ? estilos.grande : estilos.miniatura]}>
      {mostrarImagen ? (
        <Image
          source={{ uri: url }}
          resizeMode="cover"
          accessibilityLabel={descripcion}
          accessible={descripcion !== undefined}
          onError={alFallarImagen}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View testID="portada-marcador" style={estilos.marcador}>
          <MotivoCurvas opacidad={grande ? 0.16 : 0.22} />
          <Icono nombre="inmuebles" tamano={grande ? 40 : 24} color={colores.lima} grosor={1.7} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: colores.tinta },
  miniatura: { width: 56, height: 56, borderRadius: radios.medio, flexShrink: 0 },
  grande: { width: '100%', height: 200, borderRadius: radios.grande },
  marcador: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
