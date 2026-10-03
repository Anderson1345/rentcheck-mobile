import { useRouter } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  cancelarAvisoNoRenovacion,
  cancelarProgramado as cancelarProgramadoApi,
  cancelarTerminacion,
  confirmarTerminacion,
  type ContratoDetalle,
} from '../../api/contratos';
import {
  accionesDisponibles,
  puedeCorregir,
  puedeSolicitarTerminacion,
  textoConfirmarTerminacion,
} from '../../contratos/acciones';
import { type FaseAccion, useAccionContrato } from '../../contratos/useAccionContrato';
import type { TonoEstado } from '../../tema';
import { espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { FilaLista } from '../FilaLista';
import type { NombreIcono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { confirmarAccion, MensajeAccion } from './AccionesContrato';

interface Fila {
  clave: string;
  titulo: string;
  explicacion: string;
  icono: NombreIcono;
  tono?: TonoEstado;
  onPress: () => void;
  /** Lleva a otra pantalla (chevron); las que se confirman aquí no lo llevan. */
  navega?: boolean;
}

const ocupado = (fase: FaseAccion) => fase === 'enviando' || fase === 'verificando';

/**
 * "Gestionar contrato" del detalle (R2-B): las acciones poco frecuentes como filas con icono, tono y una
 * línea que explica qué hacen, en lugar de botones apilados. Qué fila aparece lo decide la lógica que ya
 * existía (accionesDisponibles, puedeSolicitarTerminacion, puedeCorregir y los booleanos puede_* del
 * servidor); las que tienen formulario llevan a su pantalla y las demás se confirman aquí, como antes.
 */
export function GestionarContrato({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  const a = accionesDisponibles(contrato);
  const t = contrato.terminacion_anticipada;
  const solicitada = t?.estado === 'SOLICITADA';
  const cancelarAviso = useAccionContrato(contrato.id, 'cancelarAviso');
  const cancelarProgramado = useAccionContrato(contrato.id, 'cancelarProgramado');
  const confirmarTerm = useAccionContrato(contrato.id, 'confirmarTerminacion');
  const cancelarTerm = useAccionContrato(contrato.id, 'cancelarTerminacion');

  // Cancelado el programado, se vuelve a la lista con el estado ya actualizado.
  useEffect(() => {
    if (cancelarProgramado.fase === 'exito') router.replace('/contratos-arrendador');
  }, [cancelarProgramado.fase, router]);

  const ir = (
    pathname:
      | '/contrato/[id]/incremento'
      | '/contrato/[id]/prorroga'
      | '/contrato/[id]/aviso'
      | '/contrato/[id]/terminacion'
      | '/contrato/[id]/corregir'
      | '/contrato/[id]/corregir-inquilino',
  ) => router.push({ pathname, params: { id: contrato.id } });

  const filas: Fila[] = [];
  if (a.incremento) {
    filas.push({
      clave: 'incremento',
      titulo: 'Aplicar incremento',
      explicacion: 'Sube el canon con el IPC del año anterior.',
      icono: 'pagos',
      tono: 'informacion',
      navega: true,
      onPress: () => ir('/contrato/[id]/incremento'),
    });
  }
  if (a.prorroga) {
    filas.push({
      clave: 'prorroga',
      titulo: 'Prorrogar contrato',
      explicacion: 'Extiende la fecha de fin por un nuevo período.',
      icono: 'calendario',
      tono: 'programado',
      navega: true,
      onPress: () => ir('/contrato/[id]/prorroga'),
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
      onPress: () => ir('/contrato/[id]/aviso'),
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
          () => void cancelarAviso.iniciar(() => cancelarAvisoNoRenovacion(contrato.id)),
        );
      },
    });
  }
  if (puedeSolicitarTerminacion(contrato)) {
    filas.push({
      clave: 'solicitarTerminacion',
      titulo: 'Solicitar terminación anticipada',
      explicacion: 'Pide terminar antes de la fecha de fin, de mutuo acuerdo.',
      icono: 'rechazar',
      tono: 'peligro',
      navega: true,
      onPress: () => ir('/contrato/[id]/terminacion'),
    });
  }
  if (solicitada && t?.puede_confirmar) {
    filas.push({
      clave: 'confirmarTerminacion',
      titulo: 'Confirmar terminación',
      explicacion: 'La otra parte la pidió. Es irreversible.',
      icono: 'aprobar',
      tono: 'peligro',
      onPress: () => {
        if (ocupado(confirmarTerm.fase)) return;
        confirmarAccion(
          'Confirmar terminación anticipada',
          textoConfirmarTerminacion(t.fecha_efectiva),
          'Confirmar terminación',
          () => void confirmarTerm.iniciar(() => confirmarTerminacion(contrato.id)),
          true,
        );
      },
    });
  }
  if (solicitada && t?.puede_cancelar) {
    filas.push({
      clave: 'cancelarTerminacion',
      titulo: 'Cancelar solicitud',
      explicacion: 'Retira tu solicitud de terminación; el contrato sigue.',
      icono: 'rechazar',
      tono: 'advertencia',
      onPress: () => {
        if (ocupado(cancelarTerm.fase)) return;
        confirmarAccion(
          'Cancelar solicitud',
          'La solicitud de terminación se cancelará y el contrato seguirá su curso.',
          'Cancelar solicitud',
          () => void cancelarTerm.iniciar(() => cancelarTerminacion(contrato.id)),
        );
      },
    });
  }
  if (puedeCorregir(contrato)) {
    filas.push(
      {
        clave: 'corregir',
        titulo: 'Corregir datos',
        explicacion: 'Mientras el inquilino no vincule el contrato.',
        icono: 'contratos',
        navega: true,
        onPress: () => ir('/contrato/[id]/corregir'),
      },
      {
        clave: 'corregirInquilino',
        titulo: 'Corregir datos del inquilino',
        explicacion: 'Nombre, cédula y teléfono que escribiste.',
        icono: 'perfil',
        navega: true,
        onPress: () => ir('/contrato/[id]/corregir-inquilino'),
      },
    );
  }
  if (a.cancelarProgramado) {
    filas.push({
      clave: 'cancelarProgramado',
      titulo: 'Cancelar contrato programado',
      explicacion: 'Queda Cancelado y las fechas de la unidad quedan libres.',
      icono: 'rechazar',
      tono: 'peligro',
      onPress: () => {
        if (ocupado(cancelarProgramado.fase)) return;
        confirmarAccion(
          'Cancelar contrato programado',
          'El contrato quedará Cancelado, no se borra nada, el código de acceso dejará de servir y las fechas quedan libres para otro contrato.',
          'Cancelar contrato',
          () => void cancelarProgramado.iniciar(() => cancelarProgramadoApi(contrato.id)),
          true,
        );
      },
    });
  }

  // Lo que pasó con las acciones que se confirman aquí (verificando, error, éxito).
  const mensajes: ReactNode[] = [
    [cancelarAviso, 'Aviso cancelado.'] as const,
    [confirmarTerm, 'Terminación confirmada.'] as const,
    [cancelarTerm, 'Solicitud cancelada.'] as const,
    [cancelarProgramado, null] as const,
  ].map(([accion, exito], indice) => (
    <View key={indice} style={estilos.grupo}>
      <MensajeAccion
        fase={accion.fase}
        error={accion.error}
        onVerificar={() => void accion.verificar()}
        recargable={accion.recargable}
        onRecargar={() => void accion.recargar()}
      />
      {exito && accion.fase === 'exito' ? <Aviso tono="exito" mensaje={exito} /> : null}
    </View>
  ));

  if (filas.length === 0) return <>{mensajes}</>;
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Gestionar contrato" />
      <Superficie relleno="ninguno" style={estilos.lista}>
        {filas.map((f, indice) => (
          <FilaLista
            key={f.clave}
            icono={f.icono}
            tonoIcono={f.tono}
            titulo={f.titulo}
            subtitulo={f.explicacion}
            separador={indice > 0}
            conChevron={f.navega === true}
            onPress={f.onPress}
          />
        ))}
      </Superficie>
      {mensajes}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.xs },
  grupo: { gap: espaciado.xs },
  lista: { paddingVertical: espaciado.xxs },
});
