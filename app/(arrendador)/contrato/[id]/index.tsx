import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import {
  type ContratoDetalle,
  type DocumentoContrato,
  listarDocumentos,
  type ResumenTerminacionContrato,
  type RolContrato,
} from '@/api/contratos';
import { detalleTecnico, mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { AccionesContrato } from '@/componentes/contratos/AccionesContrato';
import {
  BotonRegenerar,
  SeccionCorreccion,
  SeccionTerminacion,
} from '@/componentes/contratos/TerminacionYCorreccion';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
import { DetalleTecnico } from '@/componentes/DetalleTecnico';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaLista } from '@/componentes/FilaLista';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato, useDocumentos, useRegenerarCodigo } from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { ETIQUETA_DOCUMENTO, nombreArchivoDocumento } from '@/contratos/lectura';
import { ETIQUETA_PLANTILLA, esPlantillaVivienda } from '@/contratos/plantilla';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { descargarYCompartir } from '@/utilidades/documentos';
import { formatearFechaCorta, formatearFechaLarga } from '@/utilidades/fechas';

const ROL: Record<RolContrato, string> = { ARRENDADOR: 'el arrendador', INQUILINO: 'el inquilino' };

export default function DetalleContrato() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useContrato(id);
  const { data: contrato, isPending, isError, error, refetch } = consulta;
  useRefrescarAlEnfocar(consulta);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/contratos-arrendador');
  }

  if (contrato === undefined) {
    if (isPending) {
      return (
        <PantallaPila>
          <EsqueletoCarga filas={4} />
        </PantallaPila>
      );
    }
    if (isError && error instanceof ErrorApi && error.status === 404) {
      return (
        <PantallaPila>
          <EstadoMensaje
            titulo="Contrato no encontrado"
            mensaje="Este contrato no existe o no tienes acceso a él."
          >
            <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
          </EstadoMensaje>
        </PantallaPila>
      );
    }
    return (
      <PantallaPila>
        <Aviso mensaje={mensajeDeError(error)} />
        <Boton
          titulo="Reintentar"
          variante="secundario"
          ancho="completo"
          onPress={() => void refetch()}
        />
      </PantallaPila>
    );
  }

  return (
    <PantallaPila>
      <Datos contrato={contrato} />
      <Incrementos contrato={contrato} />
      <Avisos contrato={contrato} />
      <AccionesContrato contrato={contrato} />
      <SeccionTerminacion contrato={contrato} />
      <SeccionCorreccion contrato={contrato} />
      <Documentos contratoId={contrato.id} />
      <Acceso contrato={contrato} />
      <Boton
        titulo="Fotos de inventario"
        variante="secundario"
        ancho="completo"
        onPress={() =>
          router.push({ pathname: '/contrato/[id]/inventario', params: { id: contrato.id } })
        }
      />
    </PantallaPila>
  );
}

function Datos({ contrato: c }: { contrato: ContratoDetalle }) {
  const vivienda = esPlantillaVivienda(c.tipo_plantilla);
  return (
    <Superficie style={estilos.tarjeta}>
      <ChipEstado tipo="contrato" estado={c.estado} />
      <Texto variante="titulo" accessibilityRole="header">
        {c.unidad.nombre}
      </Texto>
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        {ETIQUETA_PLANTILLA[c.tipo_plantilla]}
      </Texto>
      <Texto variante="cuerpo">{`${formatearFechaLarga(c.fecha_inicio)} al ${formatearFechaLarga(c.fecha_fin)}`}</Texto>
      <Texto variante="cuerpoFuerte">{`Canon: ${centavosAPesosTexto(c.canon_centavos)}`}</Texto>
      {c.dia_pago !== undefined ? (
        <Texto variante="cuerpo">{`Día de pago: ${c.dia_pago}`}</Texto>
      ) : null}
      {!vivienda && c.deposito_centavos ? (
        <Texto variante="cuerpo">{`Depósito: ${centavosAPesosTexto(c.deposito_centavos)}`}</Texto>
      ) : null}
      <Texto variante="tituloSeccion" accessibilityRole="header" style={estilos.subtitulo}>
        Inquilino
      </Texto>
      <Texto variante="cuerpoFuerte">{c.inquilino.nombre}</Texto>
      {c.inquilino.cedula ? (
        <Texto variante="cuerpo">{`Cédula ${c.inquilino.cedula}`}</Texto>
      ) : null}
      {c.inquilino.telefono ? (
        <Texto variante="cuerpo">{`Teléfono ${c.inquilino.telefono}`}</Texto>
      ) : null}
      {c.inquilino.correo ? (
        <Texto variante="cuerpo">{`Correo ${c.inquilino.correo}`}</Texto>
      ) : null}
    </Superficie>
  );
}

function Incrementos({ contrato: c }: { contrato: ContratoDetalle }) {
  const lista = c.incrementos_ipc ?? [];
  if (lista.length === 0) return null;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Incrementos de IPC
      </Texto>
      <Superficie relleno="ninguno">
        {lista.map((i, indice) => (
          <FilaLista
            key={i.id}
            titulo={`${centavosAPesosTexto(i.canon_anterior_centavos)} → ${centavosAPesosTexto(i.canon_nuevo_centavos)}`}
            subtitulo={`${formatearFechaCorta(i.fecha_aplicacion)} · IPC ${i.porcentaje_ipc_aplicado}%`}
            separador={indice > 0}
          />
        ))}
      </Superficie>
    </View>
  );
}

/** Texto informativo de la terminación anticipada (solicitada o confirmada). */
function textoTerminacion(t: ResumenTerminacionContrato): string {
  const confirmada = t.estado === 'CONFIRMADA';
  const quien = confirmada ? t.confirmada_por : t.solicitada_por;
  const cuando = confirmada ? t.confirmada_en : null;
  return `Terminación anticipada ${confirmada ? 'confirmada' : 'solicitada'}${quien ? ` por ${ROL[quien]}` : ''}${cuando ? ` el ${formatearFechaCorta(cuando)}` : ''}${t.fecha_efectiva ? `. Fecha efectiva: ${formatearFechaCorta(t.fecha_efectiva)}` : ''}.${t.motivo ? ` Motivo: ${t.motivo}` : ''}`;
}

/** Información de solo lectura; las acciones están en la sección Acciones. */
function Avisos({ contrato: c }: { contrato: ContratoDetalle }) {
  const aviso = c.aviso_no_renovacion;
  const termina = c.terminacion_anticipada;
  return (
    <>
      {aviso && aviso.estado === 'DADO' ? (
        <Aviso
          tono="informacion"
          mensaje={`Aviso de no renovación dado por ${aviso.dado_por ? ROL[aviso.dado_por] : 'una de las partes'}${aviso.dado_en ? ` el ${formatearFechaCorta(aviso.dado_en)}` : ''}.${aviso.motivo ? ` Motivo: ${aviso.motivo}` : ''}`}
        />
      ) : null}
      {termina && termina.estado !== 'NINGUNA' ? (
        <Aviso tono="informacion" mensaje={textoTerminacion(termina)} />
      ) : null}
    </>
  );
}

type EstadoDoc = 'descargando' | 'noDisponible' | 'error';

function Documentos({ contratoId }: { contratoId: string }) {
  const documentos = useDocumentos(contratoId);
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
      const fresca = (await listarDocumentos(contratoId)).find((d) => d.id === doc.id);
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
      <BotonRegenerar
        contratoId={contratoId}
        titulo="¿Falta un documento? Generar"
        conConfirmacion
      />
    </View>
  );
}

function Acceso({ contrato: c }: { contrato: ContratoDetalle }) {
  const regenerar = useRegenerarCodigo(c.id);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  if (c.vinculado) {
    return <Aviso tono="informacion" mensaje="El inquilino ya vinculó este contrato." />;
  }
  if (!c.codigo_acceso) return null;

  async function confirmarRegenerar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(null);
    try {
      await regenerar.mutateAsync();
    } catch (falla) {
      setError(mensajeDeError(falla));
    } finally {
      enCurso.current = false;
    }
  }

  return (
    <View style={estilos.grupo}>
      {error ? <Aviso mensaje={error} /> : null}
      <CodigoAcceso
        acceso={c.codigo_acceso}
        nombreInquilino={c.inquilino.nombre}
        regenerando={regenerar.isPending}
        onRegenerar={() =>
          Alert.alert('Regenerar código', 'El código anterior dejará de servir.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Regenerar', style: 'destructive', onPress: () => void confirmarRegenerar() },
          ])
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  grupo: { gap: espaciado.xs },
  subtitulo: { marginTop: espaciado.sm },
});
