// Acciones del inquilino sobre su contrato (E6-B; en Mi contrato, filas de "Gestionar contrato" desde
// R4-B). Lo que se ofrece sale de los booleanos del servidor (puede_confirmar, puede_cancelar,
// puede_dar) y solo con el contrato ACTIVO: la app no calcula plazos ni permisos. La verificación tras "sin respuesta" es la de useAccionContrato (con el detalle
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
import { espaciado, type TonoEstado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { confirmarAccion, MensajeAccion } from '../contratos/AccionesContrato';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { FilaLista } from '../FilaLista';
import type { NombreIcono } from '../iconos/Icono';
import { Superficie } from '../Superficie';

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

interface FilaGestion {
  clave: string;
  titulo: string;
  explicacion: string;
  icono: NombreIcono;
  tono: TonoEstado;
  /** Lleva a otra pantalla (chevron); las que se confirman aquí no lo llevan. */
  navega?: boolean;
  onPress: () => void;
}

/**
 * "Gestionar contrato" de Mi contrato (R4-B, como el del arrendador en R2-B): cada acción es una fila con
 * icono, tono y una línea que explica qué hace. Qué fila aparece lo decide accionesInquilino (los booleanos
 * del servidor, solo con el contrato ACTIVO). Solicitar y dar aviso llevan a su pantalla; confirmar y
 * cancelar se confirman aquí con los mismos textos de siempre. Siempre montado: los mensajes de éxito
 * sobreviven aunque las filas desaparezcan.
 */
export function AccionesInquilino({ contrato }: { contrato: ContratoInquilinoDetalle }) {
  const router = useRouter();
  const id = contrato.contratoId;
  const a = accionesInquilino(contrato);
  const confirmar = useAccionContrato(id, 'confirmarTerminacion', FUENTE_INQUILINO);
  const cancelar = useAccionContrato(id, 'cancelarTerminacion', FUENTE_INQUILINO);
  const cancelarAviso = useAccionContrato(id, 'cancelarAviso', FUENTE_INQUILINO);

  const filas: FilaGestion[] = [];
  if (a.solicitarTerminacion) {
    filas.push({
      clave: 'solicitarTerminacion',
      titulo: 'Solicitar terminación',
      explicacion: 'Pide terminar antes de la fecha de fin, de mutuo acuerdo.',
      icono: 'rechazar',
      tono: 'peligro',
      navega: true,
      onPress: () => router.push({ pathname: '/mi-contrato/[id]/terminacion', params: { id } }),
    });
  }
  if (a.confirmarTerminacion) {
    filas.push({
      clave: 'confirmarTerminacion',
      titulo: 'Confirmar terminación',
      explicacion: 'Tu arrendador la pidió. Es irreversible.',
      icono: 'aprobar',
      tono: 'peligro',
      onPress: () => {
        if (ocupado(confirmar.fase)) return;
        confirmarAccion(
          'Confirmar terminación anticipada',
          textoConfirmarTerminacion(contrato.terminacion_anticipada.fecha_efectiva),
          'Confirmar terminación',
          () => void confirmar.iniciar(() => confirmarTerminacionInquilino(id)),
          true,
        );
      },
    });
  }
  if (a.cancelarTerminacion) {
    filas.push({
      clave: 'cancelarTerminacion',
      titulo: 'Cancelar mi solicitud',
      explicacion: 'Retira tu solicitud de terminación; el contrato sigue.',
      icono: 'rechazar',
      tono: 'advertencia',
      onPress: () => {
        if (ocupado(cancelar.fase)) return;
        confirmarAccion(
          'Cancelar mi solicitud',
          'La solicitud de terminación se cancelará y el contrato seguirá su curso.',
          'Cancelar solicitud',
          () => void cancelar.iniciar(() => cancelarTerminacionInquilino(id)),
        );
      },
    });
  }
  if (a.darAviso) {
    filas.push({
      clave: 'darAviso',
      titulo: 'Dar aviso de no renovación',
      explicacion: 'Avisa que el contrato no se renovará al terminar.',
      icono: 'alerta',
      tono: 'advertencia',
      navega: true,
      onPress: () => router.push({ pathname: '/mi-contrato/[id]/aviso', params: { id } }),
    });
  }
  if (a.cancelarAviso) {
    filas.push({
      clave: 'cancelarAviso',
      titulo: 'Cancelar aviso',
      explicacion: 'Sin aviso, el contrato se prorroga solo al terminar.',
      icono: 'rechazar',
      tono: 'advertencia',
      onPress: () => {
        if (ocupado(cancelarAviso.fase)) return;
        confirmarAccion(
          'Cancelar aviso',
          'El contrato seguirá su curso: sin aviso, se prorroga automáticamente por el mismo término.',
          'Cancelar aviso',
          () => void cancelarAviso.iniciar(() => cancelarAvisoInquilino(id)),
        );
      },
    });
  }

  // Lo que pasó con las acciones que se confirman aquí (verificando, error, éxito).
  const mensajes = (
    [
      [confirmar, 'Terminación confirmada.'],
      [cancelar, 'Solicitud cancelada.'],
      [cancelarAviso, 'Aviso cancelado.'],
    ] as const
  ).map(([accion, exito], indice) => (
    <View key={indice} style={estilos.grupo}>
      <MensajeAccion
        fase={accion.fase}
        error={accion.error}
        onVerificar={() => void accion.verificar()}
        recargable={accion.recargable}
        onRecargar={() => void accion.recargar()}
      />
      {accion.fase === 'exito' ? <Aviso tono="exito" mensaje={exito} /> : null}
    </View>
  ));

  return (
    <View style={estilos.grupo}>
      {filas.length > 0 ? (
        <>
          <EncabezadoSeccion titulo="Gestionar contrato" />
          <Superficie relleno="ninguno" style={estilos.lista}>
            {filas.map((fila, indice) => (
              <FilaLista
                key={fila.clave}
                icono={fila.icono}
                tonoIcono={fila.tono}
                titulo={fila.titulo}
                subtitulo={fila.explicacion}
                separador={indice > 0}
                conChevron={fila.navega === true}
                onPress={fila.onPress}
              />
            ))}
          </Superficie>
        </>
      ) : null}
      {mensajes}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  lista: { paddingVertical: espaciado.xxs },
});
