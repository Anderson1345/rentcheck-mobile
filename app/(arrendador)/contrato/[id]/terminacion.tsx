import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { solicitarTerminacion } from '@/api/contratos';
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
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import {
  ADVERTENCIA_TERMINACION,
  puedeSolicitarTerminacion,
  textoResumenSolicitud,
} from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { formatearFechaLarga, hoyBogota } from '@/utilidades/fechas';

const MAXIMO_MOTIVO = 1000;

// Terminación anticipada (rediseño R4-E): arriba el resumen (fecha de fin actual → fecha efectiva elegida;
// la otra parte debe confirmarla), la advertencia obligatoria completa, el motivo y la fecha con su
// etiqueta y "Solicitar terminación" en la barra fija. Solo con el contrato ACTIVO y sin solicitud, como en
// el detalle (puedeSolicitarTerminacion).
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
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => {
        if (accion.fase === 'exito') {
          return (
            <PantallaPila
              accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
            >
              <Aviso tono="exito" mensaje="Solicitud enviada. La otra parte debe confirmarla." />
            </PantallaPila>
          );
        }

        // Antes de actuar, la pantalla solo se ofrece cuando el detalle la ofrecería.
        if (accion.fase === 'inactivo' && !puedeSolicitarTerminacion(contrato)) {
          return <AccionNoDisponible />;
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
          <PantallaPila
            accionFija={
              accion.fase === 'incierto' ? undefined : (
                <Boton
                  titulo="Solicitar terminación"
                  tituloCargando="Enviando solicitud…"
                  cargando={ocupado}
                  ancho="completo"
                  onPress={solicitar}
                />
              )
            }
          >
            <ResumenCambio
              filas={[
                { etiqueta: 'Fecha de fin actual', valor: formatearFechaLarga(contrato.fecha_fin) },
                { etiqueta: 'Fecha efectiva', valor: formatearFechaLarga(fecha) },
                { etiqueta: 'Después', valor: 'la otra parte debe confirmarla' },
              ]}
            />
            <Aviso tono="advertencia" mensaje={ADVERTENCIA_TERMINACION} />
            <View style={estilos.grupo}>
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
            </View>
            <SelectorFecha etiqueta="Fecha efectiva" valor={fecha} hoy={hoy} onCambio={setFecha} />
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
