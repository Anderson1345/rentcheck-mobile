import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoInquilinoDetalle, darAvisoInquilino } from '@/api/inquilino';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { AvisosContrato } from '@/componentes/contratos/LecturaContrato';
import { ContratoNoEncontrado } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { FUENTE_INQUILINO, useDetalleInquilino } from '@/consultas/inquilino';
import { accionesInquilino } from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';

const MAXIMO_MOTIVO = 1000;

// Aviso de no renovación (D-1). La app no calcula plazos: si se pasó, responde el servidor. R4-B:
// "Dar aviso" (y lo que pasó con el envío) en la barra fija; el campo lleva su etiqueta fuera.
export default function AvisoInquilino() {
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
  // Si se abrió para dar el aviso, se queda en el formulario hasta salir (tras enviar, puede_dar
  // pasa a false y el mensaje de éxito no debe desaparecer).
  const [dando] = useState(() => accionesInquilino(contrato).darAviso);
  if (dando) return <FormularioAviso id={contrato.contratoId} />;
  return (
    <PantallaPila>
      <View style={estilos.grupo}>
        <AvisosContrato aviso={contrato.aviso_no_renovacion} terminacion={undefined} />
        {contrato.aviso_no_renovacion.estado !== 'DADO' ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Por ahora no puedes dar el aviso de no renovación de este contrato.
          </Texto>
        ) : null}
      </View>
    </PantallaPila>
  );
}

function FormularioAviso({ id }: { id: string }) {
  const router = useRouter();
  const accion = useAccionContrato(id, 'darAviso', FUENTE_INQUILINO);
  // El motivo es dato del contrato: solo vive aquí, nunca se registra.
  const [motivo, setMotivo] = useState('');
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  if (accion.fase === 'exito') {
    return (
      <PantallaPila>
        <View style={estilos.grupo}>
          <Aviso tono="exito" mensaje="Aviso de no renovación dado." />
          <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
        </View>
      </PantallaPila>
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
          titulo="Dar aviso"
          tituloCargando="Enviando aviso…"
          cargando={ocupado}
          ancho="completo"
          onPress={() =>
            confirmarAccion(
              'Dar aviso de no renovación',
              'Al llegar la fecha de fin, el contrato vencerá y no se prorrogará.',
              'Dar aviso',
              () => void accion.iniciar(() => darAvisoInquilino(id, motivo)),
            )
          }
        />
      )}
    </View>
  );

  return (
    <PantallaPila accionFija={accionFija}>
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
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
