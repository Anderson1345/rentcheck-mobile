import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colores, espaciado, tintaAlfa } from '../tema';
import { AvatarRelieve } from './avatar/AvatarRelieve';
import { Icono, type NombreIcono } from './iconos/Icono';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Contenido bajo el título en lugar del subtítulo (p. ej. un ChipEstado y el mes). Se pasa en línea: la fila lo envuelve y hace salto de línea si no cabe. */
  detalle?: ReactNode;
  /** Valor a la derecha: texto (monto ya formateado) o cualquier nodo (contador, chip). */
  valor?: ReactNode;
  /** Avatar de relieve de la persona (por nombre)… */
  avatar?: string;
  /** …o un icono en mosaico… */
  icono?: NombreIcono;
  /** …o una miniatura de 56 dp (la foto de un inmueble). */
  miniatura?: ReactNode;
  /** Chevron a la derecha cuando la fila abre un detalle. */
  conChevron?: boolean;
  /** Línea separadora arriba (a partir de la segunda fila de una lista). */
  separador?: boolean;
  onPress?: () => void;
}

/** Fila de lista: avatar o icono, título, subtítulo y valor a la derecha. Alto mínimo 72 dp. */
export function FilaLista({
  titulo,
  subtitulo,
  detalle,
  valor,
  avatar,
  icono,
  miniatura,
  conChevron = false,
  separador = false,
  onPress,
}: Props) {
  const contenido = (
    <>
      {miniatura ? (
        miniatura
      ) : avatar ? (
        <AvatarRelieve nombre={avatar} tamano={40} />
      ) : icono ? (
        <View style={estilos.mosaico}>
          <Icono nombre={icono} tamano={22} grosor={1.7} />
        </View>
      ) : null}
      <View style={estilos.textos}>
        <Texto variante="filaTitulo" numberOfLines={2}>
          {titulo}
        </Texto>
        {detalle ? (
          <View style={estilos.detalle}>{detalle}</View>
        ) : subtitulo ? (
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={2}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>
      {typeof valor === 'string' ? (
        <Texto variante="valor" cifras style={estilos.valor}>
          {valor}
        </Texto>
      ) : valor ? (
        <View style={estilos.valor}>{valor}</View>
      ) : null}
      {conChevron ? (
        <Icono nombre="adelante" tamano={20} color={colores.iconoTenue} grosor={1.8} />
      ) : null}
    </>
  );

  return (
    <View>
      {separador ? (
        <View
          style={[
            estilos.separador,
            { marginLeft: miniatura ? 86 : avatar || icono ? 74 : espaciado.md },
          ]}
        />
      ) : null}
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [estilos.fila, pressed && { backgroundColor: tintaAlfa(0.03) }]}
        >
          {contenido}
        </Pressable>
      ) : (
        <View style={estilos.fila}>{contenido}</View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  mosaico: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: tintaAlfa(0.06),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  detalle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 4,
  },
  // El valor no cede espacio; si es muy largo (una fecha), salta de línea antes que aplastar el texto.
  valor: { flexShrink: 0, maxWidth: '55%', textAlign: 'right' },
  separador: { height: 1, backgroundColor: tintaAlfa(0.07) },
});
