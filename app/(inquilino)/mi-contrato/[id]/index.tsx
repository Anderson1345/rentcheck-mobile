import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type ContratoInquilinoDetalle,
  type ContratoInquilinoResumen,
  listarDocumentosInquilino,
} from '@/api/inquilino';
import { Aviso } from '@/componentes/Aviso';
import { BotonIcono } from '@/componentes/BotonIcono';
import { CabeceraTinta } from '@/componentes/CabeceraTinta';
import { AvisosContrato, SeccionDocumentos } from '@/componentes/contratos/LecturaContrato';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { FilaLista } from '@/componentes/FilaLista';
import { type Acceso, GrillaAccesos } from '@/componentes/GrillaAccesos';
import { AccionesInquilino } from '@/componentes/inquilino/AccionesInquilino';
import {
  ContratoNoEncontrado,
  ErrorConReintento,
  FotosEntrega,
} from '@/componentes/inquilino/PortalInquilino';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useContratoInquilino, useRefrescarSiNoEncontrado } from '@/consultas/inquilino';
import { formatearPorcentaje } from '@/contratos/acciones';
import { avanceContrato, textoChipContrato, textoDiasRestantes } from '@/contratos/lectura';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { blancoAlfa, colores, espaciado, fuentes, radios } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta, formatearFechaLarga, hoyBogota } from '@/utilidades/fechas';

/** Radio inferior de la cabecera de tinta (maqueta Contrato, como el detalle del arrendador). */
const RADIO_CABECERA = 32;
/** El estado de pago de la lista (minúsculas) con el nombre que usa el chip de la cabecera. */
const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

type Destino = 'documentos' | 'fotos';

// Mi contrato (rediseño R4-B): la versión del inquilino del detalle de contrato de R2-B. Cabecera de
// tinta, accesos, condiciones en 2 columnas, incrementos, documentos, fotos de entrega y "Gestionar
// contrato" con lo que el servidor permite. La terminación y el aviso se muestran como información.
// pdf_contrato_url es obsoleto y fotos_devolucion no se usa. Con seccion=documentos (acceso de Mi
// panel) los documentos van primero.
export default function MiContrato() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id, seccion } = useLocalSearchParams<{ id: string; seccion?: string }>();
  const consulta = useContratoInquilino(id);
  const { data: contrato, isPending, error, refetch } = consulta;
  useRefrescarAlEnfocar(consulta);
  const noEncontrado = useRefrescarSiNoEncontrado(error);
  // Dirección y unidad salen de la lista de contratos (el detalle solo trae el id de la unidad).
  const { lista } = useContratoSeleccionado();
  const resumen = lista.data?.find((c) => c.id === id) ?? null;
  const [refrescando, setRefrescando] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const posiciones = useRef<{ cuerpo: number } & Partial<Record<Destino, number>>>({ cuerpo: 0 });

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  async function arrastrar() {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }

  /** Documentos y Fotos de entrega viven en esta pantalla: el acceso lleva a su sección. */
  function irA(destino: Destino) {
    const y = posiciones.current[destino];
    if (y === undefined) return;
    scroll.current?.scrollTo?.({ y: posiciones.current.cuerpo + y - espaciado.md, animated: true });
  }

  // Un 404 manda sobre cualquier dato en caché: el contrato ya no es del inquilino.
  if (noEncontrado || contrato === undefined) {
    return (
      <View style={estilos.pantalla}>
        <CabeceraTinta style={estilos.cabecera}>
          <BotonIcono
            icono="atras"
            etiqueta="Volver"
            tamano="compacto"
            sobreTinta
            onPress={volver}
          />
        </CabeceraTinta>
        <View style={estilos.cuerpo}>
          {noEncontrado ? (
            <ContratoNoEncontrado textoBoton="Volver" onPress={volver} />
          ) : isPending ? (
            <EsqueletoCarga filas={4} />
          ) : (
            <ErrorConReintento error={error} onReintentar={() => void refetch()} />
          )}
        </View>
      </View>
    );
  }

  const activo = contrato.estado === 'ACTIVO';
  const conFotos = contrato.fotos_entrega.length > 0;
  const accesos: Acceso[] = [
    {
      clave: 'cuenta',
      etiqueta: 'Estado de cuenta',
      icono: 'pagos',
      destacado: true,
      onPress: () => router.push({ pathname: '/mi-contrato/[id]/estado-cuenta', params: { id } }),
    },
    {
      clave: 'documentos',
      etiqueta: 'Documentos',
      icono: 'documento',
      onPress: () => irA('documentos'),
    },
    ...(conFotos
      ? [
          {
            clave: 'fotos',
            etiqueta: 'Fotos de entrega',
            icono: 'camara' as const,
            onPress: () => irA('fotos'),
          },
        ]
      : []),
    ...(activo
      ? [
          {
            clave: 'reportar',
            etiqueta: 'Reportar pago',
            icono: 'comprobante' as const,
            onPress: () => router.push({ pathname: '/reportar-pago', params: { contratoId: id } }),
          },
        ]
      : []),
  ];

  // La lista sale del detalle; la URL firmada no se usa de ahí: se pide la lista fresca al descargar.
  const documentos = (
    <Seccion
      key="documentos"
      testID="seccion-documentos"
      alMedir={(y) => {
        posiciones.current.documentos = y;
      }}
    >
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
        enFilas
      />
    </Seccion>
  );
  const condiciones = (
    <Seccion key="condiciones" testID="seccion-condiciones">
      <Condiciones contrato={contrato} />
      <Incrementos contrato={contrato} />
    </Seccion>
  );
  const primero = seccion === 'documentos';

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
        contentContainerStyle={{ paddingBottom: bottom + espaciado.xl }}
      >
        <Cabecera contrato={contrato} resumen={resumen} onVolver={volver} />
        <View
          style={estilos.cuerpo}
          onLayout={(e) => {
            posiciones.current.cuerpo = e.nativeEvent.layout.y;
          }}
        >
          <AvisosContrato
            aviso={contrato.aviso_no_renovacion}
            terminacion={contrato.terminacion_anticipada}
          />
          <GrillaAccesos accesos={accesos} />
          {primero ? [documentos, condiciones] : [condiciones, documentos]}
          {conFotos ? (
            <Seccion
              testID="seccion-fotos"
              alMedir={(y) => {
                posiciones.current.fotos = y;
              }}
            >
              <FotosEntrega fotos={contrato.fotos_entrega} />
            </Seccion>
          ) : null}
          <AccionesInquilino contrato={contrato} />
        </View>
      </ScrollView>
    </View>
  );
}

/** Una sección del cuerpo; avisa su posición para que el acceso de la grilla la alcance. */
function Seccion({
  testID,
  alMedir,
  children,
}: {
  testID: string;
  alMedir?: (y: number) => void;
  children: ReactNode;
}) {
  return (
    <View
      testID={testID}
      style={estilos.seccion}
      onLayout={alMedir ? (e) => alMedir(e.nativeEvent.layout.y) : undefined}
    >
      {children}
    </View>
  );
}

/** Lo que reemplaza a "N días restantes" cuando el contrato no está activo. */
function textoSinDias(c: ContratoInquilinoDetalle): string {
  switch (c.estado) {
    case 'PROGRAMADO':
      return `Empieza el ${formatearFechaCorta(c.fecha_inicio)}`;
    case 'VENCIDO':
      return `Finalizó el ${formatearFechaCorta(c.fecha_fin)}`;
    case 'TERMINADO_ANTICIPADAMENTE':
      return 'Terminado anticipadamente';
    default:
      return '';
  }
}

function Cabecera({
  contrato: c,
  resumen,
  onVolver,
}: {
  contrato: ContratoInquilinoDetalle;
  resumen: ContratoInquilinoResumen | null;
  onVolver: () => void;
}) {
  const activo = c.estado === 'ACTIVO';
  const avance = avanceContrato(c.fecha_inicio, c.fecha_fin, hoyBogota());
  const porcentaje = Math.round(avance.fraccion * 100);
  const pago = resumen?.estado_pago ? ESTADO_PAGO[resumen.estado_pago] : undefined;
  return (
    <CabeceraTinta style={estilos.cabecera}>
      <View style={estilos.filaArriba}>
        <BotonIcono
          icono="atras"
          etiqueta="Volver"
          tamano="compacto"
          sobreTinta
          onPress={onVolver}
        />
        <View style={estilos.chip}>
          <Texto variante="etiqueta" color={colores.tinta} style={estilos.textoChip}>
            {textoChipContrato(c.estado, pago)}
          </Texto>
        </View>
      </View>
      <Texto variante="secundario" color={blancoAlfa(0.65)} style={estilos.margenArriba}>
        Mi contrato
      </Texto>
      <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
        {resumen ? `${resumen.inmueble.direccion} · ${resumen.unidad.nombre}` : 'Mi contrato'}
      </Texto>
      <View style={estilos.filaCanon}>
        <Texto variante="cifraMedia" color={colores.lima} cifras>
          {centavosAPesosTexto(c.canon_centavos)}
        </Texto>
        <Texto variante="secundario" color={blancoAlfa(0.65)}>
          {`/ mes · día ${c.dia_pago}`}
        </Texto>
      </View>
      <View
        style={estilos.barra}
        accessibilityRole="progressbar"
        accessibilityLabel="Avance del contrato"
        accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
      >
        <View style={[estilos.barraLlena, { width: `${porcentaje}%` }]} />
      </View>
      <View style={estilos.filaFechas}>
        <Texto variante="secundario" color={blancoAlfa(0.65)} cifras>
          {formatearFechaCorta(c.fecha_inicio)}
        </Texto>
        <Texto variante="etiqueta" color={colores.sobreTinta}>
          {activo ? textoDiasRestantes(avance.diasRestantes) : textoSinDias(c)}
        </Texto>
        <Texto variante="secundario" color={blancoAlfa(0.65)} cifras>
          {formatearFechaCorta(c.fecha_fin)}
        </Texto>
      </View>
    </CabeceraTinta>
  );
}

/** Los datos de recaudo del arrendador (texto libre) con "Copiar". No se guardan ni se registran. */
function CeldaRecaudo({ datos }: { datos: string }) {
  const [copia, setCopia] = useState<'copiado' | 'error' | null>(null);
  async function copiar() {
    try {
      await Clipboard.setStringAsync(datos);
      setCopia('copiado');
    } catch {
      setCopia('error');
    }
  }
  return (
    <View testID="celda-condicion" style={[estilos.celda, estilos.celdaAncha]}>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Datos de recaudo
      </Texto>
      <Texto variante="cuerpoFuerte" selectable>
        {datos}
      </Texto>
      <Pressable accessibilityRole="button" onPress={() => void copiar()} style={estilos.copiar}>
        <Texto variante="etiqueta" color={colores.tintaCapa}>
          Copiar
        </Texto>
      </Pressable>
      {copia === 'copiado' ? <Aviso tono="exito" mensaje="Copiado" /> : null}
      {copia === 'error' ? <Aviso mensaje="No pudimos copiar los datos." /> : null}
    </View>
  );
}

function Condiciones({ contrato: c }: { contrato: ContratoInquilinoDetalle }) {
  const datos: { etiqueta: string; valor: string }[] = [
    { etiqueta: 'Canon', valor: centavosAPesosTexto(c.canon_centavos) },
    { etiqueta: 'Día de pago', valor: `Día ${c.dia_pago} de cada mes` },
    { etiqueta: 'Forma de pago', valor: c.forma_pago },
    ...(c.deposito_centavos
      ? [{ etiqueta: 'Depósito', valor: centavosAPesosTexto(c.deposito_centavos) }]
      : []),
    { etiqueta: 'Inicio', valor: formatearFechaLarga(c.fecha_inicio) },
    { etiqueta: 'Fin', valor: formatearFechaLarga(c.fecha_fin) },
  ];
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Condiciones" />
      <Superficie style={estilos.grilla}>
        {datos.map((d) => (
          <View key={d.etiqueta} testID="celda-condicion" style={estilos.celda}>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {d.etiqueta}
            </Texto>
            <Texto variante="cuerpoFuerte">{d.valor}</Texto>
          </View>
        ))}
        {c.datos_recaudo ? <CeldaRecaudo datos={c.datos_recaudo} /> : null}
      </Superficie>
    </View>
  );
}

function Incrementos({ contrato: c }: { contrato: ContratoInquilinoDetalle }) {
  if (c.incrementos_ipc.length === 0) return null;
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Incrementos de IPC" />
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
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: {
    borderBottomLeftRadius: RADIO_CABECERA,
    borderBottomRightRadius: RADIO_CABECERA,
    paddingBottom: espaciado.lg,
  },
  cuerpo: { gap: espaciado.md, paddingHorizontal: espaciado.md, paddingTop: espaciado.lg },
  filaArriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radios.pildora,
    backgroundColor: colores.lima,
    justifyContent: 'center',
  },
  textoChip: { fontFamily: fuentes.extranegrita },
  margenArriba: { marginTop: espaciado.sm },
  filaCanon: { flexDirection: 'row', alignItems: 'baseline', gap: espaciado.xs, marginTop: 4 },
  barra: {
    height: 6,
    borderRadius: 3,
    backgroundColor: blancoAlfa(0.14),
    overflow: 'hidden',
    marginTop: espaciado.md,
  },
  barraLlena: { height: '100%', backgroundColor: colores.lima, borderRadius: 3 },
  filaFechas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espaciado.xs,
  },
  seccion: { gap: espaciado.md },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaciado.sm },
  celda: { width: '50%', gap: 2, paddingRight: espaciado.xs },
  celdaAncha: { width: '100%' },
  copiar: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
