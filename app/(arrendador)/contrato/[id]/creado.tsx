import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
import { ChipEstado } from '@/componentes/ChipEstado';
import { Icono } from '@/componentes/iconos/Icono';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato } from '@/consultas/contratos';
import { colores, coloresEstado, conAlfa, espaciado } from '@/tema';
import { formatearFechaLarga } from '@/utilidades/fechas';

// Contrato creado (rediseño R4-D): protagonista de éxito con el estado, la unidad y el inquilino; el
// código de acceso grande con "Copiar", "Compartir" y su QR (CodigoAcceso, el mismo de siempre: el código
// no va a logs ni a mensajes de error); y en la barra fija "Hacer inventario" (principal) y "Ver contrato".
export default function ContratoCreado() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: contrato, isPending, error, refetch } = useContrato(id);

  // "Ver contrato" lleva al detalle del contrato recién creado.
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
  const acciones = (
    <View style={estilos.botones}>
      <Boton
        titulo="Hacer inventario"
        icono="camara"
        variante="acento"
        ancho="completo"
        onPress={() =>
          router.push({ pathname: '/contrato/[id]/inventario', params: { id: contrato.id } })
        }
      />
      <Boton titulo="Ver contrato" variante="secundario" ancho="completo" onPress={irAlDetalle} />
    </View>
  );

  return (
    <PantallaPila accionFija={acciones}>
      <Superficie style={estilos.protagonista}>
        <View style={estilos.exito}>
          <Icono nombre="aprobar" tamano={26} color={coloresEstado.exito.texto} grosor={2} />
        </View>
        <Texto variante="titulo" accessibilityRole="header">
          Tu contrato está listo
        </Texto>
        {contrato.estado === 'ACTIVO' || programado ? (
          <View style={estilos.fila}>
            <ChipEstado tipo="contrato" estado={contrato.estado} />
          </View>
        ) : null}
        <Texto variante="cuerpoFuerte">{contrato.unidad.nombre}</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {contrato.inquilino.nombre}
        </Texto>
        {programado ? (
          <Texto variante="cuerpo">{`Empieza el ${formatearFechaLarga(contrato.fecha_inicio)}`}</Texto>
        ) : null}
      </Superficie>

      {acceso ? <CodigoAcceso acceso={acceso} nombreInquilino={contrato.inquilino.nombre} /> : null}
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  protagonista: { gap: espaciado.xs, alignItems: 'flex-start' },
  exito: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: conAlfa(coloresEstado.exito.senal, 0.14),
  },
  fila: { flexDirection: 'row' },
  botones: { gap: espaciado.xs },
});
