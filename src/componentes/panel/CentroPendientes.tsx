import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ContratoPendiente, IncrementoDisponible, PendientesPanel } from '../../api/panel';
import { cantidadDeMas } from '../../panel/presentacion';
import { destinosPanel } from '../../panel/destinos';
import { colores, coloresEstado, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { FilaLista } from '../FilaLista';
import type { NombreIcono } from '../iconos/Icono';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

const MENSAJE_IPC_FALTANTE = 'Falta el IPC del año anterior: aún no se puede aplicar.';

/** Un elemento de una lista de contratos (unidad, inmueble y una línea de detalle); navega si tiene destino. */
function FilaContrato({
  unidad,
  inmueble,
  linea,
  advertencia,
  destino,
}: {
  unidad: string;
  inmueble: string;
  linea: string;
  advertencia?: string;
  destino: Href | null;
}) {
  const router = useRouter();
  return (
    <FilaLista
      titulo={unidad}
      separador
      conChevron={destino !== null}
      onPress={destino ? () => router.push(destino) : undefined}
      detalle={
        <View style={estilos.detalleFila}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {inmueble}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {linea}
          </Texto>
          {advertencia ? (
            <Texto variante="secundario" color={coloresEstado.advertencia.texto}>
              {advertencia}
            </Texto>
          ) : null}
        </View>
      }
    />
  );
}

/**
 * Una sección del centro de pendientes: cabecera con el conteo del servidor y, si trae elementos, hasta
 * 5 filas (el servidor ya limita la lista; `cantidad` es el total). Sin pendientes no se oculta: dice
 * "Sin pendientes". `onPress` solo cuenta con algo por resolver.
 */
function SeccionPendiente({
  icono,
  titulo,
  cantidad,
  subtitulo,
  onPress,
  mostrados = 0,
  separador,
  children,
}: {
  icono: NombreIcono;
  titulo: string;
  cantidad: number;
  subtitulo?: string;
  onPress?: () => void;
  mostrados?: number;
  separador: boolean;
  children?: ReactNode;
}) {
  const hay = cantidad > 0;
  const accionable = hay && onPress !== undefined;
  const mas = cantidadDeMas(cantidad, mostrados);
  return (
    <View>
      <FilaLista
        icono={icono}
        titulo={titulo}
        subtitulo={hay ? subtitulo : 'Sin pendientes'}
        valor={String(cantidad)}
        separador={separador}
        conChevron={accionable}
        onPress={accionable ? onPress : undefined}
      />
      {children}
      {mas ? (
        <Texto variante="secundario" color={colores.textoSecundario} style={estilos.mas}>
          {mas}
        </Texto>
      ) : null}
    </View>
  );
}

/**
 * Centro de pendientes del Panel: comprobantes por validar, mantenimientos pendientes, contratos por
 * vencer (30 días), incrementos disponibles y terminaciones por confirmar. Cada uno lleva a la pantalla
 * donde se resuelve; las cabeceras de contratos no navegan (lo hacen sus elementos).
 */
export function CentroPendientes({ pendientes }: { pendientes: PendientesPanel }) {
  const router = useRouter();
  const { contratos_por_vencer: porVencer, incrementos_disponibles: incrementos } = pendientes;
  const { terminaciones_por_confirmar: terminaciones } = pendientes;

  return (
    <View style={estilos.centro}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Pendientes
      </Texto>
      <Superficie relleno="ninguno">
        <SeccionPendiente
          icono="comprobante"
          titulo="Comprobantes por validar"
          subtitulo="Pagos en revisión"
          cantidad={pendientes.comprobantes_por_validar}
          onPress={() => router.push(destinosPanel.comprobantes())}
          separador={false}
        />
        <SeccionPendiente
          icono="mantenimiento"
          titulo="Mantenimientos pendientes"
          subtitulo="Solicitudes sin atender"
          cantidad={pendientes.mantenimientos_pendientes}
          onPress={() => router.push(destinosPanel.mantenimientos())}
          separador
        />
        <SeccionPendiente
          icono="calendario"
          titulo="Contratos por vencer (30 días)"
          cantidad={porVencer.cantidad}
          mostrados={porVencer.contratos.length}
          separador
        >
          {porVencer.contratos.map((c: ContratoPendiente) => (
            <FilaContrato
              key={c.contrato_id || `${c.unidad}-${c.fecha_fin}`}
              unidad={c.unidad}
              inmueble={c.inmueble}
              linea={`Vence el ${formatearFechaCorta(c.fecha_fin)}`}
              destino={destinosPanel.porVencer(c.contrato_id)}
            />
          ))}
        </SeccionPendiente>
        <SeccionPendiente
          icono="contratos"
          titulo="Incrementos disponibles"
          cantidad={incrementos.cantidad}
          mostrados={incrementos.contratos.length}
          separador
        >
          {incrementos.contratos.map((c: IncrementoDisponible) => (
            <FilaContrato
              key={c.contrato_id || `${c.unidad}-${c.disponible_desde}`}
              unidad={c.unidad}
              inmueble={c.inmueble}
              linea={`Disponible desde ${formatearFechaCorta(c.disponible_desde)}`}
              advertencia={c.ipc_faltante ? MENSAJE_IPC_FALTANTE : undefined}
              destino={destinosPanel.incremento(c.contrato_id)}
            />
          ))}
        </SeccionPendiente>
        <SeccionPendiente
          icono="alerta"
          titulo="Terminaciones por confirmar"
          cantidad={terminaciones.cantidad}
          mostrados={terminaciones.contratos.length}
          separador
        >
          {terminaciones.contratos.map((c: ContratoPendiente) => (
            <FilaContrato
              key={c.contrato_id || `${c.unidad}-${c.fecha_fin}`}
              unidad={c.unidad}
              inmueble={c.inmueble}
              linea={`Fin del contrato: ${formatearFechaCorta(c.fecha_fin)}`}
              destino={destinosPanel.terminacion(c.contrato_id)}
            />
          ))}
        </SeccionPendiente>
      </Superficie>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { gap: espaciado.sm },
  detalleFila: { width: '100%', gap: 2 },
  mas: { paddingHorizontal: espaciado.md, paddingBottom: espaciado.sm },
});
