import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Inmueble, UnidadInmueble } from '../../api/inmuebles';
import { claveFotoUnidad } from '../../consultas/inmuebles';
import { claveCachePortada } from '../../inmuebles/claveImagen';
import { miniaturasVisibles, type ResumenInmueble } from '../../inmuebles/cobro';
import { textoUnidades } from '../../inmuebles/etiquetas';
import {
  blancoAlfa,
  colores,
  coloresEstado,
  espaciado,
  fuentes,
  radios,
  sombras,
  tintaAlfa,
} from '../../tema';
import { centavosAPesosAbreviado } from '../../utilidades/dinero';
import { Icono } from '../iconos/Icono';
import { Texto } from '../Texto';
import { PortadaInmueble } from './PortadaInmueble';

interface Props {
  inmueble: Inmueble;
  /** Estado de cobro, ocupadas e ingresos del año (del Panel); null mientras no hay Panel. */
  resumen: ResumenInmueble | null;
  onPress: () => void;
  /** Una imagen (portada o foto de unidad) no cargó: la URL firmada expiró, hay que volver a pedir la lista. */
  alFallarImagen?: () => void;
}

/** "Ciudad · Estrato N" (sin estrato, solo la ciudad). */
const textoUbicacion = (i: Inmueble) =>
  i.estrato !== null ? `${i.ciudad} · Estrato ${i.estrato}` : i.ciudad;
const textoOcupadas = (n: number) => (n === 1 ? '1 ocupada' : `${n} ocupadas`);

/**
 * Tarjeta de la lista de inmuebles (maqueta Inmuebles): portada de 150 dp con el chip de cobro encima,
 * dirección, ciudad y estrato, las miniaturas de sus unidades, "N unidades · M ocupadas" y los ingresos
 * del año. Sin Panel se ve igual, sin chip, ocupadas ni ingresos (nunca bloquea la lista).
 */
export function TarjetaInmueble({ inmueble, resumen, onPress, alFallarImagen }: Props) {
  return (
    <Pressable
      testID="tarjeta-inmueble"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <View>
        <PortadaInmueble
          inmuebleId={inmueble.id}
          url={inmueble.foto_portada_url}
          variante="tarjeta"
          textoSinFoto="Sin foto"
          alFallarUrl={alFallarImagen}
        />
        {resumen ? (
          <View
            testID="chip-cobro"
            style={[estilos.chip, { backgroundColor: coloresEstado[resumen.chip.tono].senal }]}
          >
            <Texto variante="etiqueta" color={colores.tinta} style={estilos.textoChip}>
              {resumen.chip.texto}
            </Texto>
          </View>
        ) : null}
      </View>

      <View style={estilos.cuerpo}>
        <View style={estilos.filaTitulo}>
          <View style={estilos.textos}>
            <Texto variante="tituloSeccion" numberOfLines={2}>
              {inmueble.direccion}
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {textoUbicacion(inmueble)}
            </Texto>
          </View>
          <Icono nombre="adelante" tamano={20} color={colores.textoSecundario} />
        </View>

        <View style={estilos.filaDatos}>
          <MiniaturasUnidades unidades={inmueble.unidades} alFallar={alFallarImagen} />
          <Texto variante="secundario" color={colores.textoFuerte} style={estilos.conteo}>
            {resumen
              ? `${textoUnidades(inmueble.unidades.length)} · ${textoOcupadas(resumen.ocupadas)}`
              : textoUnidades(inmueble.unidades.length)}
          </Texto>
          {resumen && resumen.ingresosAnioCentavos !== null ? (
            <View style={estilos.ingresos}>
              <Texto variante="secundario" color={colores.textoSecundario}>
                {`Ingresos ${resumen.anio}`}
              </Texto>
              <Texto variante="cuerpoFuerte" cifras>
                {centavosAPesosAbreviado(resumen.ingresosAnioCentavos)}
              </Texto>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Colores de los mosaicos sin foto (se reparten por posición). */
const FONDOS_SIN_FOTO = [colores.tintaCapa, coloresEstado.programado.senal, '#2A5A62'];

/**
 * Miniaturas superpuestas de las unidades: la foto (URL firmada) o, sin foto o si no carga, un mosaico de
 * color con la inicial. Hasta 3 y "+N".
 */
export function MiniaturasUnidades({
  unidades,
  alFallar,
}: {
  unidades: readonly UnidadInmueble[];
  alFallar?: () => void;
}) {
  const [fallidas, setFallidas] = useState<ReadonlySet<string>>(new Set());
  const avisado = useRef(false);
  const { visibles, resto } = miniaturasVisibles(unidades);
  if (visibles.length === 0) return null;

  function alFallarFoto(url: string) {
    setFallidas((previas) => new Set(previas).add(url));
    // Una sola vez: pedir la lista otra vez trae URLs nuevas para todas.
    if (alFallar && !avisado.current) {
      avisado.current = true;
      alFallar();
    }
  }

  return (
    <View style={estilos.miniaturas} accessibilityElementsHidden importantForAccessibility="no">
      {visibles.map((unidad, indice) => {
        const url = unidad.foto_principal_url;
        const conFoto = url !== null && !fallidas.has(url);
        const cacheKey = url ? claveCachePortada(claveFotoUnidad(unidad.id), url) : null;
        return (
          <View key={unidad.id} style={[estilos.miniatura, indice > 0 && estilos.encimada]}>
            {conFoto ? (
              <Image
                source={cacheKey ? { uri: url, cacheKey } : { uri: url }}
                contentFit="cover"
                cachePolicy="memory-disk"
                onError={() => alFallarFoto(url)}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                testID="miniatura-sin-foto"
                style={[
                  estilos.sinFoto,
                  { backgroundColor: FONDOS_SIN_FOTO[indice % FONDOS_SIN_FOTO.length] },
                ]}
              >
                <Texto variante="etiqueta" color={colores.sobreTinta}>
                  {unidad.nombre.trim().charAt(0).toUpperCase() || '·'}
                </Texto>
              </View>
            )}
          </View>
        );
      })}
      {resto > 0 ? (
        <View style={[estilos.miniatura, estilos.encimada, estilos.resto]}>
          <Texto variante="etiqueta" color={colores.textoFuerte}>
            {`+${resto}`}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const LADO_MINIATURA = 34;

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.grande,
    overflow: 'hidden',
    boxShadow: sombras.tarjeta,
  },
  presionada: { opacity: 0.92 },
  chip: {
    position: 'absolute',
    right: espaciado.sm,
    bottom: espaciado.sm,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radios.pildora,
    justifyContent: 'center',
  },
  textoChip: { fontFamily: fuentes.extranegrita },
  cuerpo: { paddingHorizontal: espaciado.md, paddingTop: 14, paddingBottom: espaciado.md, gap: 12 },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textos: { flex: 1, gap: 2 },
  filaDatos: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  conteo: { flexShrink: 1 },
  ingresos: { marginLeft: 'auto', alignItems: 'flex-end' },
  miniaturas: { flexDirection: 'row' },
  miniatura: {
    width: LADO_MINIATURA,
    height: LADO_MINIATURA,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colores.superficie,
    overflow: 'hidden',
    backgroundColor: tintaAlfa(0.06),
  },
  encimada: { marginLeft: -8 },
  sinFoto: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  resto: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: blancoAlfa(1),
    boxShadow: `inset 0 0 0 1px ${tintaAlfa(0.12)}`,
  },
});
