import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { BotonIcono } from '@/componentes/BotonIcono';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaInmueble } from '@/componentes/inmuebles/FilaInmueble';
import { Superficie } from '@/componentes/Superficie';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useInmuebles } from '@/consultas/inmuebles';
import { colores, espaciado } from '@/tema';

export default function Inmuebles() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const consulta = useInmuebles();
  const { data, isPending, isError, error, refetch } = consulta;
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

  const agregar = () => router.push('/inmueble/nuevo');
  const inmuebles = data ?? [];
  const hayInmuebles = inmuebles.length > 0;

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <View style={estilos.encabezado}>
          <View style={estilos.titulo}>
            <TituloCabecera
              titulo="Inmuebles"
              subtitulo={
                data !== undefined
                  ? `${inmuebles.length} ${inmuebles.length === 1 ? 'inmueble' : 'inmuebles'}`
                  : undefined
              }
            />
          </View>
          {hayInmuebles ? (
            <BotonIcono icono="anadir" etiqueta="Agregar inmueble" sobreTinta onPress={agregar} />
          ) : null}
        </View>
      </CabeceraTinta>

      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
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
            <Superficie relleno="ninguno" style={estilos.lista}>
              {inmuebles.map((inmueble, indice) => (
                <FilaInmueble
                  key={inmueble.id}
                  inmueble={inmueble}
                  separador={indice > 0}
                  // Varias portadas pueden fallar a la vez: sin cancelar, todas comparten un solo refresco.
                  alFallarPortada={() => void refetch({ cancelRefetch: false })}
                  onPress={() =>
                    router.push({ pathname: '/inmueble/[id]', params: { id: inmueble.id } })
                  }
                />
              ))}
            </Superficie>
          ) : (
            <EstadoMensaje
              titulo="Aún no tienes inmuebles"
              mensaje="Agrega el primero para empezar a crear contratos. Su unidad principal se crea sola."
            >
              <Boton
                titulo="Agregar inmueble"
                variante="acento"
                ancho="completo"
                onPress={agregar}
              />
            </EstadoMensaje>
          )}
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  titulo: { flex: 1 },
  cuerpo: { flex: 1, paddingTop: espaciado.xl },
  contenido: { gap: espaciado.md, flexGrow: 1 },
  estado: { gap: espaciado.sm },
  lista: { paddingVertical: espaciado.xxs },
});
