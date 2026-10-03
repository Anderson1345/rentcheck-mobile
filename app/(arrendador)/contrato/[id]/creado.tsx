import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
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

  // "Listo" lleva al detalle del contrato recién creado.
  const irAlDetalle = () => router.replace({ pathname: '/contrato/[id]', params: { id } });

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

  return (
    <PantallaPila>
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
        <CodigoAcceso acceso={acceso} nombreInquilino={contrato.inquilino.nombre}>
          <Boton
            titulo="Registrar inventario de entrega"
            variante="secundario"
            ancho="completo"
            onPress={() =>
              router.push({ pathname: '/contrato/[id]/inventario', params: { id: contrato.id } })
            }
          />
          <Boton titulo="Listo" variante="secundario" ancho="completo" onPress={irAlDetalle} />
        </CodigoAcceso>
      ) : (
        <View style={estilos.botones}>
          <Boton
            titulo="Registrar inventario de entrega"
            variante="secundario"
            ancho="completo"
            onPress={() =>
              router.push({ pathname: '/contrato/[id]/inventario', params: { id: contrato.id } })
            }
          />
          <Boton titulo="Listo" variante="secundario" ancho="completo" onPress={irAlDetalle} />
        </View>
      )}
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  botones: { gap: espaciado.xs, marginTop: espaciado.sm },
});
