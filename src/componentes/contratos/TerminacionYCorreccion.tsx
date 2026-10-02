import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  cancelarTerminacion,
  confirmarTerminacion,
  type ContratoDetalle,
  listarDocumentos,
  type RespuestaCorreccion,
  regenerarDocumentos,
} from '../../api/contratos';
import {
  puedeCorregir,
  puedeSolicitarTerminacion,
  textoConfirmarTerminacion,
} from '../../contratos/acciones';
import { useAccionContrato } from '../../contratos/useAccionContrato';
import { useDocumentos } from '../../consultas/contratos';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Texto } from '../Texto';
import { confirmarAccion, MensajeAccion } from './AccionesContrato';

/** "Se generó 1 documento." / "Se generaron 2 documentos." / "No faltaba ninguno." */
export function textoGenerados(cantidad: number): string {
  if (cantidad <= 0) return 'No faltaba ninguno.';
  return cantidad === 1 ? 'Se generó 1 documento.' : `Se generaron ${cantidad} documentos.`;
}

/**
 * Terminación anticipada en el detalle. Los botones salen SOLO de los booleanos del servidor
 * (puede_cancelar / puede_confirmar); "Solicitar" se ofrece con el contrato ACTIVO sin solicitud.
 * Una terminación CONFIRMADA no ofrece nada (no hay acta ni liquidación todavía: B-53).
 */
export function SeccionTerminacion({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  const t = contrato.terminacion_anticipada;
  const confirmar = useAccionContrato(contrato.id, 'confirmarTerminacion');
  const cancelar = useAccionContrato(contrato.id, 'cancelarTerminacion');
  const solicitada = t?.estado === 'SOLICITADA';
  const ocupado = (fase: string) => fase === 'enviando' || fase === 'verificando';

  return (
    <View style={estilos.grupo}>
      {puedeSolicitarTerminacion(contrato) ? (
        <Boton
          titulo="Solicitar terminación anticipada"
          variante="secundario"
          ancho="completo"
          onPress={() =>
            router.push({ pathname: '/contrato/[id]/terminacion', params: { id: contrato.id } })
          }
        />
      ) : null}

      {solicitada && t?.puede_cancelar ? (
        <>
          <Boton
            titulo="Cancelar solicitud"
            tituloCargando="Cancelando…"
            cargando={ocupado(cancelar.fase)}
            variante="secundario"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Cancelar solicitud',
                'La solicitud de terminación se cancelará y el contrato seguirá su curso.',
                'Cancelar solicitud',
                () => void cancelar.iniciar(() => cancelarTerminacion(contrato.id)),
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

      {solicitada && t?.puede_confirmar ? (
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
                textoConfirmarTerminacion(t.fecha_efectiva),
                'Confirmar terminación',
                () => void confirmar.iniciar(() => confirmarTerminacion(contrato.id)),
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
      {confirmar.fase === 'exito' ? <Aviso tono="exito" mensaje="Terminación confirmada." /> : null}
      {cancelar.fase === 'exito' ? <Aviso tono="exito" mensaje="Solicitud cancelada." /> : null}
    </View>
  );
}

/** Corregir datos: solo sin vincular y PROGRAMADO o ACTIVO (si hay pagos o incrementos responde el servidor). */
export function SeccionCorreccion({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  if (!puedeCorregir(contrato)) return null;
  return (
    <View style={estilos.grupo}>
      <Boton
        titulo="Corregir datos"
        variante="secundario"
        ancho="completo"
        onPress={() =>
          router.push({ pathname: '/contrato/[id]/corregir', params: { id: contrato.id } })
        }
      />
      <Boton
        titulo="Corregir datos del inquilino"
        variante="secundario"
        ancho="completo"
        onPress={() =>
          router.push({
            pathname: '/contrato/[id]/corregir-inquilino',
            params: { id: contrato.id },
          })
        }
      />
    </View>
  );
}

/**
 * Genera solo los documentos que faltan (idempotente). Tras "sin respuesta" recarga la lista de
 * documentos y compara cuántos había antes.
 */
export function BotonRegenerar({
  contratoId,
  titulo,
  conConfirmacion,
}: {
  contratoId: string;
  titulo: string;
  conConfirmacion: boolean;
}) {
  const documentos = useDocumentos(contratoId);
  const accion = useAccionContrato<
    Awaited<ReturnType<typeof regenerarDocumentos>>,
    Awaited<ReturnType<typeof listarDocumentos>>
  >(contratoId, 'regenerarDocumentos');
  const [verificados, setVerificados] = useState(0);
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  function generar() {
    const antes = documentos.data?.length ?? 0;
    void accion.iniciar(() => regenerarDocumentos(contratoId), {
      leer: () => listarDocumentos(contratoId),
      cambio: (leidos) => {
        setVerificados(leidos.length - antes);
        return leidos.length > antes;
      },
    });
  }

  return (
    <View style={estilos.grupo}>
      <Boton
        titulo={titulo}
        tituloCargando="Generando…"
        cargando={ocupado}
        variante="secundario"
        ancho="completo"
        onPress={() =>
          conConfirmacion
            ? confirmarAccion(
                '¿Falta un documento?',
                'Se generarán solo los documentos que falten; no se cambia ninguno de los existentes.',
                'Generar',
                generar,
              )
            : generar()
        }
      />
      <MensajeAccion
        fase={accion.fase}
        error={accion.error}
        onVerificar={() => void accion.verificar()}
      />
      {accion.fase === 'exito' ? (
        <Aviso
          tono="exito"
          mensaje={textoGenerados(
            accion.resultado ? accion.resultado.generados.length : verificados,
          )}
        />
      ) : null}
    </View>
  );
}

/** Resultado de un PATCH de corrección: versión nueva del PDF o aviso con "Generar documentos faltantes". */
export function ResultadoCorreccion({
  contratoId,
  respuesta,
}: {
  contratoId: string;
  respuesta: RespuestaCorreccion;
}) {
  if (respuesta.documento) {
    return (
      <Aviso
        tono="exito"
        mensaje={`Se generó una versión nueva del contrato (versión ${respuesta.documento.version}).`}
      />
    );
  }
  return (
    <View style={estilos.grupo}>
      <Aviso
        tono="advertencia"
        mensaje="La corrección se aplicó, pero el PDF no se pudo generar."
      />
      <Texto variante="secundario" color={colores.textoSecundario}>
        Puedes generarlo ahora o más tarde desde los documentos del contrato.
      </Texto>
      <BotonRegenerar
        contratoId={contratoId}
        titulo="Generar documentos faltantes"
        conConfirmacion={false}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
