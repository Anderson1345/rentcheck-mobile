import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoDetalle, corregirContrato, type RespuestaCorreccion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoDinero } from '@/componentes/CampoDinero';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  AccionNoDisponible,
  CargaContrato,
  MensajeAccion,
  NoEncontradoContrato,
} from '@/componentes/contratos/AccionesContrato';
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { ResultadoCorreccion } from '@/componentes/contratos/TerminacionYCorreccion';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { puedeCorregir } from '@/contratos/acciones';
import {
  camposCambiadosContrato,
  erroresCorreccion,
  type ErroresCorreccion,
  valoresDeContrato,
  type ValoresCorreccion,
} from '@/contratos/correccion';
import { esPlantillaVivienda } from '@/contratos/plantilla';
import { useEnvioReintentable } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { hoyBogota } from '@/utilidades/fechas';

// Corregir datos del contrato (rediseño R4-E): secciones Pago, Fechas y Garantía y condiciones con la
// etiqueta afuera; solo se envía lo que cambió y, sin cambios, no se llama al servidor; el depósito solo
// fuera de vivienda; "Guardar correcciones" en la barra fija. Solo sin vincular y PROGRAMADO o ACTIVO,
// como en el detalle (puedeCorregir).
export default function CorregirContrato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => <Formulario contrato={contrato} />}
    </CargaContrato>
  );
}

function Formulario({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  const hoy = useMemo(() => hoyBogota(), []);
  const [valores, setValores] = useState<ValoresCorreccion>(() => valoresDeContrato(contrato));
  const [errores, setErrores] = useState<ErroresCorreccion>({});
  const [sinCambios, setSinCambios] = useState(false);
  const envio = useEnvioReintentable<RespuestaCorreccion>(contrato.id);
  const vivienda = esPlantillaVivienda(contrato.tipo_plantilla);
  const poner = (parcial: Partial<ValoresCorreccion>) => setValores((v) => ({ ...v, ...parcial }));

  if (envio.fase === 'exito' && envio.resultado) {
    return (
      <PantallaPila
        accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
      >
        <Texto variante="titulo" accessibilityRole="header">
          Datos corregidos
        </Texto>
        <ResultadoCorreccion contratoId={contrato.id} respuesta={envio.resultado} />
      </PantallaPila>
    );
  }

  // Antes de enviar, la pantalla solo se ofrece cuando el detalle la ofrecería.
  if (envio.fase === 'inactivo' && !puedeCorregir(contrato)) return <AccionNoDisponible />;

  function guardar() {
    setSinCambios(false);
    const encontrados = erroresCorreccion(contrato, valores, hoy);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const cambios = camposCambiadosContrato(contrato, valores);
    if (Object.keys(cambios).length === 0) {
      setSinCambios(true);
      return;
    }
    void envio.enviar(() => corregirContrato(contrato.id, cambios));
  }

  return (
    <PantallaPila
      accionFija={
        <Boton
          titulo="Guardar correcciones"
          tituloCargando="Guardando…"
          cargando={envio.fase === 'enviando'}
          ancho="completo"
          onPress={guardar}
        />
      }
    >
      <Texto variante="secundario" color={colores.textoSecundario}>
        Solo se envían los datos que cambies. Cada cambio genera una versión nueva del contrato.
      </Texto>
      {sinCambios ? <Aviso tono="informacion" mensaje="No hiciste ningún cambio." /> : null}

      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Pago" />
        <CampoDinero
          etiqueta="Canon mensual"
          valorCentavos={valores.canonCentavos}
          onCambio={(canonCentavos) => poner({ canonCentavos })}
          error={errores.canonCentavos}
        />
        <CampoTexto
          etiqueta="Día de pago (1 a 31)"
          valor={valores.diaPago}
          onCambio={(diaPago) => poner({ diaPago })}
          error={errores.diaPago}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="next"
        />
        <CampoTexto
          etiqueta="Forma de pago"
          valor={valores.formaPago}
          onCambio={(formaPago) => poner({ formaPago })}
          error={errores.formaPago}
          keyboardType="default"
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <CampoTexto
          etiqueta="Datos de recaudo"
          valor={valores.datosRecaudo}
          onCambio={(datosRecaudo) => poner({ datosRecaudo })}
          error={errores.datosRecaudo}
          keyboardType="default"
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        {vivienda ? null : (
          <CampoDinero
            etiqueta="Depósito (opcional)"
            valorCentavos={valores.depositoCentavos}
            onCambio={(depositoCentavos) => poner({ depositoCentavos })}
            error={errores.depositoCentavos}
          />
        )}
      </View>

      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Fechas" />
        <SelectorFecha
          etiqueta="Fecha de inicio"
          valor={valores.fechaInicio}
          hoy={hoy}
          error={errores.fechaInicio}
          onCambio={(fechaInicio) => poner({ fechaInicio })}
        />
        <SelectorFecha
          etiqueta="Fecha de fin"
          valor={valores.fechaFin}
          hoy={hoy}
          error={errores.fechaFin}
          onCambio={(fechaFin) => poner({ fechaFin })}
        />
      </View>

      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Garantía y condiciones" />
        <CampoTexto
          etiqueta="Fiador, codeudor o póliza"
          valor={valores.datosFiador}
          onCambio={(datosFiador) => poner({ datosFiador })}
          keyboardType="default"
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <CampoTexto
          etiqueta="Condiciones particulares"
          valor={valores.condiciones}
          onCambio={(condiciones) => poner({ condiciones })}
          keyboardType="default"
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      </View>

      <MensajeAccion
        fase="inactivo"
        error={envio.error}
        onVerificar={() => undefined}
        recargable={envio.recargable}
        onRecargar={() => void envio.recargar()}
      />
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.sm },
});
