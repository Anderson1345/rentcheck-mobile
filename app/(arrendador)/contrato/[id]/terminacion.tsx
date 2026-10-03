import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { solicitarTerminacion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { Texto } from '@/componentes/Texto';
import { ADVERTENCIA_TERMINACION, textoResumenSolicitud } from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { hoyBogota } from '@/utilidades/fechas';

const MAXIMO_MOTIVO = 1000;

export default function TerminacionAnticipada() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato(id, 'solicitarTerminacion');
  const hoy = useMemo(() => hoyBogota(), []);
  // El motivo es dato del contrato: solo vive aquí, nunca se registra.
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id}>
      {() => {
        if (accion.fase === 'exito') {
          return (
            <View style={estilos.grupo}>
              <Aviso tono="exito" mensaje="Solicitud enviada. La otra parte debe confirmarla." />
              <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
            </View>
          );
        }

        function solicitar() {
          const texto = motivo.trim();
          if (texto === '') {
            setErrorMotivo('Escribe el motivo de la terminación.');
            return;
          }
          setErrorMotivo(null);
          confirmarAccion(
            'Solicitar terminación anticipada',
            textoResumenSolicitud(fecha, texto),
            'Solicitar',
            () => void accion.iniciar(() => solicitarTerminacion(id, texto, fecha)),
          );
        }

        return (
          <View style={estilos.grupo}>
            <Texto variante="titulo" accessibilityRole="header">
              Solicitar terminación anticipada
            </Texto>
            <Aviso tono="advertencia" mensaje={ADVERTENCIA_TERMINACION} />
            <CampoTexto
              etiqueta="Motivo"
              valor={motivo}
              onCambio={setMotivo}
              error={errorMotivo ?? undefined}
              keyboardType="default"
              autoCapitalize="sentences"
              maxLength={MAXIMO_MOTIVO}
              returnKeyType="done"
            />
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`${motivo.length} / ${MAXIMO_MOTIVO}`}
            </Texto>
            <SelectorFecha etiqueta="Fecha efectiva" valor={fecha} hoy={hoy} onCambio={setFecha} />
            <MensajeAccion
              fase={accion.fase}
              error={accion.error}
              onVerificar={() => void accion.verificar()}
              recargable={accion.recargable}
              onRecargar={() => void accion.recargar()}
            />
            {accion.fase === 'incierto' ? null : (
              <Boton
                titulo="Solicitar terminación"
                tituloCargando="Enviando solicitud…"
                cargando={ocupado}
                ancho="completo"
                onPress={solicitar}
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
