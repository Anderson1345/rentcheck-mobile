// Piezas del portal del inquilino (E6-A, solo lectura): selector de contrato, panel por variante,
// datos de recaudo, fotos de entrega y los estados de error. Todo valor (estado de pago, plazos,
// montos) es el que responde el servidor: la app no calcula nada.

import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FotoInventario } from '../../api/inventario';
import type {
  ContratoInquilinoResumen,
  PanelContratoActivo,
  PanelContratoProgramado,
} from '../../api/inquilino';
import { mensajeDeError } from '../../api/errores';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import {
  useContratoInquilino,
  usePanelInquilino,
  useRefrescarContratosInquilino,
  useRefrescarSiNoEncontrado,
} from '../../consultas/inquilino';
import { mesDePeriodo } from '../../contratos/acciones';
import { claveCachePortada } from '../../inmuebles/claveImagen';
import { useContratoSeleccionado } from '../../inquilino/ContratoSeleccionado';
import {
  descripcionContrato,
  mensajeFinalizado,
  textoDiasRestantes,
  textoVencidos,
  variantePanel,
} from '../../inquilino/seleccion';
import { useVincularPendiente } from '../../sesion/useVincularPendiente';
import { blancoAlfa, colores, espaciado, radios, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta, formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { Icono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;

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

/** Cabecera tocable de Mi panel: unidad · dirección y estado; abre "Mis contratos". */
export function SelectorContrato({ contrato }: { contrato: ContratoInquilinoResumen }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cambiar de contrato. ${descripcionContrato(contrato)}`}
      onPress={() => router.push('/mis-contratos')}
      style={({ pressed }) => [estilos.selector, pressed && estilos.selectorPresionado]}
    >
      <View style={estilos.selectorTextos}>
        <Texto variante="cuerpoFuerte" color={colores.sobreTinta} numberOfLines={2}>
          {descripcionContrato(contrato)}
        </Texto>
        <View style={estilos.chips}>
          <ChipEstado tipo="contrato" estado={contrato.estado} sobre="tinta" />
        </View>
      </View>
      <Icono nombre="adelante" tamano={20} color={blancoAlfa(0.64)} grosor={1.8} />
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

function Acceso({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  return <Boton titulo={titulo} variante="secundario" ancho="completo" onPress={onPress} />;
}

function PanelActivo({
  panel,
  datosRecaudo,
}: {
  panel: PanelContratoActivo;
  datosRecaudo: string | null | undefined;
}) {
  const router = useRouter();
  const id = panel.contrato_id;
  const proximo = panel.proximo_periodo;
  const vencidos = panel.periodos_vencidos;
  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Estado de pago
        </Texto>
        <ChipEstado tipo="pagoContrato" estado={ESTADO_PAGO[panel.estado_pago]} />
        <Texto variante="etiqueta" color={colores.textoSecundario} style={estilos.separado}>
          Canon vigente
        </Texto>
        <Texto variante="cifraMedia" cifras>
          {centavosAPesosTexto(panel.canon_vigente_centavos)}
        </Texto>
        <Texto variante="cuerpo">{textoDiasRestantes(panel.dias_restantes)}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Termina el ${formatearFechaCorta(panel.fecha_fin)}`}
        </Texto>
      </Superficie>

      <Superficie style={estilos.tarjeta}>
        {proximo ? (
          <>
            <Texto variante="etiqueta" color={colores.textoSecundario}>
              Próximo período
            </Texto>
            <Texto variante="tituloSeccion">{mesDePeriodo(proximo.periodo)}</Texto>
            <Texto variante="cuerpo">{centavosAPesosTexto(proximo.monto_centavos)}</Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Fecha límite ${formatearFechaCorta(proximo.fecha_limite)}`}
            </Texto>
            <View style={estilos.chips}>
              <ChipEstado tipo="periodo" estado={proximo.estado} />
            </View>
          </>
        ) : (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Sin períodos pendientes
          </Texto>
        )}
      </Superficie>

      {vencidos.cantidad > 0 ? (
        <Superficie style={estilos.tarjeta}>
          <Texto variante="etiqueta" color={colores.textoSecundario}>
            Períodos vencidos
          </Texto>
          <Texto variante="cuerpoFuerte">
            {textoVencidos(vencidos.cantidad, vencidos.total_pendiente_centavos)}
          </Texto>
        </Superficie>
      ) : null}

      <TarjetaRecaudo datos={datosRecaudo} />

      <View style={estilos.grupo}>
        <Acceso
          titulo="Ver mi contrato"
          onPress={() => router.push({ pathname: '/mi-contrato/[id]', params: { id } })}
        />
        <Acceso
          titulo="Estado de cuenta"
          onPress={() =>
            router.push({ pathname: '/mi-contrato/[id]/estado-cuenta', params: { id } })
          }
        />
        <Acceso
          titulo="Mis documentos"
          onPress={() =>
            router.push({
              pathname: '/mi-contrato/[id]',
              params: { id, seccion: 'documentos' },
            })
          }
        />
      </View>
    </>
  );
}

function PanelProgramado({ id, panel }: { id: string; panel: PanelContratoProgramado }) {
  const router = useRouter();
  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <ChipEstado tipo="contrato" estado="PROGRAMADO" />
        <Texto variante="tituloSeccion" accessibilityRole="header">
          {`Tu contrato empieza el ${formatearFechaLarga(panel.fecha_inicio)}`}
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          Verás los datos de pago cuando el contrato empiece.
        </Texto>
      </Superficie>
      <View style={estilos.grupo}>
        <Acceso
          titulo="Ver mi contrato"
          onPress={() => router.push({ pathname: '/mi-contrato/[id]', params: { id } })}
        />
        <Acceso
          titulo="Mis documentos"
          onPress={() =>
            router.push({
              pathname: '/mi-contrato/[id]',
              params: { id, seccion: 'documentos' },
            })
          }
        />
      </View>
    </>
  );
}

/** Cuerpo de Mi panel para el contrato elegido: las tres formas de GET /:id/panel. */
export function PanelDelContrato({
  contratoId,
  estado,
}: {
  contratoId: string;
  /** Estado que dice la lista de contratos: con ACTIVO se pide el recaudo junto con el panel. */
  estado: ContratoInquilinoResumen['estado'];
}) {
  const router = useRouter();
  const panel = usePanelInquilino(contratoId);
  useRefrescarAlEnfocar(panel);
  const noEncontrado = useRefrescarSiNoEncontrado(panel.error);
  const datos = panel.data;
  // El recaudo solo se pide con el contrato ACTIVO (regla 11: el servidor no lo manda antes).
  const detalle = useContratoInquilino(contratoId, estado === 'ACTIVO' && !noEncontrado);

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
      <EsqueletoCarga filas={3} />
    ) : (
      <ErrorConReintento error={panel.error} onReintentar={() => void panel.refetch()} />
    );
  }

  switch (variantePanel(datos)) {
    case 'activo':
      return (
        <PanelActivo
          panel={datos as PanelContratoActivo}
          datosRecaudo={detalle.data?.datos_recaudo}
        />
      );
    case 'programado':
      return <PanelProgramado id={contratoId} panel={datos as PanelContratoProgramado} />;
    default:
      return (
        <>
          <Superficie style={estilos.tarjeta}>
            <Texto variante="tituloSeccion" accessibilityRole="header">
              {mensajeFinalizado(datos.estado)}
            </Texto>
          </Superficie>
          <Acceso
            titulo="Ver mi contrato"
            onPress={() =>
              router.push({ pathname: '/mi-contrato/[id]', params: { id: contratoId } })
            }
          />
        </>
      );
  }
}

function FotoEntrega({ foto }: { foto: FotoInventario }) {
  const [fallida, setFallida] = useState(false);
  const url = fallida ? null : foto.foto_url;
  return (
    <View style={estilos.foto}>
      {url ? (
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
  separado: { marginTop: espaciado.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  selector: {
    minHeight: 56,
    marginTop: espaciado.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radios.grande,
    backgroundColor: blancoAlfa(0.1),
  },
  selectorPresionado: { backgroundColor: blancoAlfa(0.16) },
  selectorTextos: { flex: 1, gap: 6 },
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
