import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { EstadoOcupacionUnidad } from '../../api/panel';
import type { UnidadInmueble } from '../../api/inmuebles';
import { claveFotoUnidad } from '../../consultas/inmuebles';
import { claveCachePortada } from '../../inmuebles/claveImagen';
import { ESTADO_OCUPACION } from '../../inmuebles/cobro';
import {
  ETIQUETA_TIPO_UNIDAD,
  ETIQUETA_USO,
  textoCanon,
  unidadPorCompletar,
} from '../../inmuebles/etiquetas';
import { colores, radios, tintaAlfa } from '../../tema';
import { ChipEstado } from '../ChipEstado';
import { FilaLista } from '../FilaLista';
import { Texto } from '../Texto';

interface Props {
  unidad: UnidadInmueble;
  /** Estado de ocupación según el Panel; null si no hay Panel (no se muestra nada). */
  estado?: EstadoOcupacionUnidad | null;
  separador?: boolean;
  /** Toca para editar la unidad. */
  onPress?: () => void;
  /** La foto no cargó (la URL firmada expiró): volver a pedir el inmueble. */
  alFallarFoto?: () => void;
}

/**
 * Unidad de un inmueble: miniatura de su foto (o el icono), nombre, tipo y uso, "Por completar" si
 * faltan datos, canon base y, debajo, su estado de ocupación (del Panel) con su tono.
 */
export function FilaUnidad({
  unidad,
  estado = null,
  separador = false,
  onPress,
  alFallarFoto,
}: Props) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const avisado = useRef(false);
  const url = unidad.foto_principal_url;
  const conFoto = url !== null && url !== urlFallida;
  const cacheKey = url ? claveCachePortada(claveFotoUnidad(unidad.id), url) : null;

  function alFallar() {
    setUrlFallida(url);
    if (alFallarFoto && !avisado.current) {
      avisado.current = true;
      alFallarFoto();
    }
  }

  const definicion = estado ? ESTADO_OCUPACION[estado] : null;
  return (
    <FilaLista
      miniatura={
        conFoto ? (
          <View style={estilos.miniatura}>
            <Image
              source={cacheKey ? { uri: url, cacheKey } : { uri: url }}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`Foto de ${unidad.nombre}`}
              accessible
              onError={alFallar}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : undefined
      }
      icono="inmuebles"
      titulo={unidad.nombre}
      separador={separador}
      conChevron={onPress !== undefined}
      onPress={onPress}
      detalle={
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${ETIQUETA_TIPO_UNIDAD[unidad.tipo]} · ${ETIQUETA_USO[unidad.uso_permitido]}`}
          </Texto>
          {unidadPorCompletar(unidad) ? <ChipEstado tipo="datos" estado="POR_COMPLETAR" /> : null}
        </>
      }
      valor={textoCanon(unidad.canon_base_centavos)}
      valorSecundario={definicion?.etiqueta}
      tonoValorSecundario={definicion?.tono}
    />
  );
}

const estilos = StyleSheet.create({
  miniatura: {
    width: 44,
    height: 44,
    borderRadius: radios.medio,
    overflow: 'hidden',
    backgroundColor: tintaAlfa(0.06),
    flexShrink: 0,
  },
});
