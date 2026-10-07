import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { type ContratoVinculado, vincularContrato } from '@/api/auth';
import { mensajeDeErrorActivacion } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { ChipEstado } from '@/componentes/ChipEstado';
import { ESTADOS_CONTRATO } from '@/componentes/estados';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useRefrescarContratosInquilino } from '@/consultas/inquilino';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { formatearCodigoEscrito, validarCodigo } from '@/sesion/codigo';
import { colores, espaciado } from '@/tema';
import { formatearFechaCorta } from '@/utilidades/fechas';

const MENSAJE_FORMATO = 'Revisa el código: tiene el formato RC-XXXX-XXXX.';

// Agregar un contrato con el código del arrendador. La ruta es idempotente para la misma cuenta,
// así que tras un fallo sin respuesta se puede reintentar directo. No hay escáner QR en esta entrega.
// R4-B: el campo con su etiqueta fuera y la acción ("Agregar contrato" o "Ver mi panel") en la barra fija.
export default function AgregarContrato() {
  const router = useRouter();
  const { seleccionar } = useContratoSeleccionado();
  const refrescarLista = useRefrescarContratosInquilino();
  const [valor, setValor] = useState('');
  const [errorCampo, setErrorCampo] = useState<string | undefined>();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [agregado, setAgregado] = useState<ContratoVinculado | null>(null);
  // Un solo envío a la vez, aunque el botón reciba dos toques antes de repintarse.
  const enCurso = useRef(false);

  async function agregar() {
    if (enCurso.current) return;
    const resultado = validarCodigo(valor);
    // Un código mal formado no se envía: cada fallo en el servidor cuenta para el bloqueo.
    if (!resultado.valido) {
      setErrorCampo(MENSAJE_FORMATO);
      return;
    }
    enCurso.current = true;
    setErrorCampo(undefined);
    setErrorServidor(null);
    setEnviando(true);
    try {
      const contrato = await vincularContrato(resultado.codigo);
      seleccionar(contrato.id);
      void refrescarLista();
      setAgregado(contrato);
    } catch (error) {
      setErrorServidor(mensajeDeErrorActivacion(error));
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  if (agregado) {
    return (
      <PantallaPila
        accionFija={
          <Boton
            titulo="Ver mi panel"
            variante="acento"
            ancho="completo"
            onPress={() => router.dismissAll()}
          />
        }
      >
        <Aviso tono="exito" mensaje="Contrato agregado." />
        <Superficie style={estilos.tarjeta}>
          <Texto variante="titulo" accessibilityRole="header">
            {agregado.unidad.nombre}
          </Texto>
          <Texto variante="cuerpo">{agregado.inmueble.direccion}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {agregado.inmueble.ciudad}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${formatearFechaCorta(agregado.fecha_inicio)} – ${formatearFechaCorta(agregado.fecha_fin)}`}
          </Texto>
          {agregado.estado in ESTADOS_CONTRATO ? (
            <ChipEstado tipo="contrato" estado={agregado.estado as keyof typeof ESTADOS_CONTRATO} />
          ) : null}
        </Superficie>
        {agregado.estado === 'PROGRAMADO' ? (
          <Aviso tono="informacion" mensaje="Verás los datos de pago cuando el contrato empiece." />
        ) : null}
      </PantallaPila>
    );
  }

  return (
    <PantallaPila
      accionFija={
        <Boton
          titulo="Agregar contrato"
          tituloCargando="Agregando…"
          cargando={enviando}
          ancho="completo"
          onPress={() => void agregar()}
        />
      }
    >
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        Escribe el código que te dio tu arrendador para agregar otro contrato a tu cuenta.
      </Texto>
      {errorServidor ? <Aviso mensaje={errorServidor} /> : null}
      <CampoTexto
        etiqueta="Código de acceso"
        valor={valor}
        onCambio={(texto) => {
          setValor(formatearCodigoEscrito(texto));
          setErrorCampo(undefined);
        }}
        error={errorCampo}
        ayuda="Tiene el formato RC-XXXX-XXXX."
        autoCapitalize="characters"
        returnKeyType="go"
        onSubmitEditing={() => void agregar()}
      />
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
});
