import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoInquilinoDetalle, solicitarTerminacionInquilino } from '@/api/inquilino';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { AvisosContrato } from '@/componentes/contratos/LecturaContrato';
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { BotonesTerminacion } from '@/componentes/inquilino/AccionesInquilino';
import { ContratoNoEncontrado } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { FUENTE_INQUILINO, useDetalleInquilino } from '@/consultas/inquilino';
import {
  accionesInquilino,
  ADVERTENCIA_TERMINACION,
  textoResumenSolicitud,
} from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { hoyBogota } from '@/utilidades/fechas';

const MAXIMO_MOTIVO = 1000;

// Terminación anticipada por mutuo acuerdo. Según el estado del contrato: solicitar (formulario),
// o ver la solicitud y confirmarla / cancelarla, o solo información (confirmada: sin acta ni
// liquidación, B-53). R4-B: "Solicitar terminación" en la barra fija; la advertencia obligatoria y los
// textos de confirmación no cambian.
export default function TerminacionInquilino() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  return (
    <CargaContrato
      id={id}
      usar={useDetalleInquilino}
      noEncontrado={() => <ContratoNoEncontrado textoBoton="Volver" onPress={volver} />}
      sinMarco
    >
      {(contrato) => <Contenido contrato={contrato} />}
    </CargaContrato>
  );
}

function Contenido({ contrato }: { contrato: ContratoInquilinoDetalle }) {
  // Si se abrió para solicitar, se queda en el formulario hasta salir (tras enviar, el contrato
  // pasa a SOLICITADA y el mensaje de éxito no debe desaparecer).
  const [solicitando] = useState(() => accionesInquilino(contrato).solicitarTerminacion);
  if (solicitando) return <FormularioSolicitud id={contrato.contratoId} />;

  const t = contrato.terminacion_anticipada;
  return (
    <PantallaPila>
      <View style={estilos.grupo}>
        <AvisosContrato aviso={undefined} terminacion={t} />
        {t.estado === 'NINGUNA' ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            {contrato.estado === 'ACTIVO'
              ? 'Por ahora no hay una solicitud de terminación.'
              : 'La terminación anticipada solo se puede solicitar con el contrato activo.'}
          </Texto>
        ) : null}
        <BotonesTerminacion contrato={contrato} />
      </View>
    </PantallaPila>
  );
}

function FormularioSolicitud({ id }: { id: string }) {
  const router = useRouter();
  const accion = useAccionContrato(id, 'solicitarTerminacion', FUENTE_INQUILINO);
  const hoy = useMemo(() => hoyBogota(), []);
  // El motivo es dato del contrato: solo vive aquí, nunca se registra.
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  if (accion.fase === 'exito') {
    return (
      <PantallaPila>
        <View style={estilos.grupo}>
          <Aviso tono="exito" mensaje="Solicitud enviada. La otra parte debe confirmarla." />
          <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
        </View>
      </PantallaPila>
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
      () => void accion.iniciar(() => solicitarTerminacionInquilino(id, texto, fecha)),
    );
  }

  const accionFija = (
    <View style={estilos.grupo}>
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

  return (
    <PantallaPila accionFija={accionFija}>
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
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
