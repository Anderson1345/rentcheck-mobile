import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { aplicarIncremento } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
} from '@/componentes/contratos/AccionesContrato';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { formatearPorcentaje, parsearPorcentaje } from '@/contratos/acciones';
import { esPlantillaVivienda } from '@/contratos/plantilla';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';

const OPCIONES = [
  { valor: 'ipc', etiqueta: 'IPC del año anterior' },
  { valor: 'otro', etiqueta: 'Otro porcentaje' },
] as const;

export default function IncrementoContrato() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato<Awaited<ReturnType<typeof aplicarIncremento>>>(id, 'incremento');
  const [modo, setModo] = useState<'ipc' | 'otro'>('ipc');
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id}>
      {(contrato) => {
        if (accion.fase === 'exito') {
          const incremento = accion.resultado?.incremento_ipc;
          const anterior = incremento?.canon_anterior_centavos ?? accion.antes?.canon_centavos;
          const nuevo = incremento?.canon_nuevo_centavos ?? accion.despues?.canon_centavos;
          const porcentaje = formatearPorcentaje(incremento?.porcentaje_ipc_aplicado);
          return (
            <View style={estilos.grupo}>
              <Texto variante="titulo" accessibilityRole="header">
                Incremento aplicado
              </Texto>
              <Superficie style={estilos.grupo}>
                {anterior !== undefined && nuevo !== undefined ? (
                  <Texto variante="cuerpoFuerte">
                    {`${centavosAPesosTexto(anterior)} → ${centavosAPesosTexto(nuevo)}`}
                  </Texto>
                ) : null}
                {porcentaje ? (
                  <Texto variante="cuerpo">{`Porcentaje aplicado: ${porcentaje} %`}</Texto>
                ) : null}
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Se generó un otrosí: lo verás en los documentos del contrato.
                </Texto>
              </Superficie>
              <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
            </View>
          );
        }

        const vivienda = esPlantillaVivienda(contrato.tipo_plantilla);

        function aplicar() {
          let porcentaje: number | undefined;
          if (modo === 'otro') {
            const resultado = parsearPorcentaje(texto);
            if ('error' in resultado) {
              setErrorLocal(resultado.error);
              return;
            }
            porcentaje = resultado.valor;
          }
          setErrorLocal(null);
          const que =
            porcentaje === undefined
              ? 'Se aplicará el IPC del año anterior (lo calcula el servidor).'
              : `Se aplicará un incremento de ${formatearPorcentaje(porcentaje)} %.`;
          confirmarAccion(
            'Aplicar incremento',
            `Canon actual: ${centavosAPesosTexto(contrato.canon_centavos)}. ${que} Se genera un otrosí.`,
            'Aplicar',
            () => void accion.iniciar(() => aplicarIncremento(id, porcentaje)),
          );
        }

        return (
          <View style={estilos.grupo}>
            <ControlSegmentado opciones={OPCIONES} valor={modo} onCambio={setModo} />
            {modo === 'ipc' ? (
              <Texto variante="cuerpo">IPC del año anterior (lo calcula el servidor)</Texto>
            ) : (
              <CampoTexto
                etiqueta="Porcentaje"
                valor={texto}
                onCambio={setTexto}
                error={errorLocal ?? undefined}
                keyboardType="decimal-pad"
                returnKeyType="done"
                ayuda="Hasta 2 decimales, mayor que 0 y máximo 100."
              />
            )}
            {vivienda ? (
              <Texto variante="secundario" color={colores.textoSecundario}>
                No puede superar el IPC del año anterior.
              </Texto>
            ) : null}
            <Aviso
              tono="advertencia"
              mensaje="Los períodos futuros que ya estén pagados por adelantado con el canon anterior quedarán debiendo la diferencia."
            />
            <MensajeAccion
              fase={accion.fase}
              error={accion.error}
              onVerificar={() => void accion.verificar()}
              recargable={accion.recargable}
              onRecargar={() => void accion.recargar()}
            />
            {accion.fase === 'incierto' ? null : (
              <Boton
                titulo="Aplicar incremento"
                tituloCargando="Aplicando…"
                cargando={ocupado}
                ancho="completo"
                onPress={aplicar}
              />
            )}
          </View>
        );
      }}
    </CargaContrato>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
