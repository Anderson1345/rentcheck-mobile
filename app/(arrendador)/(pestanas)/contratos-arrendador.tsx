import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { ChipEstado } from '@/componentes/ChipEstado';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaLista } from '@/componentes/FilaLista';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContratos } from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { FILTROS, type FiltroContratos, filtrarContratos } from '@/contratos/lectura';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta } from '@/utilidades/fechas';

export default function ContratosArrendador() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const consulta = useContratos();
  const { data, isPending, isError, error, refetch } = consulta;
  const [filtro, setFiltro] = useState<FiltroContratos>('TODOS');
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
  const contratos = data ?? [];
  const visibles = filtrarContratos(contratos, filtro);

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo="Contratos" />
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
              <Boton titulo="Nuevo contrato" icono="anadir" ancho="completo" onPress={nuevo} />
              <ControlSegmentado
                opciones={FILTROS.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta }))}
                valor={filtro}
                onCambio={setFiltro}
              />
              {visibles.length === 0 ? (
                <Superficie>
                  <Texto variante="cuerpo" color={colores.textoSecundario}>
                    Ningún contrato en este filtro
                  </Texto>
                </Superficie>
              ) : (
                <Superficie relleno="ninguno" style={estilos.lista}>
                  {visibles.map((c, indice) => (
                    <FilaLista
                      key={c.id}
                      icono="contratos"
                      titulo={c.unidad.nombre}
                      separador={indice > 0}
                      valor={centavosAPesosTexto(c.canon_centavos)}
                      conChevron
                      onPress={() =>
                        router.push({ pathname: '/contrato/[id]', params: { id: c.id } })
                      }
                      detalle={
                        <View style={estilos.detalle}>
                          <Texto variante="secundario" color={colores.textoSecundario}>
                            {c.inquilino.nombre}
                          </Texto>
                          <Texto variante="secundario" color={colores.textoSecundario}>
                            {`${formatearFechaCorta(c.fecha_inicio)} – ${formatearFechaCorta(c.fecha_fin)}`}
                          </Texto>
                          <View style={estilos.chips}>
                            <ChipEstado tipo="contrato" estado={c.estado} />
                            <ChipEstado
                              tipo="vinculo"
                              estado={c.vinculado ? 'VINCULADO' : 'SIN_VINCULAR'}
                            />
                          </View>
                        </View>
                      }
                    />
                  ))}
                </Superficie>
              )}
            </>
          )}
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl },
  contenido: { gap: espaciado.md, flexGrow: 1 },
  grupo: { gap: espaciado.sm },
  lista: { paddingVertical: espaciado.xxs },
  detalle: { gap: 4, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
});
