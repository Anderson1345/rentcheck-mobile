import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoDetalle, corregirInquilino, type RespuestaCorreccion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
import { ResultadoCorreccion } from '@/componentes/contratos/TerminacionYCorreccion';
import { Texto } from '@/componentes/Texto';
import {
  camposCambiadosInquilino,
  erroresInquilino,
  type ValoresInquilino,
} from '@/contratos/correccion';
import { useEnvioReintentable } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';

export default function CorregirInquilino() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CargaContrato id={id}>{(contrato) => <Formulario contrato={contrato} />}</CargaContrato>;
}

function Formulario({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  const original: ValoresInquilino = {
    nombre: contrato.inquilino.nombre,
    telefono: contrato.inquilino.telefono ?? '',
    cedula: contrato.inquilino.cedula ?? '',
  };
  const [valores, setValores] = useState<ValoresInquilino>(original);
  const [errores, setErrores] = useState<Partial<Record<keyof ValoresInquilino, string>>>({});
  const [sinCambios, setSinCambios] = useState(false);
  const envio = useEnvioReintentable<RespuestaCorreccion>(contrato.id);
  const poner = (parcial: Partial<ValoresInquilino>) => setValores((v) => ({ ...v, ...parcial }));

  if (envio.fase === 'exito' && envio.resultado) {
    const nuevo = envio.resultado.codigo_acceso;
    return (
      <View style={estilos.grupo}>
        <Texto variante="titulo" accessibilityRole="header">
          Datos del inquilino corregidos
        </Texto>
        <ResultadoCorreccion contratoId={contrato.id} respuesta={envio.resultado} />
        {nuevo ? (
          // Solo el código nuevo: el anterior ya no sirve y no se vuelve a mostrar.
          <CodigoAcceso acceso={nuevo} nombreInquilino={valores.nombre.trim() || original.nombre} />
        ) : null}
        <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
      </View>
    );
  }

  function guardar() {
    setSinCambios(false);
    const encontrados = erroresInquilino(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const cambios = camposCambiadosInquilino(original, valores);
    if (Object.keys(cambios).length === 0) {
      setSinCambios(true);
      return;
    }
    const enviar = () => void envio.enviar(() => corregirInquilino(contrato.id, cambios));
    if (cambios.cedula !== undefined) {
      confirmarAccion(
        'Cambiar la cédula',
        'El código de acceso anterior dejará de servir y se genera uno nuevo.',
        'Guardar',
        enviar,
      );
    } else {
      enviar();
    }
  }

  return (
    <View style={estilos.grupo}>
      <Texto variante="titulo" accessibilityRole="header">
        Corregir datos del inquilino
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Solo se envían los datos que cambies. Si cambias el documento, se genera un código de acceso
        nuevo.
      </Texto>
      {sinCambios ? <Aviso tono="informacion" mensaje="No hiciste ningún cambio." /> : null}
      <CampoTexto
        etiqueta="Nombre completo"
        valor={valores.nombre}
        onCambio={(nombre) => poner({ nombre })}
        error={errores.nombre}
        keyboardType="default"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <CampoTexto
        etiqueta="Documento de identidad"
        valor={valores.cedula}
        onCambio={(cedula) => poner({ cedula })}
        error={errores.cedula}
        keyboardType="default"
        autoCapitalize="characters"
        returnKeyType="next"
      />
      <CampoTexto
        etiqueta="Teléfono"
        valor={valores.telefono}
        onCambio={(telefono) => poner({ telefono })}
        error={errores.telefono}
        keyboardType="phone-pad"
        returnKeyType="done"
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
