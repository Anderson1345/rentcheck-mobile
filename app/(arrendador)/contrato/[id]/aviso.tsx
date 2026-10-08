import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { darAvisoNoRenovacion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  AccionNoDisponible,
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
  NoEncontradoContrato,
  ResumenCambio,
} from '@/componentes/contratos/AccionesContrato';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { accionesDisponibles } from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { formatearFechaLarga } from '@/utilidades/fechas';

const MAXIMO_MOTIVO = 1000;

// Aviso de no renovación (rediseño R4-E): arriba el resumen (la fecha de fin y lo que pasa al llegar),
// el texto de la prórroga automática, el motivo opcional con su contador y "Dar aviso" en la barra fija.
// Solo cuando el servidor lo permite (puede_dar), como en el detalle.
export default function AvisoNoRenovacion() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato(id, 'darAviso');
  // El motivo es dato del contrato: solo vive aquí, nunca se registra.
  const [motivo, setMotivo] = useState('');
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => {
        if (accion.fase === 'exito') {
          return (
            <PantallaPila
              accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
            >
              <Aviso tono="exito" mensaje="Aviso de no renovación dado." />
            </PantallaPila>
          );
        }

        // Antes de actuar, la pantalla solo se ofrece cuando el detalle la ofrecería.
        if (accion.fase === 'inactivo' && !accionesDisponibles(contrato).darAviso) {
          return <AccionNoDisponible />;
        }

        return (
          <PantallaPila
            accionFija={
              accion.fase === 'incierto' ? undefined : (
                <Boton
                  titulo="Dar aviso"
                  tituloCargando="Enviando aviso…"
                  cargando={ocupado}
                  ancho="completo"
                  onPress={() =>
                    confirmarAccion(
                      'Dar aviso de no renovación',
                      'Al llegar la fecha de fin, el contrato vencerá y no se prorrogará.',
                      'Dar aviso',
                      () => void accion.iniciar(() => darAvisoNoRenovacion(id, motivo)),
                    )
                  }
                />
              )
            }
          >
            <ResumenCambio
              filas={[
                { etiqueta: 'Fecha de fin', valor: formatearFechaLarga(contrato.fecha_fin) },
                {
                  etiqueta: 'Al llegar esa fecha',
                  valor: 'el contrato vence y no se prorroga',
                },
              ]}
            />
            <Texto variante="cuerpo">
              Sin aviso, el contrato se prorroga automáticamente por el mismo término.
            </Texto>
            <View style={estilos.grupo}>
              <CampoTexto
                etiqueta="Motivo (opcional)"
                valor={motivo}
                onCambio={setMotivo}
                keyboardType="default"
                autoCapitalize="sentences"
                maxLength={MAXIMO_MOTIVO}
                returnKeyType="done"
              />
              <Texto variante="secundario" color={colores.textoSecundario}>
                {`${motivo.length} / ${MAXIMO_MOTIVO}`}
              </Texto>
            </View>
            <MensajeAccion
              fase={accion.fase}
              error={accion.error}
              onVerificar={() => void accion.verificar()}
              recargable={accion.recargable}
              onRecargar={() => void accion.recargar()}
            />
          </PantallaPila>
        );
      }}
    </CargaContrato>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
