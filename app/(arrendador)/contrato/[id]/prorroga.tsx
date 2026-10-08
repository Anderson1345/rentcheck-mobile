import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { prorrogar } from '@/api/contratos';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  AccionNoDisponible,
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
  NoEncontradoContrato,
  OpcionesRadio,
  ResumenCambio,
} from '@/componentes/contratos/AccionesContrato';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { accionesDisponibles, parsearMeses } from '@/contratos/acciones';
import { useAccionContrato } from '@/contratos/useAccionContrato';
import { colores, espaciado } from '@/tema';
import { formatearFechaLarga } from '@/utilidades/fechas';

const OPCIONES = [
  { valor: 'inicial', etiqueta: 'Mismo término inicial' },
  { valor: '6', etiqueta: '6 meses' },
  { valor: '12', etiqueta: '12 meses' },
  { valor: '24', etiqueta: '24 meses' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const;

type Opcion = (typeof OPCIONES)[number]['valor'];

const textoMeses = (meses: number) => (meses === 1 ? '1 mes' : `${meses} meses`);

/** Lo que dice la fila "Prórroga" del resumen según lo elegido. */
function textoProrroga(opcion: Opcion, texto: string): string {
  if (opcion === 'inicial') return 'Mismo término inicial';
  if (opcion !== 'otro') return textoMeses(Number(opcion));
  if (texto.trim() === '') return 'Escribe los meses';
  const resultado = parsearMeses(texto);
  return 'error' in resultado ? 'Revisa los meses' : textoMeses(resultado.valor);
}

// Prórroga (rediseño R4-E): arriba el resumen (fecha de fin actual, la duración elegida y la nueva fecha
// de fin, que calcula el servidor; el canon no cambia), las opciones con su etiqueta y "Prorrogar" en la
// barra fija. Solo con el contrato ACTIVO, como en el detalle (accionesDisponibles).
export default function ProrrogaContrato() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato<Awaited<ReturnType<typeof prorrogar>>>(id, 'prorroga');
  const [opcion, setOpcion] = useState<Opcion>('inicial');
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id} sinMarco noEncontrado={() => <NoEncontradoContrato />}>
      {(contrato) => {
        if (accion.fase === 'exito') {
          const fin = accion.resultado?.prorroga.fecha_fin_nueva ?? accion.despues?.fecha_fin;
          return (
            <PantallaPila
              accionFija={<Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />}
            >
              <Texto variante="titulo" accessibilityRole="header">
                Contrato prorrogado
              </Texto>
              <Superficie style={estilos.grupo}>
                {fin ? (
                  <Texto variante="cuerpoFuerte">{`Nueva fecha de fin: ${formatearFechaLarga(fin)}`}</Texto>
                ) : null}
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Se generó un otrosí: lo verás en los documentos del contrato.
                </Texto>
              </Superficie>
            </PantallaPila>
          );
        }

        // Antes de actuar, la pantalla solo se ofrece cuando el detalle la ofrecería.
        if (accion.fase === 'inactivo' && !accionesDisponibles(contrato).prorroga) {
          return <AccionNoDisponible />;
        }

        function aplicar() {
          let meses: number | undefined;
          if (opcion === 'otro') {
            const resultado = parsearMeses(texto);
            if ('error' in resultado) {
              setErrorLocal(resultado.error);
              return;
            }
            meses = resultado.valor;
          } else if (opcion !== 'inicial') {
            meses = Number(opcion);
          }
          setErrorLocal(null);
          const cuanto =
            meses === undefined ? 'por el mismo término inicial' : `por ${meses} meses`;
          confirmarAccion(
            'Prorrogar contrato',
            `Se prorrogará el contrato ${cuanto}. Se genera un otrosí; el canon no cambia.`,
            'Prorrogar',
            () => void accion.iniciar(() => prorrogar(id, meses)),
          );
        }

        return (
          <PantallaPila
            accionFija={
              accion.fase === 'incierto' ? undefined : (
                <Boton
                  titulo="Prorrogar"
                  tituloCargando="Prorrogando…"
                  cargando={ocupado}
                  ancho="completo"
                  onPress={aplicar}
                />
              )
            }
          >
            <ResumenCambio
              filas={[
                { etiqueta: 'Fecha de fin actual', valor: formatearFechaLarga(contrato.fecha_fin) },
                { etiqueta: 'Prórroga', valor: textoProrroga(opcion, texto) },
                { etiqueta: 'Nueva fecha de fin', valor: 'la calcula el servidor al prorrogar' },
                { etiqueta: 'Canon', valor: 'no cambia' },
              ]}
            />

            <View style={estilos.grupo}>
              <EncabezadoSeccion titulo="Duración" />
              <OpcionesRadio opciones={OPCIONES} valor={opcion} onCambio={setOpcion} />
              {opcion === 'otro' ? (
                <CampoTexto
                  etiqueta="Meses"
                  valor={texto}
                  onCambio={setTexto}
                  error={errorLocal ?? undefined}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="done"
                  ayuda="De 1 a 60 meses."
                />
              ) : null}
              <Texto variante="secundario" color={colores.textoSecundario}>
                Se genera un otrosí; el canon no cambia.
              </Texto>
            </View>
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
