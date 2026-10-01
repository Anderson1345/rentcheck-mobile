import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colores, espaciado, tintaAlfa } from '../tema';
import { AvatarRelieve } from './avatar/AvatarRelieve';
import { Icono, type NombreIcono } from './iconos/Icono';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Contenido bajo el título en lugar del subtítulo (p. ej. un ChipEstado y el mes). */
  detalle?: ReactNode;
  /** Valor a la derecha: texto (monto ya formateado) o cualquier nodo (contador, chip). */
  valor?: ReactNode;
  /** Avatar de relieve de la persona (por nombre)… */
  avatar?: string;
  /** …o un icono en mosaico. */
  icono?: NombreIcono;
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
  conChevron = false,
  separador = false,
  onPress,
}: Props) {
  const contenido = (
    <>
      {avatar ? (
        <AvatarRelieve nombre={avatar} tamano={40} />
      ) : icono ? (
        <View style={estilos.mosaico}>
          <Icono nombre={icono} tamano={22} grosor={1.7} />
        </View>
      ) : null}
      <View style={estilos.textos}>
        <Texto variante="filaTitulo" numberOfLines={1}>
          {titulo}
        </Texto>
        {detalle ??
          (subtitulo ? (
            <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
              {subtitulo}
            </Texto>
          ) : null)}
      </View>
      {typeof valor === 'string' ? (
        <Texto variante="valor" cifras>
          {valor}
        </Texto>
      ) : (
        valor
      )}
      {conChevron ? (
        <Icono nombre="adelante" tamano={20} color={colores.iconoTenue} grosor={1.8} />
      ) : null}
    </>
  );

  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
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
  separador: { height: 1, backgroundColor: tintaAlfa(0.07), marginLeft: 74 },
});
