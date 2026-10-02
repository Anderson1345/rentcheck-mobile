// Detalle de una solicitud para el arrendador: qué pidió el inquilino, de qué unidad, en qué estado va
// y su adjunto, con las acciones que permite el estado (PENDIENTE → en proceso o resuelta; EN_PROCESO
// → resuelta; RESUELTO → ninguna). Todo valor lo manda el servidor; la app confirma y avisa.

import { StyleSheet, View } from 'react-native';

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
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { type AdjuntoFresco, AdjuntoSolicitud } from './AdjuntoSolicitud';

interface Props {
  solicitud: SolicitudArrendador;
  /** Vuelve a pedir la solicitud (para tener la URL del adjunto fresca). */
  refrescar: () => Promise<AdjuntoFresco | null | undefined>;
}

const ocupado = (fase: string) => fase === 'enviando' || fase === 'verificando';

function Acciones({ solicitud }: { solicitud: SolicitudArrendador }) {
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

  return (
    <View style={estilos.grupo}>
      {iniciar.fase === 'exito' ? (
        <Aviso tono="exito" mensaje="Solicitud marcada en proceso." />
      ) : null}
      {resolver.fase === 'exito' ? (
        <Aviso tono="exito" mensaje="Solicitud marcada como resuelta." />
      ) : null}

      {acciones.length === 0 ? (
        <Texto variante="cuerpoFuerte">{TEXTO_YA_RESUELTA}</Texto>
      ) : (
        acciones.map(({ accion, titulo }) => {
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
        })
      )}

      {/* Fuera del bloque de botones: un 409 refresca la solicitud y el mensaje debe seguir a la vista. */}
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
    </View>
  );
}

export function DetalleSolicitudArrendador({ solicitud, refrescar }: Props) {
  const conAdjunto = solicitud.adjunto_tipo !== null || solicitud.adjunto_url !== null;
  const { inquilino, unidad } = solicitud;
  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <View style={estilos.chips}>
          <ChipEstado tipo="mantenimiento" estado={solicitud.estado} />
          <ChipEstado tipo="urgencia" estado={solicitud.urgencia} />
        </View>
        <Texto variante="cuerpo">{solicitud.descripcion}</Texto>
        <Texto variante="cuerpoFuerte">{FRASE_ESTADO_ARRENDADOR[solicitud.estado]}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Creada el ${formatearFechaCorta(solicitud.creado_en)}`}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {`Última actualización: ${formatearFechaCorta(solicitud.actualizado_en)}`}
        </Texto>
      </Superficie>

      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Unidad
        </Texto>
        <Texto variante="cuerpo">{`${unidad.nombre} · ${unidad.inmueble.direccion}`}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {unidad.inmueble.ciudad}
        </Texto>
      </Superficie>

      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Inquilino
        </Texto>
        <Texto variante="cuerpo">{inquilino.nombre ?? 'Inquilino sin datos'}</Texto>
        {inquilino.telefono ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Teléfono ${inquilino.telefono}`}
          </Texto>
        ) : null}
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

      <Acciones solicitud={solicitud} />
    </>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: espaciado.sm },
});
