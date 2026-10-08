import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ErrorApi } from '@/api/cliente';
import { mensajeDeError } from '@/api/errores';
import { Boton } from '@/componentes/Boton';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { FilaLista } from '@/componentes/FilaLista';
import { PantallaConectando } from '@/componentes/PantallaConectando';
import { SoloDesarrollo } from '@/componentes/SoloDesarrollo';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { colores, coloresEstado, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaLarga, hoyBogota } from '@/utilidades/fechas';

// El backend no tiene un endpoint de estado: se usa GET /auth/capacidades, que es público y liviano.
async function consultarServidor() {
  const inicio = Date.now();
  const datos = await api.get<unknown>('/auth/capacidades');
  return { datos, milisegundos: Date.now() - inicio };
}

function describirValor(valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no';
  return String(valor);
}

// Solo en desarrollo (A1): fuera de él la ruta lleva a la entrada.
export default function Diagnostico() {
  return (
    <SoloDesarrollo>
      <PantallaDiagnostico />
    </SoloDesarrollo>
  );
}

function PantallaDiagnostico() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const consulta = useQuery({
    queryKey: ['diagnostico'],
    queryFn: consultarServidor,
    retry: false,
    staleTime: 0,
  });

  const hoy = hoyBogota();

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera
          titulo="Diagnóstico"
          subtitulo={`Servidor: ${process.env.EXPO_PUBLIC_API_URL ?? '(sin configurar)'}`}
          onVolver={() => router.back()}
        />
      </CabeceraTinta>

      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xl }]}
        >
          {consulta.isFetching ? (
            <PantallaConectando />
          ) : consulta.isError ? (
            <Superficie style={estilos.tarjeta}>
              <Texto variante="cuerpoFuerte" color={coloresEstado.peligro.texto}>
                No pudimos conectar
              </Texto>
              <Texto variante="cuerpo">{mensajeDeError(consulta.error)}</Texto>
              {consulta.error instanceof ErrorApi ? (
                <Texto variante="secundario" color={colores.textoSecundario} cifras>
                  Detalle: {consulta.error.status}
                  {consulta.error.codigo ? ` · ${consulta.error.codigo}` : ''}
                </Texto>
              ) : null}
              <Boton titulo="Reintentar" ancho="completo" onPress={() => void consulta.refetch()} />
            </Superficie>
          ) : (
            <Superficie relleno="ninguno">
              <View style={estilos.encabezadoTarjeta}>
                <Texto variante="cuerpoFuerte" color={coloresEstado.exito.texto}>
                  Servidor conectado
                </Texto>
                <Texto variante="secundario" color={colores.textoSecundario} cifras>
                  Respondió en {consulta.data?.milisegundos} ms.
                </Texto>
              </View>
              {typeof consulta.data?.datos === 'object' && consulta.data.datos !== null
                ? Object.entries(consulta.data.datos).map(([clave, valor]) => (
                    <FilaLista key={clave} titulo={clave} valor={describirValor(valor)} separador />
                  ))
                : null}
              <View style={estilos.accionTarjeta}>
                <Boton
                  titulo="Volver a probar"
                  variante="secundario"
                  ancho="completo"
                  onPress={() => void consulta.refetch()}
                />
              </View>
            </Superficie>
          )}

          <Texto variante="tituloSeccion" style={estilos.tituloSeccion}>
            En este teléfono
          </Texto>
          <Superficie relleno="ninguno">
            <FilaLista
              titulo="Hoy en Bogotá"
              subtitulo={hoy}
              valor={formatearFechaLarga(hoy)}
              icono="calendario"
            />
            <FilaLista
              titulo="Dinero de ejemplo"
              subtitulo="125.000.000 centavos"
              valor={centavosAPesosTexto(125_000_000)}
              icono="pagos"
              separador
            />
          </Superficie>
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  contenido: { gap: espaciado.md, paddingHorizontal: espaciado.md, paddingTop: espaciado.lg },
  tarjeta: { gap: espaciado.sm },
  encabezadoTarjeta: { gap: 2, padding: espaciado.md },
  accionTarjeta: { padding: espaciado.md },
  tituloSeccion: { marginTop: espaciado.xs, paddingHorizontal: 4 },
});
