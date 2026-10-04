import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ContratoResumen } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { Icono } from '@/componentes/iconos/Icono';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContratos } from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import {
  buscarContratos,
  conteosFiltros,
  esActivo,
  esCerrado,
  estadoDeFila,
  FILTROS,
  type FiltroContratos,
  filtrarContratos,
  inicialesDe,
  subtituloDeFila,
} from '@/contratos/lectura';
import { colores, coloresEstado, espaciado, fuentes, tintaAlfa } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';

export default function ContratosArrendador() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const consulta = useContratos();
  const { data, isPending, isError, error, refetch } = consulta;
  // R3-A: "Ver cartera" del Panel llega con ?filtro=EN_MORA. Un filtro que llega por la ruta manda
  // sobre el elegido antes; luego se puede cambiar como siempre.
  const { filtro: filtroRuta } = useLocalSearchParams<{ filtro?: string }>();
  const deRuta = FILTROS.find((f) => f.valor === filtroRuta)?.valor;
  const [eleccion, setEleccion] = useState<{ filtro: FiltroContratos; ruta?: string }>(() => ({
    filtro: deRuta ?? 'TODOS',
    ruta: filtroRuta,
  }));
  const filtro: FiltroContratos = deRuta && eleccion.ruta !== filtroRuta ? deRuta : eleccion.filtro;
  const setFiltro = (nuevo: FiltroContratos) => setEleccion({ filtro: nuevo, ruta: filtroRuta });
  const [busqueda, setBusqueda] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(consulta);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }

  const nuevo = () => router.push('/contrato/nuevo');
  const abrir = (c: ContratoResumen) =>
    router.push({ pathname: '/contrato/[id]', params: { id: c.id } });
  const contratos = data ?? [];
  const encontrados = buscarContratos(contratos, busqueda);
  const conteos = conteosFiltros(encontrados);
  const visibles = filtrarContratos(encontrados, filtro);
  // Con "Todos", los cerrados van aparte y con menos énfasis.
  const abiertos = filtro === 'TODOS' ? visibles.filter((c) => !esCerrado(c)) : visibles;
  const cerrados = filtro === 'TODOS' ? visibles.filter(esCerrado) : [];
  const activos = contratos.filter(esActivo).length;

  return (
    <View style={[estilos.pantalla, { paddingTop: top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
        contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
      >
        <View style={estilos.cabecera}>
          <View style={estilos.titulo}>
            <Texto variante="titulo" accessibilityRole="header">
              Contratos
            </Texto>
            {data ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                {`${contratos.length} ${contratos.length === 1 ? 'contrato' : 'contratos'} · ${activos} ${activos === 1 ? 'activo' : 'activos'}`}
              </Texto>
            ) : null}
          </View>
          {contratos.length > 0 ? (
            <Boton titulo="Nuevo" icono="anadir" ancho="contenido" onPress={nuevo} />
          ) : null}
        </View>

        {data === undefined && isPending ? (
          <EsqueletoCarga filas={4} />
        ) : data === undefined && isError ? (
          <View style={estilos.grupo}>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </View>
        ) : contratos.length === 0 ? (
          <EstadoMensaje
            titulo="Aún no tienes contratos"
            mensaje="Crea el primero para arrendar una de tus unidades."
          >
            <Boton titulo="Nuevo contrato" variante="acento" ancho="completo" onPress={nuevo} />
          </EstadoMensaje>
        ) : (
          <>
            <View style={estilos.buscador}>
              <Icono nombre="buscar" tamano={20} color={colores.textoSecundario} />
              <TextInput
                accessibilityLabel="Buscar contrato"
                placeholder="Buscar por unidad o inquilino"
                placeholderTextColor={colores.textoSecundario}
                value={busqueda}
                onChangeText={setBusqueda}
                autoCorrect={false}
                returnKeyType="search"
                style={estilos.entradaBusqueda}
              />
            </View>
            <ControlSegmentado
              opciones={FILTROS.map((f) => ({
                valor: f.valor,
                etiqueta: f.etiqueta,
                contador: conteos[f.valor],
              }))}
              valor={filtro}
              onCambio={setFiltro}
            />

            {visibles.length === 0 ? (
              <Superficie>
                <Texto variante="cuerpo" color={colores.textoSecundario}>
                  {busqueda.trim()
                    ? `Ningún contrato coincide con «${busqueda.trim()}».`
                    : 'Ningún contrato en este filtro'}
                </Texto>
              </Superficie>
            ) : null}
            {abiertos.length > 0 ? <ListaContratos contratos={abiertos} onAbrir={abrir} /> : null}
            {cerrados.length > 0 ? (
              <View testID="seccion-cerrados" style={estilos.grupo}>
                <Texto
                  variante="etiqueta"
                  color={colores.textoSecundario}
                  accessibilityRole="header"
                  style={estilos.tituloCerrados}
                >
                  Cerrados
                </Texto>
                <ListaContratos contratos={cerrados} onAbrir={abrir} apagada />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Una tarjeta con las filas separadas por una línea (no una tarjeta por fila). */
function ListaContratos({
  contratos,
  onAbrir,
  apagada = false,
}: {
  contratos: ContratoResumen[];
  onAbrir: (c: ContratoResumen) => void;
  apagada?: boolean;
}) {
  return (
    <Superficie relleno="ninguno" style={[estilos.lista, apagada && estilos.apagada]}>
      {contratos.map((c, indice) => (
        <View key={c.id}>
          {indice > 0 ? <View style={estilos.separador} /> : null}
          <FilaContrato contrato={c} onPress={() => onAbrir(c)} />
        </View>
      ))}
    </Superficie>
  );
}

function FilaContrato({
  contrato: c,
  onPress,
}: {
  contrato: ContratoResumen;
  onPress: () => void;
}) {
  const estado = estadoDeFila(c);
  const color = coloresEstado[estado.tono];
  const destacado = estado.tono !== 'neutro';
  return (
    <Pressable
      testID="fila-contrato"
      accessibilityRole="button"
      accessibilityLabel={c.inquilino.nombre}
      accessibilityHint={`${subtituloDeFila(c)}. ${estado.texto}.`}
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
    >
      <View style={[estilos.avatar, !destacado && estilos.avatarApagado]}>
        <Texto
          variante="etiqueta"
          color={destacado ? colores.lima : colores.textoFuerte}
          style={estilos.iniciales}
        >
          {inicialesDe(c.inquilino.nombre)}
        </Texto>
        <View testID="punto-estado" style={[estilos.punto, { backgroundColor: color.senal }]} />
      </View>
      <View style={estilos.textos}>
        <Texto variante="filaTitulo" numberOfLines={1}>
          {c.inquilino.nombre}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
          {subtituloDeFila(c)}
        </Texto>
      </View>
      <View style={estilos.derecha}>
        <Texto variante="cuerpoFuerte" cifras>
          {centavosAPesosTexto(c.canon_centavos)}
        </Texto>
        <Texto variante="secundario" color={color.texto} style={estilos.textoEstado}>
          {estado.texto}
        </Texto>
      </View>
    </Pressable>
  );
}

const LADO_AVATAR = 42;

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { gap: 14, flexGrow: 1, paddingHorizontal: espaciado.md, paddingTop: espaciado.lg },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  titulo: { flex: 1 },
  grupo: { gap: espaciado.xs },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: tintaAlfa(0.1),
  },
  entradaBusqueda: {
    flex: 1,
    minHeight: 44,
    fontFamily: fuentes.media,
    fontSize: 15,
    color: colores.texto,
  },
  lista: { paddingVertical: 2 },
  apagada: { opacity: 0.85 },
  tituloCerrados: { marginTop: espaciado.xs, paddingHorizontal: espaciado.xxs },
  separador: { height: 1, backgroundColor: tintaAlfa(0.07), marginLeft: 68 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  presionada: { backgroundColor: tintaAlfa(0.04) },
  avatar: {
    width: LADO_AVATAR,
    height: LADO_AVATAR,
    borderRadius: 13,
    backgroundColor: colores.tintaCapa,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarApagado: { backgroundColor: '#DEDBD4' },
  iniciales: { fontFamily: fuentes.extranegrita },
  punto: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.superficie,
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  derecha: { alignItems: 'flex-end', flexShrink: 0 },
  textoEstado: { fontFamily: fuentes.negrita },
});
