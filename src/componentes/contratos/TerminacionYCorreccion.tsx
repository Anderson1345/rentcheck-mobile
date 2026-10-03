// Documentos faltantes y resultado de una corrección. (La terminación y la corrección del detalle se
// ofrecen ahora como filas en GestionarContrato, R2-B.)
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  listarDocumentos,
  type RespuestaCorreccion,
  regenerarDocumentos,
} from '../../api/contratos';
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
