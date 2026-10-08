// Detalle de un pago para el arrendador: quién, qué período, esperado vs. reportado, comprobante y, si
// el pago está PENDIENTE, aprobar o rechazar con motivo. Todo valor (estado del período, saldo, motivo
// del rechazo) lo manda el servidor; la app solo lo presenta y avisa. R4-C: protagonista arriba (lo
// reportado frente a lo esperado) y "Aprobar" / "Rechazar" en la barra fija; ya resuelto, sin barra.

import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  aprobarPago,
  type MotivoRechazoPago,
  type PagoRespuesta,
  rechazarPago,
} from '../../api/pagos';
import { useAccionPago } from '../../consultas/pagos';
import { mesDePeriodo } from '../../contratos/acciones';
import {
  AVISO_APROBAR_MAYOR,
  AVISO_APROBAR_PARCIAL,
  comparacionDePago,
  efectoDeAprobar,
  MAXIMO_MENSAJE_RECHAZO,
  MOTIVOS_RECHAZO,
  textoMotivoRechazo,
  validarRechazo,
} from '../../pagos/reglas';
import { colores, espaciado, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoTexto } from '../CampoTexto';
import { ChipEstado } from '../ChipEstado';
import { confirmarAccion, MensajeAccion, OpcionesRadio } from '../contratos/AccionesContrato';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { PantallaPila } from '../PantallaPila';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { ComprobantePago } from './ComprobantePago';

interface Props {
  pago: PagoRespuesta;
  /** Vuelve a pedir el pago (para tener la URL del comprobante fresca). */
  refrescar: () => Promise<PagoRespuesta | undefined>;
  alVolver: () => void;
}

const ocupado = (fase: string) => fase === 'enviando' || fase === 'verificando';

function Linea({ texto, fuerte = false }: { texto: string; fuerte?: boolean }) {
  return <Texto variante={fuerte ? 'cuerpoFuerte' : 'cuerpo'}>{texto}</Texto>;
}

function signo(centavos: number): string {
  return centavos > 0 ? `+${centavosAPesosTexto(centavos)}` : centavosAPesosTexto(centavos);
}

/** "Esperado $ 600.000", con lo que falta o sobra si el monto reportado difiere. */
function textoEsperado(saldo: number, diferencia: number): string {
  const base = `Esperado ${centavosAPesosTexto(saldo)}`;
  if (diferencia < 0) return `${base} · faltan ${centavosAPesosTexto(-diferencia)}`;
  if (diferencia > 0) return `${base} · ${centavosAPesosTexto(diferencia)} de más`;
  return base;
}

/**
 * Protagonista: el estado, el monto reportado en grande frente a lo esperado del período (solo en
 * revisión: ya resuelto, el saldo de hoy no dice nada de ese pago), quién, qué unidad, qué mes y cuándo
 * lo reportó, el estado del período y, si se rechazó, el motivo.
 */
function Protagonista({ pago }: { pago: PagoRespuesta }) {
  const { inquilino, unidad } = pago.contrato;
  const comparacion = pago.estado === 'PENDIENTE' ? comparacionDePago(pago) : null;
  const rechazo =
    pago.estado === 'RECHAZADO'
      ? textoMotivoRechazo(pago.motivo_rechazo, pago.mensaje_rechazo)
      : null;
  return (
    <View testID="protagonista-pago">
      <Superficie style={estilos.protagonista}>
        <View style={estilos.fila}>
          <ChipEstado tipo="pago" estado={pago.estado} />
        </View>
        <View>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Monto reportado
          </Texto>
          <Texto variante="cifraProtagonista" cifras numberOfLines={1} adjustsFontSizeToFit>
            {centavosAPesosTexto(pago.monto_centavos)}
          </Texto>
          {comparacion ? (
            <Texto variante="cuerpoFuerte" color={colores.textoFuerte}>
              {textoEsperado(comparacion.saldo, comparacion.diferencia)}
            </Texto>
          ) : null}
        </View>
        <View style={estilos.separador} />
        <View style={estilos.datos}>
          <Texto variante="cuerpoFuerte">{inquilino.nombre}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`Teléfono ${inquilino.telefono}`}
          </Texto>
          <Texto variante="cuerpo">{`${unidad.nombre} · ${unidad.inmueble.direccion}`}</Texto>
          <Texto variante="cuerpo">
            {`${mesDePeriodo(pago.periodo)} · reportado el ${formatearFechaCorta(pago.fecha_reportada)}`}
          </Texto>
        </View>
        {pago.periodo_cuenta ? (
          <View style={estilos.fila}>
            <Texto variante="secundario" color={colores.textoSecundario}>
              Estado del período
            </Texto>
            <ChipEstado tipo="periodo" estado={pago.periodo_cuenta.estado} />
          </View>
        ) : (
          <Texto variante="secundario" color={colores.textoSecundario}>
            No hay datos del período
          </Texto>
        )}
        {rechazo?.motivo ? <Linea texto={rechazo.motivo} fuerte /> : null}
        {rechazo?.mensaje ? <Linea texto={rechazo.mensaje} /> : null}
      </Superficie>
    </View>
  );
}

/** Esperado vs. reportado. Completo con el pago PENDIENTE; ya procesado no tiene sentido hablar de saldo. */
function Comparacion({ pago }: { pago: PagoRespuesta }) {
  const c = comparacionDePago(pago);
  if (!c) return null;
  const pendiente = pago.estado === 'PENDIENTE';
  return (
    <View style={estilos.seccion}>
      <EncabezadoSeccion titulo="Esperado vs. reportado" />
      <Superficie style={estilos.tarjeta}>
        <Linea texto={`Canon del período: ${centavosAPesosTexto(c.canon)}`} />
        <Linea texto={`Ya aprobado: ${centavosAPesosTexto(c.aprobado)}`} />
        {pendiente ? <Linea texto={`Saldo esperado: ${centavosAPesosTexto(c.saldo)}`} /> : null}
        <Linea texto={`Monto reportado: ${centavosAPesosTexto(c.reportado)}`} fuerte />
        {pendiente ? <Linea texto={`Diferencia: ${signo(c.diferencia)}`} /> : null}
        {pendiente && c.aviso === 'parcial' ? (
          <Aviso tono="advertencia" mensaje={AVISO_APROBAR_PARCIAL} />
        ) : null}
        {pendiente && c.aviso === 'mayor' ? (
          <Aviso tono="informacion" mensaje={AVISO_APROBAR_MAYOR} />
        ) : null}
      </Superficie>
    </View>
  );
}

/**
 * Aprobar y rechazar. Lo que se toca va en la barra fija: "Aprobar pago" (principal) y "Rechazar pago";
 * con el formulario de rechazo abierto, "Confirmar rechazo" y "Cancelar". El formulario va en el
 * contenido. Ya resuelto no hay barra; un 409 o un "sin respuesta" sigue a la vista en el contenido.
 */
function useAcciones(pago: PagoRespuesta, alVolver: () => void) {
  const aprobar = useAccionPago(pago.id, 'aprobarPago');
  const rechazar = useAccionPago(pago.id, 'rechazarPago');
  const [formulario, setFormulario] = useState(false);
  const [motivo, setMotivo] = useState<MotivoRechazoPago | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const pendiente = pago.estado === 'PENDIENTE';
  const trabajando = ocupado(aprobar.fase) || ocupado(rechazar.fase);
  const terminado = aprobar.fase === 'exito' || rechazar.fase === 'exito';
  const inquilino = pago.contrato.inquilino.nombre;
  const resumen = `${inquilino}. Período: ${mesDePeriodo(pago.periodo)}. Monto: ${centavosAPesosTexto(pago.monto_centavos)}.`;

  function pedirAprobar() {
    const efecto = efectoDeAprobar(pago);
    confirmarAccion(
      'Aprobar pago',
      efecto
        ? `${resumen} El período quedará ${efecto === 'PAGADO' ? 'Pagado' : 'Parcial'}.`
        : resumen,
      'Aprobar',
      () => void aprobar.iniciar(() => aprobarPago(pago.id)),
    );
  }

  function pedirRechazar() {
    const validado = validarRechazo(motivo, mensaje);
    if (validado.error !== undefined) {
      setErrorFormulario(validado.error);
      return;
    }
    setErrorFormulario(null);
    const cuerpo = validado.cuerpo;
    const etiqueta = MOTIVOS_RECHAZO.find((m) => m.valor === cuerpo.motivo)?.etiqueta ?? '';
    confirmarAccion(
      'Rechazar pago',
      `${resumen} Motivo: ${etiqueta}${cuerpo.mensaje ? `. Mensaje: ${cuerpo.mensaje}` : ''}. El inquilino verá el motivo.`,
      'Rechazar',
      () => void rechazar.iniciar(() => rechazarPago(pago.id, cuerpo)),
      true,
    );
  }

  const mensajes = (
    <>
      {/* Fuera de los botones: un 409 refresca el pago y el mensaje debe seguir a la vista. */}
      <MensajeAccion
        fase={aprobar.fase}
        error={aprobar.error}
        onVerificar={() => void aprobar.verificar()}
      />
      <MensajeAccion
        fase={rechazar.fase}
        error={rechazar.error}
        onVerificar={() => void rechazar.verificar()}
      />
    </>
  );

  let barra: ReactNode = null;
  if (terminado) {
    barra = (
      <View style={estilos.grupo}>
        {aprobar.fase === 'exito' ? <Aviso tono="exito" mensaje="Pago aprobado." /> : null}
        {rechazar.fase === 'exito' ? <Aviso tono="exito" mensaje="Pago rechazado." /> : null}
        <Boton titulo="Volver a la lista" ancho="completo" onPress={alVolver} />
      </View>
    );
  } else if (pendiente && formulario) {
    barra = (
      <View style={estilos.grupo}>
        {mensajes}
        <Boton
          titulo="Confirmar rechazo"
          tituloCargando="Rechazando…"
          cargando={ocupado(rechazar.fase)}
          deshabilitado={trabajando && !ocupado(rechazar.fase)}
          variante="destructivo"
          ancho="completo"
          onPress={pedirRechazar}
        />
        <Boton
          titulo="Cancelar"
          variante="secundario"
          ancho="completo"
          deshabilitado={trabajando}
          onPress={() => setFormulario(false)}
        />
      </View>
    );
  } else if (pendiente) {
    barra = (
      <View style={estilos.grupo}>
        {mensajes}
        <Boton
          titulo="Aprobar pago"
          tituloCargando="Aprobando…"
          cargando={ocupado(aprobar.fase)}
          deshabilitado={trabajando && !ocupado(aprobar.fase)}
          variante="acento"
          ancho="completo"
          onPress={pedirAprobar}
        />
        <Boton
          titulo="Rechazar pago"
          variante="secundario"
          ancho="completo"
          deshabilitado={trabajando}
          onPress={() => setFormulario(true)}
        />
      </View>
    );
  }

  const contenido = (
    <>
      {pendiente && !terminado && formulario ? (
        <View style={estilos.seccion}>
          <EncabezadoSeccion titulo="Rechazar pago" />
          <Superficie style={estilos.tarjeta}>
            <Texto variante="etiqueta" color={colores.textoFuerte}>
              Motivo del rechazo
            </Texto>
            <OpcionesRadio
              opciones={MOTIVOS_RECHAZO}
              valor={motivo ?? ('' as MotivoRechazoPago)}
              onCambio={(valor) => {
                setMotivo(valor);
                setErrorFormulario(null);
              }}
            />
            <CampoTexto
              etiqueta="Mensaje"
              valor={mensaje}
              onCambio={(texto) => {
                setMensaje(texto);
                setErrorFormulario(null);
              }}
              ayuda={motivo === 'OTRO' ? 'Obligatorio con "Otro".' : 'Opcional.'}
              keyboardType="default"
              autoCapitalize="sentences"
              maxLength={MAXIMO_MENSAJE_RECHAZO}
              returnKeyType="done"
            />
            <Texto variante="secundario" color={colores.textoSecundario}>
              {`${mensaje.length} / ${MAXIMO_MENSAJE_RECHAZO}`}
            </Texto>
            {errorFormulario ? <Aviso mensaje={errorFormulario} /> : null}
          </Superficie>
        </View>
      ) : null}
      {/* Sin barra (pago ya resuelto tras un 409, por ejemplo), lo que pasó va aquí. */}
      {barra === null ? mensajes : null}
    </>
  );

  return { barra, contenido };
}

export function DetallePago({ pago, refrescar, alVolver }: Props) {
  const { barra, contenido } = useAcciones(pago, alVolver);
  return (
    <PantallaPila accionFija={barra}>
      <Protagonista pago={pago} />
      {contenido}
      <Comparacion pago={pago} />
      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Comprobante" />
        <Superficie style={estilos.tarjeta}>
          <ComprobantePago
            pagoId={pago.id}
            tipo={pago.comprobante_tipo}
            url={pago.comprobante_url}
            obtenerFresco={refrescar}
            vistaPrevia
          />
        </Superficie>
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.xs },
  protagonista: { gap: espaciado.sm },
  datos: { gap: 2 },
  seccion: { gap: espaciado.xs },
  separador: { height: 1, backgroundColor: tintaAlfa(0.07) },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
});
