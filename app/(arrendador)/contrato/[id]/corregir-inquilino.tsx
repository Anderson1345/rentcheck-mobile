import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ContratoDetalle, corregirInquilino, type RespuestaCorreccion } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  AccionNoDisponible,
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
  NoEncontradoContrato,
} from '@/componentes/contratos/AccionesContrato';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
import { ResultadoCorreccion } from '@/componentes/contratos/TerminacionYCorreccion';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { puedeCorregir } from '@/contratos/acciones';
import {
  camposCambiadosInquilino,
  erroresInquilino,
  type ValoresInquilino,
} from '@/contratos/correccion';
import { useEnvioReintentable } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';

// Corregir datos del inquilino (rediseño R4-E): los tres campos con la etiqueta afuera, el aviso a la vista
// de que cambiar la cédula invalida el código anterior (y la confirmación de siempre antes de enviar),
// solo lo que cambió y, sin cambios, ninguna llamada; "Guardar correcciones" en la barra fija. Solo sin
// vincular y PROGRAMADO o ACTIVO, como en el detalle (puedeCorregir).
export default function CorregirInquilino() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => <Formulario contrato={contrato} />}
    </CargaContrato>
  );
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
      <PantallaPila
        accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
      >
        <Texto variante="titulo" accessibilityRole="header">
          Datos del inquilino corregidos
        </Texto>
        <ResultadoCorreccion contratoId={contrato.id} respuesta={envio.resultado} />
        {nuevo ? (
          // Solo el código nuevo: el anterior ya no sirve y no se vuelve a mostrar.
          <CodigoAcceso acceso={nuevo} nombreInquilino={valores.nombre.trim() || original.nombre} />
        ) : null}
      </PantallaPila>
    );
  }

  // Antes de enviar, la pantalla solo se ofrece cuando el detalle la ofrecería.
  if (envio.fase === 'inactivo' && !puedeCorregir(contrato)) return <AccionNoDisponible />;

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
        Solo se envían los datos que cambies.
      </Texto>
      {sinCambios ? <Aviso tono="informacion" mensaje="No hiciste ningún cambio." /> : null}
      <View style={estilos.seccion}>
        <EncabezadoSeccion titulo="Datos del inquilino" />
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
        <Aviso
          tono="advertencia"
          mensaje="Si cambias el documento, el código de acceso anterior deja de servir y se genera uno nuevo."
        />
        <CampoTexto
          etiqueta="Teléfono"
          valor={valores.telefono}
          onCambio={(telefono) => poner({ telefono })}
          error={errores.telefono}
          keyboardType="phone-pad"
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
