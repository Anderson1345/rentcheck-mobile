import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ContratoInquilinoResumen } from '@/api/inquilino';
import type { PeriodoCuenta } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoDinero } from '@/componentes/CampoDinero';
import { confirmarAccion, OpcionesRadio } from '@/componentes/contratos/AccionesContrato';
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ContratoNoEncontrado, ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { SelectorComprobante } from '@/componentes/pagos/SelectorComprobante';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import {
  useEstadoCuentaInquilino,
  usePanelInquilino,
  useRefrescarSiNoEncontrado,
} from '@/consultas/inquilino';
import { mesDePeriodo } from '@/contratos/acciones';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import {
  AVISO_MAYOR,
  AVISO_PARCIAL,
  AVISO_REEMPLAZO,
  avisoDeMonto,
  diaDePeriodo,
  montoSugerido,
  periodoInicial,
  periodosReportables,
} from '@/pagos/reglas';
import { useReportarPago } from '@/pagos/useReportarPago';
import { colores, espaciado } from '@/tema';
import type { Comprobante } from '@/utilidades/comprobante';
import { centavosAPesosTexto } from '@/utilidades/dinero';
import { formatearFechaLarga, hoyBogota } from '@/utilidades/fechas';

// Pantalla de pila propia (el reporte necesita todo el ancho y el teclado; dos grupos de rutas no
// pueden compartir URL, por eso no se llama "pago"). Recibe el contrato y, opcionalmente, el período.
export default function ReportarPago() {
  const router = useRouter();
  const { contratoId, periodo } = useLocalSearchParams<{ contratoId?: string; periodo?: string }>();
  const { lista } = useContratoSeleccionado();

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/pagos');
  }

  const contrato = lista.data?.find((c) => c.id === contratoId);
  let cuerpo;
  if (lista.data === undefined) {
    cuerpo = lista.isPending ? (
      <EsqueletoCarga filas={3} />
    ) : (
      <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
    );
  } else if (!contrato) {
    cuerpo = <ContratoNoEncontrado textoBoton="Volver" onPress={volver} />;
  } else {
    cuerpo = <Formulario contrato={contrato} periodoParam={periodo} onListo={volver} />;
  }

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        Reportar pago
      </Texto>
      {cuerpo}
    </PantallaPila>
  );
}

function Formulario({
  contrato,
  periodoParam,
  onListo,
}: {
  contrato: ContratoInquilinoResumen;
  periodoParam: string | undefined;
  onListo: () => void;
}) {
  const router = useRouter();
  const id = contrato.id;
  const cuenta = useEstadoCuentaInquilino(id);
  // El panel solo sirve para sugerir el período cuando no llegó uno por parámetro.
  const necesitaPanel = !periodoParam && contrato.estado === 'ACTIVO';
  const panel = usePanelInquilino(id, necesitaPanel);
  const noEncontrado = useRefrescarSiNoEncontrado(cuenta.error);

  if (noEncontrado) {
    return (
      <ContratoNoEncontrado
        textoBoton="Ver mis contratos"
        onPress={() => router.push('/mis-contratos')}
      />
    );
  }
  if (cuenta.data === undefined) {
    return cuenta.isPending ? (
      <EsqueletoCarga filas={3} />
    ) : (
      <ErrorConReintento error={cuenta.error} onReintentar={() => void cuenta.refetch()} />
    );
  }
  if (necesitaPanel && panel.isPending) return <EsqueletoCarga filas={3} />;

  const proximo =
    panel.data && 'proximo_periodo' in panel.data ? panel.data.proximo_periodo?.periodo : undefined;
  const inicial = periodoInicial(cuenta.data.periodos, contrato.estado, [periodoParam, proximo]);
  if (inicial === null) {
    return (
      <Texto variante="cuerpo" color={colores.textoSecundario}>
        Este contrato no tiene períodos para reportar.
      </Texto>
    );
  }
  return (
    <Campos
      contrato={contrato}
      periodos={periodosReportables(cuenta.data.periodos, contrato.estado)}
      inicial={inicial}
      onListo={onListo}
    />
  );
}

function Campos({
  contrato,
  periodos,
  inicial,
  onListo,
}: {
  contrato: ContratoInquilinoResumen;
  periodos: PeriodoCuenta[];
  inicial: PeriodoCuenta;
  onListo: () => void;
}) {
  const reporte = useReportarPago(contrato.id);
  const hoy = useMemo(() => hoyBogota(), []);
  const [periodoElegido, setPeriodoElegido] = useState(inicial.periodo);
  const [monto, setMonto] = useState<number | null>(montoSugerido(inicial));
  const [fecha, setFecha] = useState(hoy);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [errores, setErrores] = useState<{ comprobante?: string; monto?: string; fecha?: string }>(
    {},
  );

  const periodo = periodos.find((p) => p.periodo === periodoElegido) ?? inicial;
  const aviso = avisoDeMonto(monto, periodo);
  const minimo = diaDePeriodo(contrato.fecha_inicio);

  function cambiarPeriodo(clave: string) {
    const nuevo = periodos.find((p) => p.periodo === clave);
    if (!nuevo) return;
    setPeriodoElegido(clave);
    setMonto(montoSugerido(nuevo));
  }

  function enviar() {
    const nuevos: typeof errores = {};
    if (!comprobante) nuevos.comprobante = 'Adjunta el comprobante del pago.';
    if (monto === null || monto < 1) nuevos.monto = 'Escribe el monto pagado.';
    if (fecha > hoy || fecha < minimo) {
      nuevos.fecha = 'La fecha del pago debe estar entre el inicio del contrato y hoy.';
    }
    setErrores(nuevos);
    if (!comprobante || monto === null || monto < 1 || nuevos.fecha) return;

    const tipo = comprobante.type === 'application/pdf' ? 'PDF' : 'foto';
    confirmarAccion(
      'Reportar pago',
      `Período: ${mesDePeriodo(periodo.periodo)}. Monto: ${centavosAPesosTexto(monto)}. Fecha del pago: ${formatearFechaLarga(fecha)}. Comprobante: ${tipo}.`,
      'Enviar',
      () =>
        void reporte.enviar({
          periodo: diaDePeriodo(periodo.periodo),
          montoCentavos: monto,
          fechaReportada: fecha,
          comprobante,
        }),
    );
  }

  if (reporte.fase === 'exito') {
    return (
      <View style={estilos.grupo}>
        <Aviso tono="exito" mensaje="Pago reportado. Tu arrendador lo revisará." />
        <Boton titulo="Listo" ancho="completo" onPress={onListo} />
      </View>
    );
  }

  const enviando = reporte.fase === 'enviando';
  return (
    <View style={estilos.grupo}>
      <Texto variante="etiqueta" color={colores.textoSecundario}>
        Período
      </Texto>
      <OpcionesRadio
        opciones={periodos.map((p) => ({ valor: p.periodo, etiqueta: mesDePeriodo(p.periodo) }))}
        valor={periodo.periodo}
        onCambio={cambiarPeriodo}
      />
      {periodo.estado === 'EN_REVISION' ? (
        <Aviso tono="advertencia" mensaje={AVISO_REEMPLAZO} />
      ) : null}

      <CampoDinero
        etiqueta="Monto pagado"
        valorCentavos={monto}
        onCambio={(valor) => {
          setMonto(valor);
          setErrores((e) => ({ ...e, monto: undefined }));
        }}
        error={errores.monto}
        ayuda={`Saldo del período: ${centavosAPesosTexto(montoSugerido(periodo))}`}
      />
      {aviso === 'parcial' ? <Aviso tono="advertencia" mensaje={AVISO_PARCIAL} /> : null}
      {aviso === 'mayor' ? <Aviso tono="informacion" mensaje={AVISO_MAYOR} /> : null}

      <SelectorFecha
        etiqueta="Fecha del pago"
        valor={fecha}
        hoy={hoy}
        minimo={minimo}
        maximo={hoy}
        error={errores.fecha}
        onCambio={(f) => {
          setFecha(f);
          setErrores((e) => ({ ...e, fecha: undefined }));
        }}
      />

      <Texto variante="etiqueta" color={colores.textoSecundario}>
        Comprobante
      </Texto>
      <SelectorComprobante
        valor={comprobante}
        onCambio={(c) => {
          setComprobante(c);
          setErrores((e) => ({ ...e, comprobante: undefined }));
        }}
        deshabilitado={enviando}
        error={errores.comprobante}
      />

      {reporte.error ? <Aviso mensaje={reporte.error} /> : null}
      <Boton
        titulo="Enviar"
        tituloCargando="Enviando pago…"
        cargando={enviando}
        ancho="completo"
        onPress={enviar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
