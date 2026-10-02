import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { prorrogar } from '@/api/contratos';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  CargaContrato,
  confirmarAccion,
  MensajeAccion,
  OpcionesRadio,
} from '@/componentes/contratos/AccionesContrato';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { parsearMeses } from '@/contratos/acciones';
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

export default function ProrrogaContrato() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accion = useAccionContrato<Awaited<ReturnType<typeof prorrogar>>>(id, 'prorroga');
  const [opcion, setOpcion] = useState<(typeof OPCIONES)[number]['valor']>('inicial');
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const ocupado = accion.fase === 'enviando' || accion.fase === 'verificando';

  return (
    <CargaContrato id={id}>
      {() => {
        if (accion.fase === 'exito') {
          const fin = accion.resultado?.prorroga.fecha_fin_nueva ?? accion.despues?.fecha_fin;
          return (
            <View style={estilos.grupo}>
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
              <Boton titulo="Listo" ancho="completo" onPress={() => router.back()} />
            </View>
          );
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
          <View style={estilos.grupo}>
            <Texto variante="titulo" accessibilityRole="header">
              Prórroga
            </Texto>
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
            <MensajeAccion
              fase={accion.fase}
              error={accion.error}
              onVerificar={() => void accion.verificar()}
            />
            {accion.fase === 'incierto' ? null : (
              <Boton
                titulo="Prorrogar"
                tituloCargando="Prorrogando…"
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
