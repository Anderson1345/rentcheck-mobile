import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { mensajeDeError } from '@/api/errores';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { colores, espaciado, radios, tipografia } from '@/tema';
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

export default function Diagnostico() {
  const consulta = useQuery({
    queryKey: ['diagnostico'],
    queryFn: consultarServidor,
    retry: false,
    staleTime: 0,
  });

  const hoy = hoyBogota();

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.servidor}>
          Servidor: {process.env.EXPO_PUBLIC_API_URL ?? '(sin configurar)'}
        </Text>

        {consulta.isFetching ? (
          <View style={estilos.tarjeta}>
            <ActivityIndicator color={colores.primario} />
            <Text style={estilos.estado}>Conectando con el servidor…</Text>
            <Text style={estilos.nota}>La primera vez puede tardar hasta un minuto.</Text>
          </View>
        ) : consulta.isError ? (
          <View style={estilos.tarjeta}>
            <Text style={[estilos.estado, { color: colores.peligro }]}>No pudimos conectar</Text>
            <Text style={estilos.texto}>{mensajeDeError(consulta.error)}</Text>
            {consulta.error instanceof ErrorApi ? (
              <Text style={estilos.nota}>
                Detalle: {consulta.error.status}
                {consulta.error.codigo ? ` · ${consulta.error.codigo}` : ''}
              </Text>
            ) : null}
            <Boton titulo="Reintentar" onPress={() => void consulta.refetch()} />
          </View>
        ) : (
          <View style={estilos.tarjeta}>
            <Text style={[estilos.estado, { color: colores.exito }]}>Servidor conectado</Text>
            <Text style={estilos.nota}>Respondió en {consulta.data?.milisegundos} ms.</Text>
            {typeof consulta.data?.datos === 'object' && consulta.data.datos !== null
              ? Object.entries(consulta.data.datos).map(([clave, valor]) => (
                  <Text key={clave} style={estilos.texto}>
                    {clave}: {describirValor(valor)}
                  </Text>
                ))
              : null}
            <Boton
              titulo="Volver a probar"
              variante="secundario"
              onPress={() => void consulta.refetch()}
            />
          </View>
        )}

        <View style={estilos.tarjeta}>
          <Text style={estilos.estado}>En este teléfono</Text>
          <Text style={estilos.texto}>
            Hoy en Bogotá: {formatearFechaLarga(hoy)} ({hoy})
          </Text>
          <Text style={estilos.texto}>Dinero de ejemplo: {centavosAPesosTexto(125_000_000)}</Text>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: espaciado.md },
  servidor: { fontSize: tipografia.pequeno, color: colores.textoSecundario },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  estado: { fontSize: tipografia.subtitulo, fontWeight: '600', color: colores.texto },
  texto: { fontSize: tipografia.normal, color: colores.texto },
  nota: { fontSize: tipografia.pequeno, color: colores.textoSecundario },
});
