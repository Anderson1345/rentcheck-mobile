import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { Icono } from '@/componentes/iconos/Icono';
import { TarjetaInmueble } from '@/componentes/inmuebles/TarjetaInmueble';
import { Texto } from '@/componentes/Texto';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useInmuebles } from '@/consultas/inmuebles';
import { usePanelArrendador } from '@/consultas/panel';
import { resumenDeInmueble } from '@/inmuebles/cobro';
import { blancoAlfa, colores, espaciado, fuentes, radios, tintaAlfa } from '@/tema';

/** Radio inferior de la cabecera (maqueta Inmuebles). */
const RADIO_CABECERA = 32;

export default function Inmuebles() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const consulta = useInmuebles();
  // El Panel solo añade el estado de cobro, la ocupación y los ingresos: si carga tarde o falla, la lista
  // se ve igual sin esos datos.
  const panel = usePanelArrendador();
  const { data, isPending, isError, error, refetch } = consulta;
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(consulta);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await Promise.all([refetch(), panel.refetch()]);
    } finally {
      setRefrescando(false);
    }
  }

  const agregar = () => router.push('/inmueble/nuevo');
  const inmuebles = data ?? [];
  const hayInmuebles = inmuebles.length > 0;
  const unidades = inmuebles.reduce((suma, i) => suma + i.unidades.length, 0);
  const porcentaje = panel.data?.ocupacion.porcentaje ?? null;
  // Varias imágenes pueden fallar a la vez: sin cancelar, todas comparten un solo refresco.
  const refrescarImagenes = () => void refetch({ cancelRefetch: false });

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta style={estilos.cabecera}>
        <View style={estilos.filaTitulo}>
          <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
            Inmuebles
          </Texto>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar inmueble"
            onPress={agregar}
            style={({ pressed }) => [estilos.botonMas, pressed && estilos.presionado]}
          >
            <Icono nombre="anadir" tamano={22} color={colores.tinta} grosor={2} />
          </Pressable>
        </View>
        <View style={estilos.datos}>
          <DatoCabecera valor={data ? String(inmuebles.length) : '—'} etiqueta="inmuebles" />
          <DatoCabecera valor={data ? String(unidades) : '—'} etiqueta="unidades" />
          <DatoCabecera
            valor={porcentaje === null ? '—' : `${porcentaje}%`}
            etiqueta="ocupación"
            destacado
          />
        </View>
      </CabeceraTinta>

      <ScrollView
        style={estilos.cuerpo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
        contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
      >
        {data === undefined && isPending ? (
          <EsqueletoCarga filas={4} />
        ) : data === undefined && isError ? (
          <View style={estilos.estado}>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </View>
        ) : hayInmuebles ? (
          <>
            {inmuebles.map((inmueble) => (
              <TarjetaInmueble
                key={inmueble.id}
                inmueble={inmueble}
                resumen={resumenDeInmueble(panel.data, inmueble.id)}
                alFallarImagen={refrescarImagenes}
                onPress={() =>
                  router.push({ pathname: '/inmueble/[id]', params: { id: inmueble.id } })
                }
              />
            ))}
            <Pressable
              testID="agregar-inmueble"
              accessibilityRole="button"
              accessibilityLabel="Agregar inmueble: casa, edificio, local o parqueadero"
              onPress={agregar}
              style={({ pressed }) => [estilos.agregar, pressed && estilos.presionado]}
            >
              <View style={estilos.iconoAgregar}>
                <Icono nombre="anadir" tamano={22} color={colores.tinta} grosor={2} />
              </View>
              <View style={estilos.textosAgregar}>
                <Texto variante="cuerpoFuerte">Agregar inmueble</Texto>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Casa, edificio, local o parqueadero
                </Texto>
              </View>
            </Pressable>
          </>
        ) : (
          <EstadoMensaje
            titulo="Aún no tienes inmuebles"
            mensaje="Agrega el primero para empezar a crear contratos. Su unidad principal se crea sola."
          >
            <Boton titulo="Agregar inmueble" variante="acento" ancho="completo" onPress={agregar} />
          </EstadoMensaje>
        )}
      </ScrollView>
    </View>
  );
}

function DatoCabecera({
  valor,
  etiqueta,
  destacado = false,
}: {
  valor: string;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <View testID="dato-cabecera" style={estilos.dato}>
      <Texto
        variante="titulo"
        cifras
        color={destacado ? colores.lima : colores.sobreTinta}
        style={estilos.valorDato}
      >
        {valor}
      </Texto>
      <Texto variante="secundario" color={blancoAlfa(0.65)}>
        {etiqueta}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: {
    borderBottomLeftRadius: RADIO_CABECERA,
    borderBottomRightRadius: RADIO_CABECERA,
    paddingBottom: espaciado.lg,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botonMas: {
    width: 48,
    height: 48,
    borderRadius: radios.medio,
    backgroundColor: colores.lima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.85 },
  datos: { flexDirection: 'row', gap: espaciado.xs, marginTop: espaciado.md },
  dato: {
    flex: 1,
    backgroundColor: blancoAlfa(0.07),
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  valorDato: { fontFamily: fuentes.extranegrita },
  cuerpo: { flex: 1 },
  contenido: {
    gap: espaciado.md,
    flexGrow: 1,
    paddingHorizontal: espaciado.md,
    paddingTop: espaciado.lg,
  },
  estado: { gap: espaciado.sm },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tintaAlfa(0.25),
    borderRadius: 22,
    padding: espaciado.md,
  },
  iconoAgregar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(197,240,106,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosAgregar: { flex: 1, gap: 2 },
});
