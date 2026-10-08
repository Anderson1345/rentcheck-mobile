import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { aplicarIncremento } from '@/api/contratos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  AccionNoDisponible,
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
  NoEncontradoContrato,
  ResumenCambio,
} from '@/componentes/contratos/AccionesContrato';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { accionesDisponibles, formatearPorcentaje, parsearPorcentaje } from '@/contratos/acciones';
import { esPlantillaVivienda } from '@/contratos/plantilla';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';

const OPCIONES = [
  { valor: 'ipc', etiqueta: 'IPC del año anterior' },
  { valor: 'otro', etiqueta: 'Otro porcentaje' },
] as const;

/** Lo que dice la fila "Incremento" del resumen según lo elegido (sin calcular el canon nuevo). */
function textoIncremento(modo: 'ipc' | 'otro', texto: string): string {
  if (modo === 'ipc') return 'IPC del año anterior';
  if (texto.trim() === '') return 'Escribe el porcentaje';
  const resultado = parsearPorcentaje(texto);
  return 'error' in resultado
    ? 'Revisa el porcentaje'
    : `${formatearPorcentaje(resultado.valor)} %`;
}

// Incremento anual (rediseño R4-E): arriba el resumen (canon actual, el incremento elegido y el canon
// nuevo, que calcula el servidor), luego la opción y el porcentaje con la etiqueta afuera, los avisos de
// siempre (períodos pagados con el canon anterior; el tope del IPC en vivienda) y "Aplicar incremento" en
// la barra fija. Solo con el contrato ACTIVO, como en el detalle (accionesDisponibles).
export default function IncrementoContrato() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato<Awaited<ReturnType<typeof aplicarIncremento>>>(id, 'incremento');
  const [modo, setModo] = useState<'ipc' | 'otro'>('ipc');
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => {
        if (accion.fase === 'exito') {
          const incremento = accion.resultado?.incremento_ipc;
          const anterior = incremento?.canon_anterior_centavos ?? accion.antes?.canon_centavos;
          const nuevo = incremento?.canon_nuevo_centavos ?? accion.despues?.canon_centavos;
          const porcentaje = formatearPorcentaje(incremento?.porcentaje_ipc_aplicado);
          return (
            <PantallaPila
              accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
            >
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
            </PantallaPila>
          );
        }

        // Antes de actuar, la pantalla solo se ofrece cuando el detalle la ofrecería.
        if (accion.fase === 'inactivo' && !accionesDisponibles(contrato).incremento) {
          return <AccionNoDisponible />;
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
          <PantallaPila
            accionFija={
              accion.fase === 'incierto' ? undefined : (
                <Boton
                  titulo="Aplicar incremento"
                  tituloCargando="Aplicando…"
                  cargando={ocupado}
                  ancho="completo"
                  onPress={aplicar}
                />
              )
            }
          >
            <ResumenCambio
              filas={[
                { etiqueta: 'Canon actual', valor: centavosAPesosTexto(contrato.canon_centavos) },
                { etiqueta: 'Incremento', valor: textoIncremento(modo, texto) },
                { etiqueta: 'Canon nuevo', valor: 'lo calcula el servidor al aplicar' },
              ]}
            />

            <View style={estilos.grupo}>
              <EncabezadoSeccion titulo="Incremento" />
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
            </View>

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
          </PantallaPila>
        );
      }}
    </CargaContrato>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
