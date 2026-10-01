import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Share, StyleSheet, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato } from '@/consultas/contratos';
import { colores, espaciado } from '@/tema';
import { formatearFechaLarga } from '@/utilidades/fechas';

export default function ContratoCreado() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: contrato, isPending, error, refetch } = useContrato(id);

  const irAInmuebles = () => router.replace('/inmuebles');

  // El asistente ya no existe en la pila; Atrás (físico) lleva a Inmuebles, no a un paso viejo.
  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/inmuebles');
      return true;
    });
    return () => suscripcion.remove();
  }, [router]);

  if (contrato === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={3} />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }

  const acceso = contrato.codigo_acceso;
  const programado = contrato.estado === 'PROGRAMADO';

  function compartir() {
    if (!acceso || !contrato) return;
    const mensaje = `Hola ${contrato.inquilino.nombre}, te invito a RentCheck para tu contrato de arriendo. Descarga la app y actívalo con el código ${acceso.codigo}. Vence el ${formatearFechaLarga(acceso.expira_en)}.`;
    void Share.share({ message: mensaje });
  }

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        Contrato creado
      </Texto>
      <Superficie style={estilos.tarjeta}>
        {contrato.estado === 'ACTIVO' || programado ? (
          <ChipEstado tipo="contrato" estado={contrato.estado} />
        ) : null}
        <Texto variante="cuerpoFuerte">{contrato.unidad.nombre}</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {contrato.inquilino.nombre}
        </Texto>
        {programado ? (
          <Texto variante="cuerpo">{`Empieza el ${formatearFechaLarga(contrato.fecha_inicio)}`}</Texto>
        ) : null}
      </Superficie>

      {acceso ? (
        <Superficie style={estilos.tarjeta}>
          <Texto variante="etiqueta" color={colores.textoSecundario}>
            Código de acceso del inquilino
          </Texto>
          <Texto variante="cifraMedia" cifras selectable={false}>
            {acceso.codigo}
          </Texto>
          <Texto variante="cuerpo">{`Vence el ${formatearFechaLarga(acceso.expira_en)}`}</Texto>
        </Superficie>
      ) : null}

      <View style={estilos.botones}>
        {acceso ? (
          <Boton titulo="Compartir código" icono="compartir" ancho="completo" onPress={compartir} />
        ) : null}
        <Boton titulo="Listo" variante="secundario" ancho="completo" onPress={irAInmuebles} />
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  botones: { gap: espaciado.xs, marginTop: espaciado.sm },
});
