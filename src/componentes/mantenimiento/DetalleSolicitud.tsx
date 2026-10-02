// Detalle de una solicitud para el inquilino: solo lectura. Qué pidió, con qué urgencia, en qué estado
// va (con una frase) y el adjunto. No hay acciones: el servidor no deja cancelar, editar ni agregar
// fotos, y solo el arrendador cambia el estado.

import { StyleSheet, View } from 'react-native';

import type { SolicitudInquilino } from '../../api/mantenimiento';
import { FRASE_ESTADO } from '../../mantenimiento/reglas';
import { colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { ChipEstado } from '../ChipEstado';
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
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.chips}>
          <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
          <ChipEstado tipo="urgencia" estado={solicitud.urgencia} />
        </View>
        <Texto variante="cuerpo">{solicitud.descripcion}</Texto>
        <Texto variante="cuerpoFuerte">{FRASE_ESTADO[solicitud.estado]}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Creada el ${formatearFechaCorta(solicitud.creado_en)}`}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Última actualización: ${formatearFechaCorta(solicitud.actualizado_en)}`}
        </Texto>
      </Superficie>

      {conAdjunto ? (
        <Superficie style={estilos.tarjeta}>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            Adjunto
          </Texto>
          <AdjuntoSolicitud
            solicitudId={solicitud.id}
            tipo={solicitud.adjunto_tipo}
            url={solicitud.adjunto_url}
            obtenerFresco={refrescar}
          />
        </Superficie>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: espaciado.sm },
});
