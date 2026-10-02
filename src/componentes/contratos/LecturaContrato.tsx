// Piezas de lectura de un contrato que comparten el arrendador (E5) y el inquilino (E6): la lista de
// documentos con "Ver y compartir" y el estado de cuenta. Cada rol pasa su consulta y su ruta.

import { type ReactNode, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  DocumentoContrato,
  EstadoCuenta,
  PeriodoCuenta,
  ResumenAviso,
  ResumenTerminacionContrato,
  RolContrato,
} from '../../api/contratos';
import { detalleTecnico, mensajeDeError } from '../../api/errores';
import { ETIQUETA_DOCUMENTO, nombreArchivoDocumento } from '../../contratos/lectura';
import { mesDePeriodo } from '../../contratos/acciones';
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { descargarYCompartir } from '../../utilidades/documentos';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { DetalleTecnico } from '../DetalleTecnico';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { FilaLista } from '../FilaLista';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

type EstadoDoc = 'descargando' | 'noDisponible' | 'error';

interface PropsDocumentos {
  contratoId: string;
  /** Lo que necesita de una consulta (acepta una de TanStack Query o los datos ya cargados). */
  consulta: {
    data?: DocumentoContrato[];
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  /** Lista fresca del rol (la URL firmada caduca: se pide justo antes de descargar). */
  pedirLista: (contratoId: string) => Promise<DocumentoContrato[]>;
  /** Debajo de la lista (el arrendador pone aquí "¿Falta un documento? Generar"). */
  pie?: ReactNode;
}

export function SeccionDocumentos({ contratoId, consulta, pedirLista, pie }: PropsDocumentos) {
  const documentos = consulta;
  const [estados, setEstados] = useState<Record<string, EstadoDoc | undefined>>({});
  const [fallos, setFallos] = useState<Record<string, string | null>>({});
  // Un documento que se está descargando no se vuelve a pedir.
  const enVuelo = useRef(new Set<string>());

  const poner = (docId: string, estado: EstadoDoc | undefined) =>
    setEstados((actual) => ({ ...actual, [docId]: estado }));

  /** La URL firmada caduca: se pide la lista fresca justo antes de descargar. No se guarda ni se registra. */
  async function verYCompartir(doc: DocumentoContrato) {
    if (enVuelo.current.has(doc.id)) return;
    enVuelo.current.add(doc.id);
    poner(doc.id, 'descargando');
    setFallos((f) => ({ ...f, [doc.id]: null }));
    try {
      const fresca = (await pedirLista(contratoId)).find((d) => d.id === doc.id);
      if (!fresca?.url_firmada) {
        poner(doc.id, 'noDisponible');
        return;
      }
      await descargarYCompartir(
        fresca.url_firmada,
        nombreArchivoDocumento(contratoId, doc.version),
      );
      poner(doc.id, undefined);
    } catch (falla) {
      poner(doc.id, 'error');
      setFallos((f) => ({
        ...f,
        [doc.id]: detalleTecnico(falla),
      }));
    } finally {
      enVuelo.current.delete(doc.id);
    }
  }

  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Documentos
      </Texto>
      {documentos.isPending ? <EsqueletoCarga filas={1} /> : null}
      {documentos.isError && documentos.data === undefined ? (
        <>
          <Aviso mensaje={mensajeDeError(documentos.error)} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            ancho="completo"
            onPress={() => void documentos.refetch()}
          />
        </>
      ) : null}
      {documentos.data?.length === 0 ? (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Aún no hay documentos.
        </Texto>
      ) : null}
      {(documentos.data ?? []).map((doc) => {
        const estado = estados[doc.id];
        const noDisponible = doc.url_firmada === null || estado === 'noDisponible';
        return (
          <Superficie key={doc.id} style={estilos.tarjeta}>
            <FilaLista
              icono="documento"
              titulo={ETIQUETA_DOCUMENTO[doc.tipo]}
              subtitulo={`Versión ${doc.version} · ${formatearFechaCorta(doc.generado_en)}`}
            />
            {noDisponible ? (
              <Texto variante="cuerpo" color={colores.textoSecundario}>
                Archivo no disponible
              </Texto>
            ) : (
              <>
                {estado === 'error' ? (
                  <>
                    <Aviso mensaje="No pudimos descargar el documento. Inténtalo de nuevo." />
                    <DetalleTecnico detalle={fallos[doc.id] ?? null} />
                  </>
                ) : null}
                <Boton
                  titulo={estado === 'error' ? 'Reintentar' : 'Ver y compartir'}
                  tituloCargando="Descargando…"
                  cargando={estado === 'descargando'}
                  variante="secundario"
                  ancho="completo"
                  onPress={() => void verYCompartir(doc)}
                />
              </>
            )}
          </Superficie>
        );
      })}
      {pie}
    </View>
  );
}

const ROL: Record<RolContrato, string> = { ARRENDADOR: 'el arrendador', INQUILINO: 'el inquilino' };

/** Texto informativo de la terminación anticipada (solicitada o confirmada). */
function textoTerminacion(t: ResumenTerminacionContrato): string {
  const confirmada = t.estado === 'CONFIRMADA';
  const quien = confirmada ? t.confirmada_por : t.solicitada_por;
  const cuando = confirmada ? t.confirmada_en : null;
  return `Terminación anticipada ${confirmada ? 'confirmada' : 'solicitada'}${quien ? ` por ${ROL[quien]}` : ''}${cuando ? ` el ${formatearFechaCorta(cuando)}` : ''}${t.fecha_efectiva ? `. Fecha efectiva: ${formatearFechaCorta(t.fecha_efectiva)}` : ''}.${t.motivo ? ` Motivo: ${t.motivo}` : ''}`;
}

/** Información de solo lectura sobre el aviso de no renovación y la terminación anticipada. */
export function AvisosContrato({
  aviso,
  terminacion,
}: {
  aviso: ResumenAviso | undefined;
  terminacion: ResumenTerminacionContrato | undefined;
}) {
  return (
    <>
      {aviso && aviso.estado === 'DADO' ? (
        <Aviso
          tono="informacion"
          mensaje={`Aviso de no renovación dado por ${aviso.dado_por ? ROL[aviso.dado_por] : 'una de las partes'}${aviso.dado_en ? ` el ${formatearFechaCorta(aviso.dado_en)}` : ''}.${aviso.motivo ? ` Motivo: ${aviso.motivo}` : ''}`}
        />
      ) : null}
      {terminacion && terminacion.estado !== 'NINGUNA' ? (
        <Aviso tono="informacion" mensaje={textoTerminacion(terminacion)} />
      ) : null}
    </>
  );
}

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

function FilaPeriodo({ p, separador }: { p: PeriodoCuenta; separador: boolean }) {
  return (
    <FilaLista
      titulo={mesDePeriodo(p.periodo)}
      separador={separador}
      valor={centavosAPesosTexto(p.canonVigenteCentavos)}
      detalle={
        <View style={estilos.detalle}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Fecha límite ${formatearFechaCorta(p.fechaLimite)}`}
          </Texto>
          <ChipEstado tipo="periodo" estado={p.estado} />
          {p.estado === 'PARCIAL' ? (
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Aprobado ${centavosAPesosTexto(p.montoAprobadoCentavos)} de ${centavosAPesosTexto(p.canonVigenteCentavos)}`}
            </Texto>
          ) : null}
        </View>
      }
    />
  );
}

/** Estado de cuenta ya cargado: título, estado de pago y períodos. Los valores son los del servidor. */
export function VistaEstadoCuenta({ data }: { data: EstadoCuenta }) {
  return (
    <>
      <Texto variante="titulo" accessibilityRole="header">
        Estado de cuenta
      </Texto>
      <Superficie style={estilos.encabezado}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Estado de pago
        </Texto>
        <ChipEstado tipo="pagoContrato" estado={ESTADO_PAGO[data.estadoPago]} />
      </Superficie>
      {data.periodos.length === 0 ? (
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Este contrato aún no tiene períodos
        </Texto>
      ) : (
        <Superficie relleno="ninguno">
          {data.periodos.map((p, indice) => (
            <FilaPeriodo key={p.periodo} p={p} separador={indice > 0} />
          ))}
        </Superficie>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  grupo: { gap: espaciado.xs },
  encabezado: { gap: espaciado.xs },
  detalle: { gap: 4, flexShrink: 1 },
});
