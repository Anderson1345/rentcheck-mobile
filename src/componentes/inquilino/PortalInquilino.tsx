// Piezas del portal del inquilino (E6-A, solo lectura; Mi panel rediseñado en R3-B): selector de
// contrato, panel por variante, datos de recaudo, fotos de entrega y los estados de error. Todo valor
// (estado de pago, plazos, montos) es el que responde el servidor: la app no calcula nada.

import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PeriodoCuenta } from '../../api/contratos';
import type { FotoInventario } from '../../api/inventario';
import type { SolicitudInquilino } from '../../api/mantenimiento';
import type {
  ContratoInquilinoResumen,
  PanelContratoActivo,
  PanelContratoProgramado,
} from '../../api/inquilino';
import { mensajeDeError } from '../../api/errores';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import {
  useContratoInquilino,
  useEstadoCuentaInquilino,
  usePanelInquilino,
  useRefrescarContratosInquilino,
  useRefrescarSiNoEncontrado,
} from '../../consultas/inquilino';
import { useMisSolicitudes } from '../../consultas/mantenimiento';
import { claveCachePortada } from '../../inmuebles/claveImagen';
import { useContratoSeleccionado } from '../../inquilino/ContratoSeleccionado';
import { mensajeFinalizado, variantePanel } from '../../inquilino/seleccion';
import { useVincularPendiente } from '../../sesion/useVincularPendiente';
import { blancoAlfa, colores, espaciado, radios, tintaAlfa } from '../../tema';
import { formatearFechaAbreviada, formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { Icono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { ImagenAmpliable } from '../VisorImagen';
import {
  AccesosPanel,
  ComoPagar,
  ProximoPago,
  TuContrato,
  TusPagos,
  UltimaSolicitud,
} from './BloquesMiPanel';

/** Error de una consulta de lectura: mensaje en español y "Reintentar". */
export function ErrorConReintento({
  error,
  onReintentar,
}: {
  error: unknown;
  onReintentar: () => void;
}) {
  return (
    <View style={estilos.grupo}>
      <Aviso mensaje={mensajeDeError(error)} />
      <Boton titulo="Reintentar" variante="secundario" ancho="completo" onPress={onReintentar} />
    </View>
  );
}

/** El servidor responde 404 igual para un contrato ajeno, desvinculado o cancelado. */
export function ContratoNoEncontrado({
  textoBoton,
  onPress,
}: {
  textoBoton: string;
  onPress: () => void;
}) {
  return (
    <EstadoMensaje
      titulo="No encontramos este contrato"
      mensaje="Puede que ya no esté vinculado a tu cuenta."
    >
      <Boton titulo={textoBoton} variante="acento" ancho="completo" onPress={onPress} />
    </EstadoMensaje>
  );
}

/**
 * Píldora de la cabecera de Mi panel, Pagos y Solicitudes (R3-B, R4-A): "inmueble · unidad" con el punto
 * lima; abre "Mis contratos" para cambiar de contrato o agregar otro.
 */
export function PildoraContrato({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  const texto = `${contrato.inmueble.direccion} · ${contrato.unidad.nombre}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cambiar de contrato. ${texto}`}
      onPress={() => router.push('/mis-contratos')}
      style={({ pressed }) => [estilos.pildora, pressed && estilos.selectorPresionado]}
    >
      <View style={estilos.puntoLima} />
      <Texto
        variante="etiqueta"
        color={colores.sobreTinta}
        numberOfLines={1}
        style={estilos.textoPildora}
      >
        {texto}
      </Texto>
      <View style={estilos.abajo}>
        <Icono nombre="adelante" tamano={16} color={colores.sobreTinta} grosor={2} />
      </View>
    </Pressable>
  );
}

/**
 * "Ya tengo cuenta": si la activación dejó un código pendiente, se vincula al entrar. Al terminar
 * se vuelve a pedir la lista de contratos y se selecciona el contrato vinculado.
 */
export function AvisoVinculacionPendiente() {
  const vinculacion = useVincularPendiente();
  const { seleccionar } = useContratoSeleccionado();
  const refrescar = useRefrescarContratosInquilino();
  const vinculadoId = vinculacion.estado === 'vinculado' ? vinculacion.contrato.id : null;

  useEffect(() => {
    if (vinculadoId === null) return;
    seleccionar(vinculadoId);
    void refrescar();
  }, [vinculadoId, seleccionar, refrescar]);

  if (vinculacion.estado === 'vinculando') {
    return <Aviso tono="informacion" mensaje="Agregando tu contrato…" />;
  }
  if (vinculacion.estado === 'vinculado') {
    return (
      <Aviso
        tono="exito"
        mensaje={`Contrato agregado: ${vinculacion.contrato.unidad.nombre} · ${vinculacion.contrato.inmueble.direccion}.`}
      />
    );
  }
  if (vinculacion.estado === 'error') return <Aviso mensaje={vinculacion.mensaje} />;
  return null;
}

/** Texto libre del arrendador (cuenta, banco, etc.). No se guarda ni se registra; solo se copia. */
export function TarjetaRecaudo({ datos }: { datos: string | null | undefined }) {
  const [copia, setCopia] = useState<'copiado' | 'error' | null>(null);
  if (!datos) return null;

  async function copiar() {
    try {
      await Clipboard.setStringAsync(datos as string);
      setCopia('copiado');
    } catch {
      setCopia('error');
    }
  }

  return (
    <Superficie style={estilos.tarjeta}>
      <Texto variante="etiqueta" color={colores.textoSecundario}>
        Datos de recaudo
      </Texto>
      <Texto variante="cuerpo">{datos}</Texto>
      {copia === 'copiado' ? <Aviso tono="exito" mensaje="Copiado" /> : null}
      {copia === 'error' ? <Aviso mensaje="No pudimos copiar los datos." /> : null}
      <Boton titulo="Copiar" variante="secundario" ancho="completo" onPress={() => void copiar()} />
    </Superficie>
  );
}

/** Mientras carga: un bloque por sección de Mi panel, con su forma (tarjeta, accesos y tarjetas). */
export function EsqueletoMiPanel() {
  return (
    <View testID="esqueleto-mi-panel" style={estilos.esqueleto}>
      <Superficie>
        <EsqueletoCarga filas={2} />
      </Superficie>
      <EsqueletoCarga filas={1} />
      <EsqueletoCarga filas={2} />
    </View>
  );
}

/**
 * Contrato ACTIVO, de arriba abajo como la maqueta: próximo pago, cómo pagar (solo con datos de
 * recaudo), accesos, "Tus pagos" (con el estado de cuenta), "Tu contrato" y la última solicitud (si hay).
 * Las consultas extra (detalle, estado de cuenta y solicitudes) son las de siempre, con su caché: si una
 * falla, su bloque no aparece y el resto sigue.
 */
function PanelActivo({
  panel,
  contrato,
  datosRecaudo,
  periodos,
  ultimaSolicitud,
}: {
  panel: PanelContratoActivo;
  contrato: ContratoInquilinoResumen;
  datosRecaudo: string | null | undefined;
  periodos: PeriodoCuenta[] | undefined;
  ultimaSolicitud: SolicitudInquilino | undefined;
}) {
  const router = useRouter();
  const id = panel.contrato_id;
  return (
    <>
      <ProximoPago
        panel={panel}
        onReportar={() => router.push({ pathname: '/reportar-pago', params: { contratoId: id } })}
      />
      {datosRecaudo ? <ComoPagar datos={datosRecaudo} /> : null}
      <AccesosPanel
        contratoId={id}
        tipos={['contrato', 'estadoCuenta', 'documentos', 'nuevaSolicitud']}
      />
      {periodos ? <TusPagos periodos={periodos} /> : null}
      <TuContrato
        estado={panel.estado}
        diasRestantes={panel.dias_restantes}
        fechaInicio={contrato.fecha_inicio}
        fechaFin={panel.fecha_fin}
      />
      {ultimaSolicitud ? <UltimaSolicitud solicitud={ultimaSolicitud} /> : null}
    </>
  );
}

/** Contrato PROGRAMADO: cuándo empieza y los accesos de consulta; sin pago ni cómo pagar. */
function PanelProgramado({ id, panel }: { id: string; panel: PanelContratoProgramado }) {
  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.chips}>
          <ChipEstado tipo="contrato" estado="PROGRAMADO" />
        </View>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          {`Tu contrato empieza el ${formatearFechaLarga(panel.fecha_inicio)}`}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`${formatearFechaAbreviada(panel.fecha_inicio)} – ${formatearFechaAbreviada(panel.fecha_fin)}`}
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Verás tu próximo pago y cómo pagar cuando el contrato empiece.
        </Texto>
      </Superficie>
      <AccesosPanel contratoId={id} tipos={['contrato', 'documentos']} />
    </>
  );
}

/** Contrato que ya terminó: su estado y los accesos de consulta (sin pago ni solicitudes nuevas). */
function PanelFinalizado({
  id,
  estado,
}: {
  id: string;
  estado: ContratoInquilinoResumen['estado'];
}) {
  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.chips}>
          <ChipEstado tipo="contrato" estado={estado} />
        </View>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          {mensajeFinalizado(estado)}
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Puedes consultar tu contrato, tu estado de cuenta y tus documentos.
        </Texto>
      </Superficie>
      <AccesosPanel contratoId={id} tipos={['contrato', 'estadoCuenta', 'documentos']} />
    </>
  );
}

/** Cuerpo de Mi panel para el contrato elegido: las tres formas de GET /:id/panel. */
export function PanelDelContrato({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  const contratoId = contrato.id;
  // Lo que solo existe con el contrato ACTIVO (regla 11: el servidor no manda el recaudo antes).
  const activo = contrato.estado === 'ACTIVO';
  const panel = usePanelInquilino(contratoId);
  useRefrescarAlEnfocar(panel);
  const noEncontrado = useRefrescarSiNoEncontrado(panel.error);
  const datos = panel.data;
  const detalle = useContratoInquilino(contratoId, activo && !noEncontrado);
  const cuenta = useEstadoCuentaInquilino(contratoId, activo && !noEncontrado);
  const solicitudes = useMisSolicitudes(activo && !noEncontrado ? contratoId : null);
  useRefrescarAlEnfocar(cuenta);
  useRefrescarAlEnfocar(solicitudes);

  // Un 404 manda sobre cualquier dato en caché: el contrato ya no es del inquilino.
  if (noEncontrado) {
    return (
      <ContratoNoEncontrado
        textoBoton="Ver mis contratos"
        onPress={() => router.push('/mis-contratos')}
      />
    );
  }
  if (datos === undefined) {
    return panel.isPending ? (
      <EsqueletoMiPanel />
    ) : (
      <ErrorConReintento error={panel.error} onReintentar={() => void panel.refetch()} />
    );
  }

  switch (variantePanel(datos)) {
    case 'activo':
      return (
        <PanelActivo
          panel={datos as PanelContratoActivo}
          contrato={contrato}
          datosRecaudo={detalle.data?.datos_recaudo}
          periodos={cuenta.data?.periodos}
          ultimaSolicitud={solicitudes.data?.[0]}
        />
      );
    case 'programado':
      return <PanelProgramado id={contratoId} panel={datos as PanelContratoProgramado} />;
    default:
      return <PanelFinalizado id={contratoId} estado={datos.estado} />;
  }
}

function FotoEntrega({ foto }: { foto: FotoInventario }) {
  const [fallida, setFallida] = useState(false);
  const url = fallida ? null : foto.foto_url;
  return (
    <View style={estilos.foto}>
      {url ? (
        <ImagenAmpliable
          uri={url}
          descripcion={`Foto de entrega: ${foto.zona}`}
          onError={() => setFallida(true)}
        >
          <Image
            source={{
              uri: url,
              cacheKey: claveCachePortada(`inventario:${foto.id}`, url) ?? undefined,
            }}
            contentFit="cover"
            accessibilityLabel={`Foto de entrega: ${foto.zona}`}
            accessible
            onError={() => setFallida(true)}
            style={estilos.imagen}
          />
        </ImagenAmpliable>
      ) : (
        <View style={[estilos.imagen, estilos.sinFoto]}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Foto no disponible
          </Texto>
        </View>
      )}
      <Texto variante="etiqueta">{foto.zona}</Texto>
    </View>
  );
}

/** Cuadrícula de fotos de entrega con su zona. Una URL nula o caída no rompe nada. */
export function FotosEntrega({ fotos }: { fotos: FotoInventario[] }) {
  if (fotos.length === 0) return null;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Fotos de entrega
      </Texto>
      <View style={estilos.cuadricula}>
        {fotos.map((f) => (
          <FotoEntrega key={f.id} foto={f} />
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.xs },
  esqueleto: { gap: espaciado.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  selectorPresionado: { backgroundColor: blancoAlfa(0.16) },
  pildora: {
    minHeight: 44,
    marginTop: espaciado.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.sm,
    borderRadius: radios.pildora,
    borderWidth: 1,
    borderColor: blancoAlfa(0.2),
    backgroundColor: blancoAlfa(0.06),
  },
  puntoLima: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.lima },
  textoPildora: { flexShrink: 1 },
  abajo: { transform: [{ rotate: '90deg' }] },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  foto: { width: '48%', gap: 4 },
  imagen: { width: '100%', aspectRatio: 4 / 3, borderRadius: radios.medio },
  sinFoto: {
    backgroundColor: tintaAlfa(0.06),
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xs,
  },
});
