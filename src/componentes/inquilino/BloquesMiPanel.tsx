// Bloques de Mi panel del inquilino (R3-B, maqueta PanelInquilino): próximo pago, cómo pagar, accesos,
// "Tus pagos", "Tu contrato" y la última solicitud. Todo valor es del servidor; aquí solo se le da forma
// (formato, días que faltan, qué parte de una lista mostrar).

import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PeriodoCuenta } from '../../api/contratos';
import type { PanelContratoActivo } from '../../api/inquilino';
import type { SolicitudInquilino } from '../../api/mantenimiento';
import { avanceContrato } from '../../contratos/lectura';
import { claveCachePortada } from '../../inmuebles/claveImagen';
import {
  accionDePeriodo,
  lineaDePagos,
  plazoDePago,
  textoFechaLimite,
  textoSolicitud,
  textoVencidosPanel,
  tituloProximoPago,
} from '../../inquilino/miPanel';
import { colores, coloresEstado, conAlfa, espaciado, fuentes, radios, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaAbreviada, hoyBogota } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { ESTADOS_CONTRATO, ESTADOS_MANTENIMIENTO } from '../estados';
import { LineaTiempoPeriodos } from '../graficas/LineaTiempoPeriodos';
import { type Acceso, GrillaAccesos } from '../GrillaAccesos';
import { Icono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

/** Pastilla de plazo ("Faltan 5 días") con el tono que corresponde. */
function ChipPlazo({ texto, tono }: ReturnType<typeof plazoDePago>) {
  return (
    <View style={[estilos.chip, { backgroundColor: conAlfa(coloresEstado[tono].senal, 0.16) }]}>
      <Texto variante="etiqueta" color={coloresEstado[tono].texto} style={estilos.textoChip}>
        {texto}
      </Texto>
    </View>
  );
}

/** El período protagonista con los campos del panel (proximo_periodo). */
export type PeriodoProtagonista = NonNullable<PanelContratoActivo['proximo_periodo']>;

/**
 * La tarjeta protagonista (Mi panel y Pagos): el período sin pagar que corresponde (en Mi panel lo elige
 * el servidor: si hay vencidos, es el más antiguo), su plazo, el monto, la fecha límite y la acción; si
 * hay vencidos, una línea de alerta con la cantidad y el total pendiente del servidor. Con el comprobante
 * EN_REVISION no hay plazo: "Tu comprobante está en revisión" y "Reemplazar comprobante" (R4-A). Sin
 * período pendiente: "Estás al día".
 */
export function TarjetaPeriodo({
  periodo: proximo,
  vencidos,
  onReportar,
}: {
  periodo: PeriodoProtagonista | null;
  vencidos?: PanelContratoActivo['periodos_vencidos'];
  onReportar: () => void;
}) {
  if (!proximo) {
    return (
      <View testID="proximo-pago">
        <Superficie style={estilos.alDia}>
          <View
            style={[estilos.icono, { backgroundColor: conAlfa(coloresEstado.exito.senal, 0.14) }]}
          >
            <Icono nombre="aprobar" tamano={22} color={coloresEstado.exito.texto} grosor={2} />
          </View>
          <View style={estilos.flex}>
            <Texto variante="tituloSeccion" accessibilityRole="header">
              Estás al día
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              No tienes pagos pendientes por ahora.
            </Texto>
          </View>
        </Superficie>
      </View>
    );
  }

  const accion = accionDePeriodo(proximo.estado);
  const plazo = accion.conPlazo ? plazoDePago(proximo.fecha_limite, hoyBogota()) : null;
  const mostrarEstado = proximo.estado === 'EN_REVISION' || proximo.estado === 'PARCIAL';
  return (
    <View testID="proximo-pago">
      <Superficie style={estilos.tarjetaPago}>
        <View style={estilos.filaTitulo}>
          <Texto
            variante="etiqueta"
            color={colores.textoFuerte}
            accessibilityRole="header"
            style={estilos.flex}
          >
            {tituloProximoPago(proximo.periodo)}
          </Texto>
          {plazo ? <ChipPlazo {...plazo} /> : null}
        </View>
        <Texto variante="cifraProtagonista" cifras numberOfLines={1} adjustsFontSizeToFit>
          {centavosAPesosTexto(proximo.monto_centavos)}
        </Texto>
        <Texto variante="cuerpo" color={colores.textoFuerte}>
          {textoFechaLimite(proximo.fecha_limite)}
        </Texto>
        {mostrarEstado ? (
          <View style={estilos.estado}>
            <ChipEstado tipo="periodo" estado={proximo.estado} />
            {accion.nota ? (
              <Texto variante="secundario" color={colores.textoFuerte} style={estilos.flex}>
                {accion.nota}
              </Texto>
            ) : null}
          </View>
        ) : null}
        {vencidos && vencidos.cantidad > 0 ? (
          <View
            accessibilityRole="alert"
            style={[
              estilos.lineaAlerta,
              { backgroundColor: conAlfa(coloresEstado.peligro.senal, 0.1) },
            ]}
          >
            <Icono nombre="alerta" tamano={18} color={coloresEstado.peligro.texto} grosor={2} />
            <Texto variante="secundario" color={coloresEstado.peligro.texto} style={estilos.flex}>
              {textoVencidosPanel(vencidos.cantidad, vencidos.total_pendiente_centavos)}
            </Texto>
          </View>
        ) : null}
        <Boton
          titulo={accion.boton.titulo}
          variante={accion.boton.variante}
          ancho="completo"
          onPress={onReportar}
        />
      </Superficie>
    </View>
  );
}

/** La tarjeta de Mi panel con el próximo período y los vencidos del panel. */
export function ProximoPago({
  panel,
  onReportar,
}: {
  panel: PanelContratoActivo;
  onReportar: () => void;
}) {
  return (
    <TarjetaPeriodo
      periodo={panel.proximo_periodo}
      vencidos={panel.periodos_vencidos}
      onReportar={onReportar}
    />
  );
}

/**
 * Recaudo en UNA línea con "Copiar" (U9, pestaña Pagos): el texto libre del arrendador, recortado a una
 * línea (el completo está en "Cómo pagar" de Mi panel y en Mi contrato; "Copiar" copia todo).
 */
export function LineaRecaudo({ datos }: { datos: string }) {
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
    <View testID="linea-recaudo" style={estilos.seccion}>
      <View style={estilos.lineaRecaudo} accessible={false}>
        <Icono nombre="pagos" tamano={20} grosor={1.7} />
        <Texto
          variante="cuerpoFuerte"
          numberOfLines={1}
          accessibilityLabel={`Datos de pago: ${datos}`}
          style={estilos.flex}
        >
          {datos}
        </Texto>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copiar datos de pago"
          onPress={() => void copiar()}
          style={estilos.copiar}
        >
          <Texto variante="etiqueta" color={colores.tintaCapa}>
            Copiar
          </Texto>
        </Pressable>
      </View>
      {copia === 'copiado' ? <Aviso tono="exito" mensaje="Copiado" /> : null}
      {copia === 'error' ? <Aviso mensaje="No pudimos copiar los datos." /> : null}
    </View>
  );
}

/**
 * "Cómo pagar": el texto libre que dejó el arrendador (cuenta, banco…) con "Copiar". No se guarda ni se
 * registra. Sin datos de recaudo la sección no existe (la llave Bre-B y la referencia llegan en P1).
 */
export function ComoPagar({ datos }: { datos: string }) {
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
    <View testID="como-pagar" style={estilos.seccion}>
      <EncabezadoSeccion titulo="Cómo pagar" />
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.cajaDatos}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Datos de pago de tu arrendador
          </Texto>
          <Texto variante="cuerpoFuerte" selectable>
            {datos}
          </Texto>
        </View>
        {copia === 'copiado' ? <Aviso tono="exito" mensaje="Copiado" /> : null}
        {copia === 'error' ? <Aviso mensaje="No pudimos copiar los datos." /> : null}
        <Boton
          titulo="Copiar"
          variante="secundario"
          ancho="completo"
          onPress={() => void copiar()}
        />
      </Superficie>
    </View>
  );
}

type TipoAcceso = 'contrato' | 'estadoCuenta' | 'documentos' | 'nuevaSolicitud';

/** Accesos de Mi panel en grilla, con las mismas rutas de antes. Cada variante pasa los que aplican. */
export function AccesosPanel({ contratoId, tipos }: { contratoId: string; tipos: TipoAcceso[] }) {
  const router = useRouter();
  const id = contratoId;
  const todos: Record<TipoAcceso, Pick<Acceso, 'etiqueta' | 'icono'> & { destino: Href }> = {
    contrato: {
      etiqueta: 'Mi contrato',
      icono: 'contratos',
      destino: { pathname: '/mi-contrato/[id]', params: { id } },
    },
    estadoCuenta: {
      etiqueta: 'Estado de cuenta',
      icono: 'pagos',
      destino: { pathname: '/mi-contrato/[id]/estado-cuenta', params: { id } },
    },
    documentos: {
      etiqueta: 'Documentos',
      icono: 'documento',
      destino: { pathname: '/mi-contrato/[id]', params: { id, seccion: 'documentos' } },
    },
    nuevaSolicitud: {
      etiqueta: 'Nueva solicitud',
      icono: 'mantenimiento',
      destino: '/nueva-solicitud',
    },
  };
  const accesos: Acceso[] = tipos.map((tipo) => ({
    clave: tipo,
    etiqueta: todos[tipo].etiqueta,
    icono: todos[tipo].icono,
    onPress: () => router.push(todos[tipo].destino),
  }));
  return (
    <View testID="accesos-panel">
      <GrillaAccesos accesos={accesos} />
    </View>
  );
}

/**
 * "Tus pagos": los últimos 12 meses del estado de cuenta, uno por período con el color de su estado. El
 * servidor no da todavía un resumen de puntualidad ("N de M a tiempo"): no se inventa.
 */
export function TusPagos({ periodos }: { periodos: readonly PeriodoCuenta[] }) {
  const linea = lineaDePagos(periodos, hoyBogota());
  if (linea.length === 0) return null;
  return (
    <View testID="tus-pagos">
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Tus pagos
        </Texto>
        <LineaTiempoPeriodos periodos={linea} />
      </Superficie>
    </View>
  );
}

/**
 * "Tu contrato": estado, días restantes (del servidor), avance entre el inicio y el fin (la barra es
 * solo presentación de las dos fechas) y las fechas.
 */
export function TuContrato({
  estado,
  diasRestantes,
  fechaInicio,
  fechaFin,
}: {
  estado: keyof typeof ESTADOS_CONTRATO;
  diasRestantes: number;
  fechaInicio: string;
  fechaFin: string;
}) {
  const porcentaje = Math.round(avanceContrato(fechaInicio, fechaFin, hoyBogota()).fraccion * 100);
  return (
    <View testID="tu-contrato">
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.filaTitulo}>
          <Texto variante="tituloSeccion" accessibilityRole="header" style={estilos.flex}>
            Tu contrato
          </Texto>
          <ChipEstado tipo="contrato" estado={estado} />
        </View>
        <View style={estilos.dias}>
          <Texto variante="cifraMedia" cifras>
            {String(diasRestantes)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {diasRestantes === 1 ? 'día restante' : 'días restantes'}
          </Texto>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Avance del contrato"
          accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
          style={estilos.pista}
        >
          <View testID="avance-contrato" style={[estilos.relleno, { width: `${porcentaje}%` }]} />
        </View>
        <View style={estilos.fechas}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {formatearFechaAbreviada(fechaInicio)}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {formatearFechaAbreviada(fechaFin)}
          </Texto>
        </View>
      </Superficie>
    </View>
  );
}

/**
 * Miniatura de la foto adjunta (Mi panel y la lista de Solicitudes); si la URL firmada ya no sirve, el
 * icono (no se guarda la URL). Un video no tiene miniatura: su icono propio lo anuncia (R4-C, a8).
 */
export function MiniaturaSolicitud({ solicitud }: { solicitud: SolicitudInquilino }) {
  const [fallida, setFallida] = useState(false);
  const url = solicitud.adjunto_tipo === 'IMAGEN' && !fallida ? solicitud.adjunto_url : null;
  if (!url) {
    const video = solicitud.adjunto_tipo === 'VIDEO';
    return (
      <View
        accessible={video}
        accessibilityLabel={video ? 'Tiene video' : undefined}
        style={[estilos.miniatura, estilos.sinFoto]}
      >
        <Icono nombre={video ? 'video' : 'mantenimiento'} tamano={22} grosor={1.7} />
      </View>
    );
  }
  return (
    <View testID="miniatura-solicitud" style={estilos.miniatura}>
      <Image
        source={{
          uri: url,
          cacheKey: claveCachePortada(`solicitud:${solicitud.id}`, url) ?? undefined,
        }}
        contentFit="cover"
        onError={() => setFallida(true)}
        style={estilos.imagen}
      />
    </View>
  );
}

/**
 * "Solicitudes": la más reciente (el servidor las da de la más reciente a la más antigua) con su foto si
 * la tiene, urgencia, cuándo se creó y su estado; abre el detalle. "Ver todas" lleva a la pestaña.
 */
export function UltimaSolicitud({ solicitud }: { solicitud: SolicitudInquilino }) {
  const router = useRouter();
  const detalle = textoSolicitud(solicitud.urgencia, solicitud.creado_en);
  return (
    <View testID="ultima-solicitud" style={estilos.seccion}>
      <EncabezadoSeccion
        titulo="Solicitudes"
        enlace={{ etiqueta: 'Ver todas', onPress: () => router.push('/solicitudes') }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityHint={`${detalle}. ${ESTADOS_MANTENIMIENTO[solicitud.estado].etiqueta}`}
        onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: solicitud.id } })}
        style={({ pressed }) => [estilos.solicitud, pressed && estilos.presionada]}
      >
        <MiniaturaSolicitud solicitud={solicitud} />
        <View style={estilos.flex}>
          <Texto variante="filaTitulo" numberOfLines={1}>
            {solicitud.descripcion}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {detalle}
          </Texto>
        </View>
        <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  seccion: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.sm },
  tarjetaPago: { gap: 14 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  lineaRecaudo: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingLeft: espaciado.md,
    paddingRight: espaciado.xxs,
    borderRadius: radios.medio,
    backgroundColor: colores.superficie,
  },
  copiar: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: espaciado.sm,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  chip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radios.pildora,
    justifyContent: 'center',
  },
  textoChip: { fontFamily: fuentes.extranegrita, fontSize: 13 },
  lineaAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    padding: espaciado.sm,
    borderRadius: radios.medio,
  },
  alDia: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaDatos: {
    gap: 2,
    padding: 14,
    borderRadius: radios.medio,
    backgroundColor: colores.fondo,
  },
  dias: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pista: { height: 8, borderRadius: 4, backgroundColor: tintaAlfa(0.07), overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4, backgroundColor: colores.serie },
  fechas: { flexDirection: 'row', justifyContent: 'space-between' },
  solicitud: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colores.superficie,
  },
  presionada: { opacity: 0.85 },
  miniatura: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  sinFoto: { backgroundColor: tintaAlfa(0.06), alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
});
