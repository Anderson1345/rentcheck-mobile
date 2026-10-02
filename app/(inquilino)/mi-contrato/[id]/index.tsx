import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { type ContratoInquilinoDetalle, listarDocumentosInquilino } from '@/api/inquilino';
import { ChipEstado } from '@/componentes/ChipEstado';
import { AvisosContrato, SeccionDocumentos } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { FilaLista } from '@/componentes/FilaLista';
import {
  ContratoNoEncontrado,
  ErrorConReintento,
  FotosEntrega,
  TarjetaRecaudo,
} from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useContratoInquilino, useRefrescarSiNoEncontrado } from '@/consultas/inquilino';
import { formatearPorcentaje } from '@/contratos/acciones';
import { espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta, formatearFechaLarga } from '@/utilidades/fechas';

// Mi contrato: solo lectura. La terminación y el aviso se muestran como información (E6-B agrega
// las acciones). pdf_contrato_url es obsoleto y fotos_devolucion no se usa en esta entrega.
export default function MiContrato() {
  const router = useRouter();
  const { id, seccion } = useLocalSearchParams<{ id: string; seccion?: string }>();
  const consulta = useContratoInquilino(id);
  const { data: contrato, isPending, error, refetch } = consulta;
  useRefrescarAlEnfocar(consulta);
  const noEncontrado = useRefrescarSiNoEncontrado(error);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  // Un 404 manda sobre cualquier dato en caché: el contrato ya no es del inquilino.
  if (noEncontrado) {
    return (
      <PantallaPila>
        <ContratoNoEncontrado textoBoton="Volver" onPress={volver} />
      </PantallaPila>
    );
  }
  if (contrato === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={4} />
        ) : (
          <ErrorConReintento error={error} onReintentar={() => void refetch()} />
        )}
      </PantallaPila>
    );
  }

  // La lista sale del detalle; la URL firmada no se usa de ahí: se pide la lista fresca al descargar.
  const documentos = (
    <SeccionDocumentos
      contratoId={id}
      consulta={{
        data: contrato.documentos,
        isPending: false,
        isError: false,
        error: null,
        refetch,
      }}
      pedirLista={listarDocumentosInquilino}
    />
  );
  const primero = seccion === 'documentos';

  return (
    <PantallaPila>
      {primero ? documentos : null}
      <Condiciones contrato={contrato} />
      <TarjetaRecaudo datos={contrato.datos_recaudo} />
      <Incrementos contrato={contrato} />
      <AvisosContrato
        aviso={contrato.aviso_no_renovacion}
        terminacion={contrato.terminacion_anticipada}
      />
      <FotosEntrega fotos={contrato.fotos_entrega} />
      {primero ? null : documentos}
    </PantallaPila>
  );
}

function Condiciones({ contrato: c }: { contrato: ContratoInquilinoDetalle }) {
  return (
    <Superficie style={estilos.tarjeta}>
      <ChipEstado tipo="contrato" estado={c.estado} />
      <Texto variante="cuerpo">{`${formatearFechaLarga(c.fecha_inicio)} al ${formatearFechaLarga(c.fecha_fin)}`}</Texto>
      <Texto variante="cuerpoFuerte">{`Canon: ${centavosAPesosTexto(c.canon_centavos)}`}</Texto>
      <Texto variante="cuerpo">{`Día de pago: ${c.dia_pago}`}</Texto>
      <Texto variante="cuerpo">{`Forma de pago: ${c.forma_pago}`}</Texto>
      {c.deposito_centavos ? (
        <Texto variante="cuerpo">{`Depósito: ${centavosAPesosTexto(c.deposito_centavos)}`}</Texto>
      ) : null}
    </Superficie>
  );
}

function Incrementos({ contrato: c }: { contrato: ContratoInquilinoDetalle }) {
  if (c.incrementos_ipc.length === 0) return null;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Incrementos de IPC
      </Texto>
      <Superficie relleno="ninguno">
        {c.incrementos_ipc.map((i, indice) => (
          <FilaLista
            key={i.id}
            titulo={`${centavosAPesosTexto(i.canon_anterior_centavos)} → ${centavosAPesosTexto(i.canon_nuevo_centavos)}`}
            subtitulo={`${formatearFechaCorta(i.fecha_aplicacion)} · IPC ${formatearPorcentaje(i.porcentaje_ipc_aplicado) ?? i.porcentaje_ipc_aplicado}%`}
            separador={indice > 0}
          />
        ))}
      </Superficie>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  grupo: { gap: espaciado.xs },
});
