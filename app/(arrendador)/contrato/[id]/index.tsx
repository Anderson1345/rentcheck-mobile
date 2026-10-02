import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import { type ContratoDetalle, listarDocumentos } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
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
import { AvisosContrato, SeccionDocumentos } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaLista } from '@/componentes/FilaLista';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato, useDocumentos, useRegenerarCodigo } from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { ETIQUETA_PLANTILLA, esPlantillaVivienda } from '@/contratos/plantilla';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta, formatearFechaLarga } from '@/utilidades/fechas';

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
      <AvisosContrato
        aviso={contrato.aviso_no_renovacion}
        terminacion={contrato.terminacion_anticipada}
      />
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

function Documentos({ contratoId }: { contratoId: string }) {
  const documentos = useDocumentos(contratoId);
  return (
    <SeccionDocumentos
      contratoId={contratoId}
      consulta={documentos}
      pedirLista={listarDocumentos}
      pie={
        <BotonRegenerar
          contratoId={contratoId}
          titulo="¿Falta un documento? Generar"
          conConfirmacion
        />
      }
    />
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
