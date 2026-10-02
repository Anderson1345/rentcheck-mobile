import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoDetalle, corregirContrato, type RespuestaCorreccion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoDinero } from '@/componentes/CampoDinero';
import { CampoTexto } from '@/componentes/CampoTexto';
import { CargaContrato, MensajeAccion } from '@/componentes/contratos/AccionesContrato';
import { SelectorFecha } from '@/componentes/contratos/PasoFechas';
import { ResultadoCorreccion } from '@/componentes/contratos/TerminacionYCorreccion';
import { Texto } from '@/componentes/Texto';
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

export default function CorregirContrato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CargaContrato id={id}>{(contrato) => <Formulario contrato={contrato} />}</CargaContrato>;
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
      <View style={estilos.grupo}>
        <Texto variante="titulo" accessibilityRole="header">
          Datos corregidos
        </Texto>
        <ResultadoCorreccion contratoId={contrato.id} respuesta={envio.resultado} />
        <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
      </View>
    );
  }

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
    <View style={estilos.grupo}>
      <Texto variante="titulo" accessibilityRole="header">
        Corregir datos del contrato
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Solo se envían los datos que cambies. Cada cambio genera una versión nueva del contrato.
      </Texto>
      {sinCambios ? <Aviso tono="informacion" mensaje="No hiciste ningún cambio." /> : null}
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
      <MensajeAccion
        fase="inactivo"
        error={envio.error}
        onVerificar={() => undefined}
        recargable={envio.recargable}
        onRecargar={() => void envio.recargar()}
      />
      <Boton
        titulo="Guardar correcciones"
        tituloCargando="Guardando…"
        cargando={envio.fase === 'enviando'}
        ancho="completo"
        onPress={guardar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
