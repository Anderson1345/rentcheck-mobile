// Detalle de un pago para el arrendador: quién, qué período, esperado vs. reportado, comprobante y, si
// el pago está PENDIENTE, aprobar o rechazar con motivo. Todo valor (estado del período, saldo, motivo
// del rechazo) lo manda el servidor; la app solo lo presenta y avisa.

import { useState } from 'react';
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
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoTexto } from '../CampoTexto';
import { ChipEstado } from '../ChipEstado';
import { confirmarAccion, MensajeAccion, OpcionesRadio } from '../contratos/AccionesContrato';
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

function Resumen({ pago }: { pago: PagoRespuesta }) {
  const { inquilino, unidad } = pago.contrato;
  const rechazo =
    pago.estado === 'RECHAZADO'
      ? textoMotivoRechazo(pago.motivo_rechazo, pago.mensaje_rechazo)
      : null;
  return (
    <Superficie style={estilos.tarjeta}>
      <ChipEstado tipo="pago" estado={pago.estado} />
      <Linea texto={inquilino.nombre} fuerte />
      <Linea texto={`Teléfono ${inquilino.telefono}`} />
      <Linea texto={`${unidad.nombre} · ${unidad.inmueble.direccion}`} />
      <Linea texto={mesDePeriodo(pago.periodo)} fuerte />
      <Linea texto={`Reportado el ${formatearFechaCorta(pago.fecha_reportada)}`} />
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
  );
}

/** Esperado vs. reportado. Completo con el pago PENDIENTE; ya procesado no tiene sentido hablar de saldo. */
function Comparacion({ pago }: { pago: PagoRespuesta }) {
  const c = comparacionDePago(pago);
  if (!c) return null;
  const pendiente = pago.estado === 'PENDIENTE';
  return (
    <Superficie style={estilos.tarjeta}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Esperado vs. reportado
      </Texto>
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
  );
}

function Acciones({ pago, alVolver }: { pago: PagoRespuesta; alVolver: () => void }) {
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

  return (
    <View style={estilos.grupo}>
      {aprobar.fase === 'exito' ? <Aviso tono="exito" mensaje="Pago aprobado." /> : null}
      {rechazar.fase === 'exito' ? <Aviso tono="exito" mensaje="Pago rechazado." /> : null}
      {terminado ? <Boton titulo="Volver a la lista" ancho="completo" onPress={alVolver} /> : null}

      {pendiente && !terminado ? (
        <>
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
            variante="destructivo"
            ancho="completo"
            deshabilitado={trabajando}
            onPress={() => setFormulario((abierto) => !abierto)}
          />
        </>
      ) : null}

      {pendiente && !terminado && formulario ? (
        <Superficie style={estilos.tarjeta}>
          <Texto variante="etiqueta" color={colores.textoSecundario}>
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
          <Boton
            titulo="Confirmar rechazo"
            tituloCargando="Rechazando…"
            cargando={ocupado(rechazar.fase)}
            deshabilitado={trabajando && !ocupado(rechazar.fase)}
            variante="destructivo"
            ancho="completo"
            onPress={pedirRechazar}
          />
        </Superficie>
      ) : null}

      {/* Fuera del bloque de acciones: un 409 refresca el pago y el mensaje debe seguir a la vista. */}
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
    </View>
  );
}

export function DetallePago({ pago, refrescar, alVolver }: Props) {
  return (
    <>
      <Resumen pago={pago} />
      <Comparacion pago={pago} />
      <Superficie style={estilos.tarjeta}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Comprobante
        </Texto>
        <ComprobantePago
          pagoId={pago.id}
          tipo={pago.comprobante_tipo}
          url={pago.comprobante_url}
          obtenerFresco={refrescar}
          vistaPrevia
        />
      </Superficie>
      <Acciones pago={pago} alVolver={alVolver} />
    </>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  tarjeta: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
});
