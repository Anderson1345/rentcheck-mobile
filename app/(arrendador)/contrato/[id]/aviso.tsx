import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { darAvisoNoRenovacion } from '@/api/contratos';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { Aviso } from '@/componentes/Aviso';
import { Texto } from '@/componentes/Texto';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';

const MAXIMO_MOTIVO = 1000;

export default function AvisoNoRenovacion() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato(id, 'darAviso');
  // El motivo es dato del contrato: solo vive aquí, nunca se registra.
  const [motivo, setMotivo] = useState('');
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id}>
      {() => {
        if (accion.fase === 'exito') {
          return (
            <View style={estilos.grupo}>
              <Texto variante="titulo" accessibilityRole="header">
                Aviso de no renovación
              </Texto>
              <Aviso tono="exito" mensaje="Aviso de no renovación dado." />
              <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
            </View>
          );
        }
        return (
          <View style={estilos.grupo}>
            <Texto variante="titulo" accessibilityRole="header">
              Dar aviso de no renovación
            </Texto>
            <Texto variante="cuerpo">
              Sin aviso, el contrato se prorroga automáticamente por el mismo término.
            </Texto>
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
            <MensajeAccion
              fase={accion.fase}
              error={accion.error}
              onVerificar={() => void accion.verificar()}
            />
            {accion.fase === 'incierto' ? null : (
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
            )}
          </View>
        );
      }}
    </CargaContrato>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
