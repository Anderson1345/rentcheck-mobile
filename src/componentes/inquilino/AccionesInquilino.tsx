// Acciones del inquilino sobre su contrato (E6-B). Los botones salen de los booleanos del servidor
// (puede_confirmar, puede_cancelar, puede_dar) y solo con el contrato ACTIVO: la app no calcula
// plazos ni permisos. La verificación tras "sin respuesta" es la de useAccionContrato (con el detalle
// y las claves del portal); aquí no se repite.

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  cancelarAvisoInquilino,
  cancelarTerminacionInquilino,
  confirmarTerminacionInquilino,
  type ContratoInquilinoDetalle,
} from '../../api/inquilino';
import { FUENTE_INQUILINO } from '../../consultas/inquilino';
import { accionesInquilino, textoConfirmarTerminacion } from '../../contratos/acciones';
import { useAccionContrato } from '../../contratos/useAccionContrato';
import { espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { confirmarAccion, MensajeAccion } from '../contratos/AccionesContrato';
import { Texto } from '../Texto';

const ocupado = (fase: string) => fase === 'enviando' || fase === 'verificando';

/**
 * "Confirmar terminación" (confirmación fuerte: es irreversible) y "Cancelar mi solicitud". Nunca se
 * ofrece confirmar la propia solicitud: lo decide puede_confirmar del servidor. Siempre montado: los
 * mensajes de éxito sobreviven aunque el contrato ya no esté ACTIVO y los botones desaparezcan.
 */
export function BotonesTerminacion({ contrato }: { contrato: ContratoInquilinoDetalle }) {
  const id = contrato.contratoId;
  const a = accionesInquilino(contrato);
  const confirmar = useAccionContrato(id, 'confirmarTerminacion', FUENTE_INQUILINO);
  const cancelar = useAccionContrato(id, 'cancelarTerminacion', FUENTE_INQUILINO);

  return (
    <>
      {a.confirmarTerminacion ? (
        <>
          <Boton
            titulo="Confirmar terminación"
            tituloCargando="Confirmando…"
            cargando={ocupado(confirmar.fase)}
            variante="destructivo"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Confirmar terminación anticipada',
                textoConfirmarTerminacion(contrato.terminacion_anticipada.fecha_efectiva),
                'Confirmar terminación',
                () => void confirmar.iniciar(() => confirmarTerminacionInquilino(id)),
                true,
              )
            }
          />
          <MensajeAccion
            fase={confirmar.fase}
            error={confirmar.error}
            onVerificar={() => void confirmar.verificar()}
            recargable={confirmar.recargable}
            onRecargar={() => void confirmar.recargar()}
          />
        </>
      ) : null}

      {a.cancelarTerminacion ? (
        <>
          <Boton
            titulo="Cancelar mi solicitud"
            tituloCargando="Cancelando…"
            cargando={ocupado(cancelar.fase)}
            variante="secundario"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Cancelar mi solicitud',
                'La solicitud de terminación se cancelará y el contrato seguirá su curso.',
                'Cancelar solicitud',
                () => void cancelar.iniciar(() => cancelarTerminacionInquilino(id)),
              )
            }
          />
          <MensajeAccion
            fase={cancelar.fase}
            error={cancelar.error}
            onVerificar={() => void cancelar.verificar()}
            recargable={cancelar.recargable}
            onRecargar={() => void cancelar.recargar()}
          />
        </>
      ) : null}

      {confirmar.fase === 'exito' ? <Aviso tono="exito" mensaje="Terminación confirmada." /> : null}
      {cancelar.fase === 'exito' ? <Aviso tono="exito" mensaje="Solicitud cancelada." /> : null}
    </>
  );
}

/** Sección "Acciones" de Mi contrato. Con el contrato no ACTIVO no se ofrece nada. */
export function AccionesInquilino({ contrato }: { contrato: ContratoInquilinoDetalle }) {
  const router = useRouter();
  const id = contrato.contratoId;
  const a = accionesInquilino(contrato);
  const cancelarAviso = useAccionContrato(id, 'cancelarAviso', FUENTE_INQUILINO);
  const hay = Object.values(a).some(Boolean);

  return (
    <View style={estilos.grupo}>
      {hay ? (
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Acciones
        </Texto>
      ) : null}

      {a.solicitarTerminacion ? (
        <Boton
          titulo="Solicitar terminación"
          variante="secundario"
          ancho="completo"
          onPress={() => router.push({ pathname: '/mi-contrato/[id]/terminacion', params: { id } })}
        />
      ) : null}

      <BotonesTerminacion contrato={contrato} />

      {a.darAviso ? (
        <Boton
          titulo="Dar aviso de no renovación"
          variante="secundario"
          ancho="completo"
          onPress={() => router.push({ pathname: '/mi-contrato/[id]/aviso', params: { id } })}
        />
      ) : null}

      {a.cancelarAviso ? (
        <>
          <Boton
            titulo="Cancelar aviso"
            tituloCargando="Cancelando aviso…"
            cargando={ocupado(cancelarAviso.fase)}
            variante="secundario"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Cancelar aviso',
                'El contrato seguirá su curso: sin aviso, se prorroga automáticamente por el mismo término.',
                'Cancelar aviso',
                () => void cancelarAviso.iniciar(() => cancelarAvisoInquilino(id)),
              )
            }
          />
          <MensajeAccion
            fase={cancelarAviso.fase}
            error={cancelarAviso.error}
            onVerificar={() => void cancelarAviso.verificar()}
            recargable={cancelarAviso.recargable}
            onRecargar={() => void cancelarAviso.recargar()}
          />
        </>
      ) : null}
      {cancelarAviso.fase === 'exito' ? <Aviso tono="exito" mensaje="Aviso cancelado." /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
