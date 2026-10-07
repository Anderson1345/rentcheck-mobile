// Detalle de una solicitud para el arrendador: qué pidió el inquilino, de qué unidad, en qué estado va
// y su adjunto, con las acciones que permite el estado (PENDIENTE → en proceso o resuelta; EN_PROCESO
// → resuelta; RESUELTO → ninguna). Todo valor lo manda el servidor; la app confirma y avisa. R4-C: el
// protagonista arriba, el inquilino con "Llamar" (tel:) y el cambio de estado en la barra fija.

import { Linking, StyleSheet, View } from 'react-native';

import { cambiarEstadoSolicitud, type SolicitudArrendador } from '../../api/mantenimiento';
import { useAccionSolicitud } from '../../consultas/mantenimiento';
import {
  type AccionEstado,
  accionesDeEstado,
  FRASE_ESTADO_ARRENDADOR,
  textoConfirmacion,
  TEXTO_YA_RESUELTA,
} from '../../mantenimiento/reglas';
import { colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { ChipEstado } from '../ChipEstado';
import { confirmarAccion, MensajeAccion } from '../contratos/AccionesContrato';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { PantallaPila } from '../PantallaPila';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { type AdjuntoFresco, AdjuntoSolicitud } from './AdjuntoSolicitud';

interface Props {
  solicitud: SolicitudArrendador;
  /** Vuelve a pedir la solicitud (para tener la URL del adjunto fresca). */
  refrescar: () => Promise<AdjuntoFresco | null | undefined>;
}

const ocupado = (fase: string) => fase === 'enviando' || fase === 'verificando';

/**
 * El cambio de estado: los botones que permite el estado y lo que pasó con el envío (éxito, error,
 * verificación). Va en la barra fija; con la solicitud resuelta no hay barra.
 */
function useAcciones(solicitud: SolicitudArrendador) {
  const iniciar = useAccionSolicitud(solicitud.id, 'iniciarSolicitud');
  const resolver = useAccionSolicitud(solicitud.id, 'resolverSolicitud');
  const trabajando = ocupado(iniciar.fase) || ocupado(resolver.fase);
  const acciones = accionesDeEstado(solicitud.estado);
  const resumen = `${solicitud.unidad.nombre} · ${solicitud.unidad.inmueble.direccion}.`;

  function pedir(accion: AccionEstado) {
    const texto = textoConfirmacion(accion);
    confirmarAccion(texto.titulo, `${resumen} ${texto.mensaje}`, texto.confirmar, () => {
      if (accion === 'iniciar') {
        void iniciar.iniciar(() => cambiarEstadoSolicitud(solicitud.id, 'EN_PROCESO'));
      } else {
        void resolver.iniciar(() => cambiarEstadoSolicitud(solicitud.id, 'RESUELTO'));
      }
    });
  }

  // Fuera de los botones: un 409 refresca la solicitud y el mensaje debe seguir a la vista.
  const mensajes = (
    <>
      {iniciar.fase === 'exito' ? (
        <Aviso tono="exito" mensaje="Solicitud marcada en proceso." />
      ) : null}
      {resolver.fase === 'exito' ? (
        <Aviso tono="exito" mensaje="Solicitud marcada como resuelta." />
      ) : null}
      <MensajeAccion
        fase={iniciar.fase}
        error={iniciar.error}
        onVerificar={() => void iniciar.verificar()}
      />
      <MensajeAccion
        fase={resolver.fase}
        error={resolver.error}
        onVerificar={() => void resolver.verificar()}
      />
    </>
  );

  const barra =
    acciones.length === 0 ? null : (
      <View style={estilos.grupo}>
        {mensajes}
        {acciones.map(({ accion, titulo }) => {
          const actual = accion === 'iniciar' ? iniciar : resolver;
          return (
            <Boton
              key={accion}
              titulo={titulo}
              tituloCargando="Enviando…"
              cargando={ocupado(actual.fase)}
              deshabilitado={trabajando && !ocupado(actual.fase)}
              variante={accion === 'resolver' ? 'acento' : 'secundario'}
              ancho="completo"
              onPress={() => pedir(accion)}
            />
          );
        })}
      </View>
    );

  // Resuelta: no hay barra; el texto y lo que pasó con el último envío van en el contenido.
  const enContenido =
    acciones.length === 0 ? (
      <View style={estilos.grupo}>
        <Texto variante="cuerpoFuerte">{TEXTO_YA_RESUELTA}</Texto>
        {mensajes}
      </View>
    ) : null;

  return { barra, enContenido };
}

export function DetalleSolicitudArrendador({ solicitud, refrescar }: Props) {
  const conAdjunto = solicitud.adjunto_tipo !== null || solicitud.adjunto_url !== null;
  const { inquilino, unidad } = solicitud;
  const { barra, enContenido } = useAcciones(solicitud);
  const telefono = inquilino.telefono;
  return (
    <PantallaPila accionFija={barra}>
      <View testID="protagonista-solicitud">
        <Superficie style={estilos.protagonista}>
          <View style={estilos.chips}>
            <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
            <ChipEstado tipo="urgencia" estado={solicitud.urgencia} />
          </View>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            {FRASE_ESTADO_ARRENDADOR[solicitud.estado]}
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

      {enContenido}

      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Unidad" />
        <Superficie style={estilos.tarjeta}>
          <Texto variante="cuerpoFuerte">{`${unidad.nombre} · ${unidad.inmueble.direccion}`}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {unidad.inmueble.ciudad}
          </Texto>
        </Superficie>
      </View>

      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Inquilino" />
        <Superficie style={estilos.inquilino}>
          <View style={estilos.textos}>
            <Texto variante="cuerpoFuerte">{inquilino.nombre ?? 'Inquilino sin datos'}</Texto>
            {telefono ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                {`Teléfono ${telefono}`}
              </Texto>
            ) : null}
          </View>
          {telefono ? (
            <Boton
              titulo="Llamar"
              variante="secundario"
              ancho="contenido"
              onPress={() => void Linking.openURL(`tel:${telefono}`).catch(() => undefined)}
            />
          ) : null}
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
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.xs },
  protagonista: { gap: espaciado.sm },
  fechas: { gap: 2 },
  seccion: { gap: espaciado.xs },
  inquilino: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textos: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: espaciado.sm },
});
