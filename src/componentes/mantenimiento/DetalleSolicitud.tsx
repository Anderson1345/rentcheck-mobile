// Detalle de una solicitud para el inquilino: solo lectura. Arriba, el protagonista (R4-A): en qué
// estado va (con su frase), con qué urgencia, qué pidió y las fechas; debajo, el adjunto (la foto se
// amplía). No hay acciones: el servidor no deja cancelar, editar ni agregar fotos, solo el arrendador
// cambia el estado y la API no trae respuesta ni historial del arrendador.

import { StyleSheet, View } from 'react-native';

import type { SolicitudInquilino } from '../../api/mantenimiento';
import { FRASE_ESTADO } from '../../mantenimiento/reglas';
import { colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { ChipEstado } from '../ChipEstado';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { AdjuntoSolicitud, type AdjuntoFresco } from './AdjuntoSolicitud';

interface Props {
  solicitud: SolicitudInquilino;
  /** Vuelve a pedir la solicitud (para tener la URL del adjunto fresca). */
  refrescar: () => Promise<AdjuntoFresco | null | undefined>;
}

export function DetalleSolicitud({ solicitud, refrescar }: Props) {
  const conAdjunto = solicitud.adjunto_tipo !== null || solicitud.adjunto_url !== null;
  return (
    <>
      <View testID="protagonista-solicitud">
        <Superficie style={estilos.protagonista}>
          <View style={estilos.chips}>
            <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
            <ChipEstado tipo="urgencia" estado={solicitud.urgencia} />
          </View>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            {FRASE_ESTADO[solicitud.estado]}
          </Texto>
          <Texto variante="cuerpo">{solicitud.descripcion}</Texto>
          <View style={estilos.fechas}>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Creada el ${formatearFechaCorta(solicitud.creado_en)}`}
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`Última actualización: ${formatearFechaCorta(solicitud.actualizado_en)}`}
            </Texto>
          </View>
        </Superficie>
      </View>

      {conAdjunto ? (
        <View style={estilos.seccion}>
          <EncabezadoSeccion titulo="Adjunto" />
          <Superficie style={estilos.tarjeta}>
            <AdjuntoSolicitud
              solicitudId={solicitud.id}
              tipo={solicitud.adjunto_tipo}
              url={solicitud.adjunto_url}
              obtenerFresco={refrescar}
            />
          </Superficie>
        </View>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  protagonista: { gap: espaciado.sm },
  fechas: { gap: 2 },
  seccion: { gap: espaciado.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: espaciado.sm },
});
