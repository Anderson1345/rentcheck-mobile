import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorApi } from '@/api/cliente';
import type { ContratoDetalle } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
import type { Inmueble } from '@/api/inmuebles';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { BotonIcono } from '@/componentes/BotonIcono';
import { CabeceraTinta } from '@/componentes/CabeceraTinta';
import { GestionarContrato } from '@/componentes/contratos/GestionarContrato';
import { AvisosContrato, FilaPeriodo } from '@/componentes/contratos/LecturaContrato';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FilaLista } from '@/componentes/FilaLista';
import { GrillaAccesos } from '@/componentes/GrillaAccesos';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato, useEstadoCuenta } from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { clavesInmuebles } from '@/consultas/inmuebles';
import {
  avanceContrato,
  inicialesDe,
  proximosPagos,
  textoChipContrato,
  textoDiasRestantes,
} from '@/contratos/lectura';
import { ETIQUETA_PLANTILLA, esPlantillaVivienda } from '@/contratos/plantilla';
import { blancoAlfa, colores, espaciado, fuentes, radios, tintaAlfa } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaCorta, hoyBogota } from '@/utilidades/fechas';

/** Radio inferior de la cabecera de tinta (maqueta Contrato). */
const RADIO_CABECERA = 32;

export default function DetalleContrato() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useContrato(id);
  const { data: contrato, isPending, isError, error, refetch } = consulta;
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlEnfocar(consulta);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/contratos-arrendador');
  }

  async function arrastrar() {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }

  if (contrato === undefined) {
    let cuerpo: ReactNode;
    if (isPending) {
      cuerpo = <EsqueletoCarga filas={4} />;
    } else if (isError && error instanceof ErrorApi && error.status === 404) {
      cuerpo = (
        <EstadoMensaje
          titulo="Contrato no encontrado"
          mensaje="Este contrato no existe o no tienes acceso a él."
        >
          <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
        </EstadoMensaje>
      );
    } else {
      cuerpo = (
        <>
          <Aviso mensaje={mensajeDeError(error)} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            ancho="completo"
            onPress={() => void refetch()}
          />
        </>
      );
    }
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
        <View style={estilos.cuerpo}>{cuerpo}</View>
      </View>
    );
  }

  const ir = (
    pathname:
      | '/contrato/[id]/estado-cuenta'
      | '/contrato/[id]/documentos'
      | '/contrato/[id]/acceso'
      | '/contrato/[id]/inventario',
  ) => router.push({ pathname, params: { id: contrato.id } });

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
        contentContainerStyle={{ paddingBottom: bottom + espaciado.xl }}
      >
        <Cabecera contrato={contrato} onVolver={volver} />
        <View style={estilos.cuerpo}>
          <AvisosContrato
            aviso={contrato.aviso_no_renovacion}
            terminacion={contrato.terminacion_anticipada}
          />
          <TarjetaInquilino contrato={contrato} />
          <GrillaAccesos
            accesos={[
              {
                clave: 'cuenta',
                etiqueta: 'Estado de cuenta',
                icono: 'pagos',
                destacado: true,
                onPress: () => ir('/contrato/[id]/estado-cuenta'),
              },
              {
                clave: 'documentos',
                etiqueta: 'Documentos',
                icono: 'documento',
                onPress: () => ir('/contrato/[id]/documentos'),
              },
              {
                clave: 'acceso',
                etiqueta: 'Código de acceso',
                icono: 'perfil',
                onPress: () => ir('/contrato/[id]/acceso'),
              },
              {
                clave: 'inventario',
                etiqueta: 'Inventario',
                icono: 'camara',
                onPress: () => ir('/contrato/[id]/inventario'),
              },
            ]}
          />
          <ProximosPagos contratoId={contrato.id} />
          <Condiciones contrato={contrato} />
          <Incrementos contrato={contrato} />
          <GestionarContrato contrato={contrato} />
        </View>
      </ScrollView>
    </View>
  );
}

/** Dirección del inmueble de la unidad, si ya está en la caché (no se pide nada solo para esto). */
function useDireccionEnCache(inmuebleId: string | undefined): string | null {
  const cliente = useQueryClient();
  if (!inmuebleId) return null;
  const detalle = cliente.getQueryData<Inmueble>(clavesInmuebles.detalle(inmuebleId));
  const lista = cliente.getQueryData<Inmueble[]>(clavesInmuebles.lista);
  return detalle?.direccion ?? lista?.find((i) => i.id === inmuebleId)?.direccion ?? null;
}

/** Lo que reemplaza a "N días restantes" cuando el contrato no está activo. */
function textoSinDias(c: ContratoDetalle): string {
  switch (c.estado) {
    case 'PROGRAMADO':
      return `Empieza el ${formatearFechaCorta(c.fecha_inicio)}`;
    case 'VENCIDO':
      return `Finalizó el ${formatearFechaCorta(c.fecha_fin)}`;
    case 'TERMINADO_ANTICIPADAMENTE':
      return 'Terminado anticipadamente';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return '';
  }
}

function Cabecera({ contrato: c, onVolver }: { contrato: ContratoDetalle; onVolver: () => void }) {
  const direccion = useDireccionEnCache(c.unidad.inmueble_id);
  const activo = c.estado === 'ACTIVO';
  const avance = avanceContrato(c.fecha_inicio, c.fecha_fin, hoyBogota());
  const plantilla = ETIQUETA_PLANTILLA[c.tipo_plantilla];
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
            {textoChipContrato(c.estado, c.estado_pago)}
          </Texto>
        </View>
      </View>
      <Texto variante="secundario" color={blancoAlfa(0.65)} style={estilos.margenArriba}>
        {direccion ? `${direccion} · ${plantilla}` : plantilla}
      </Texto>
      <Texto variante="titulo" color={colores.sobreTinta} accessibilityRole="header">
        {c.unidad.nombre}
      </Texto>
      <View style={estilos.filaCanon}>
        <Texto variante="cifraMedia" color={colores.lima} cifras>
          {centavosAPesosTexto(c.canon_centavos)}
        </Texto>
        <Texto variante="secundario" color={blancoAlfa(0.65)}>
          {c.dia_pago !== undefined ? `/ mes · día ${c.dia_pago}` : '/ mes'}
        </Texto>
      </View>
      <View
        style={estilos.barra}
        accessibilityRole="progressbar"
        accessibilityLabel="Avance del contrato"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(avance.fraccion * 100) }}
      >
        <View style={[estilos.barraLlena, { width: `${Math.round(avance.fraccion * 100)}%` }]} />
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

function TarjetaInquilino({ contrato: c }: { contrato: ContratoDetalle }) {
  const telefono = c.inquilino.telefono;
  return (
    <Superficie style={estilos.inquilino}>
      <View style={estilos.iniciales}>
        <Texto variante="etiqueta" color={colores.lima} style={estilos.textoIniciales}>
          {inicialesDe(c.inquilino.nombre)}
        </Texto>
      </View>
      <View style={estilos.textosInquilino}>
        <Texto variante="cuerpoFuerte">{c.inquilino.nombre}</Texto>
        {c.inquilino.cedula ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Cédula ${c.inquilino.cedula}`}
          </Texto>
        ) : null}
        <Texto
          variante="secundario"
          color={c.vinculado ? colores.tintaCapa : colores.textoSecundario}
        >
          {c.vinculado ? 'Vinculado' : 'Sin vincular'}
        </Texto>
      </View>
      {telefono ? (
        <Boton
          titulo="Llamar"
          variante="secundario"
          ancho="contenido"
          onPress={() => void Linking.openURL(`tel:${telefono}`)}
        />
      ) : null}
    </Superficie>
  );
}

/**
 * Hasta 3 períodos sin pagar, de la MISMA consulta que usa "Estado de cuenta" (se reutiliza su caché al
 * abrirla). Si no carga, la sección no se muestra: nunca se inventan fechas ni montos.
 */
function ProximosPagos({ contratoId }: { contratoId: string }) {
  const cuenta = useEstadoCuenta(contratoId);
  if (!cuenta.data) return null;
  const pendientes = proximosPagos(cuenta.data.periodos);
  return (
    <View testID="proximos-pagos" style={estilos.seccion}>
      <EncabezadoSeccion titulo="Próximos pagos" />
      {pendientes.length === 0 ? (
        <Superficie>
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            No hay pagos pendientes.
          </Texto>
        </Superficie>
      ) : (
        <Superficie relleno="ninguno">
          {pendientes.map((p, indice) => (
            <FilaPeriodo key={p.periodo} p={p} separador={indice > 0} />
          ))}
        </Superficie>
      )}
    </View>
  );
}

function Condiciones({ contrato: c }: { contrato: ContratoDetalle }) {
  const vivienda = esPlantillaVivienda(c.tipo_plantilla);
  const datos: { etiqueta: string; valor: string }[] = [
    { etiqueta: 'Plantilla', valor: ETIQUETA_PLANTILLA[c.tipo_plantilla] },
    ...(c.dia_pago !== undefined
      ? [{ etiqueta: 'Día de pago', valor: `Día ${c.dia_pago} de cada mes` }]
      : []),
    ...(!vivienda && c.deposito_centavos
      ? [{ etiqueta: 'Depósito', valor: centavosAPesosTexto(c.deposito_centavos) }]
      : []),
    ...(c.inquilino.telefono
      ? [{ etiqueta: 'Teléfono del inquilino', valor: c.inquilino.telefono }]
      : []),
    ...(c.inquilino.correo
      ? [{ etiqueta: 'Correo del inquilino', valor: c.inquilino.correo }]
      : []),
    ...(c.datos_recaudo ? [{ etiqueta: 'Datos de recaudo', valor: c.datos_recaudo }] : []),
  ];
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Condiciones" />
      <Superficie style={estilos.grilla}>
        {datos.map((d) => (
          <View
            key={d.etiqueta}
            style={[estilos.celda, d.etiqueta === 'Datos de recaudo' && estilos.celdaAncha]}
          >
            <Texto variante="secundario" color={colores.textoSecundario}>
              {d.etiqueta}
            </Texto>
            <Texto variante="cuerpoFuerte">{d.valor}</Texto>
          </View>
        ))}
      </Superficie>
    </View>
  );
}

function Incrementos({ contrato: c }: { contrato: ContratoDetalle }) {
  const lista = c.incrementos_ipc ?? [];
  if (lista.length === 0) return null;
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Incrementos de IPC" />
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
  seccion: { gap: espaciado.xs },
  inquilino: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iniciales: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colores.tintaCapa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoIniciales: { fontFamily: fuentes.extranegrita, fontSize: 16 },
  textosInquilino: { flex: 1, gap: 2 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaciado.sm },
  celda: { width: '50%', gap: 2, paddingRight: espaciado.xs },
  celdaAncha: { width: '100%' },
  separador: { height: 1, backgroundColor: tintaAlfa(0.07) },
});
