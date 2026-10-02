import { useRouter } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  cancelarAvisoNoRenovacion,
  cancelarProgramado as cancelarProgramadoApi,
  type ContratoDetalle,
} from '../../api/contratos';
import { mensajeDeError } from '../../api/errores';
import { useContrato } from '../../consultas/contratos';
import { accionesDisponibles } from '../../contratos/acciones';
import {
  type FaseAccion,
  MENSAJE_VERIFICANDO,
  useAccionContrato,
} from '../../contratos/useAccionContrato';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { PantallaPila } from '../PantallaPila';
import { Texto } from '../Texto';

/** Confirmación final con el resumen de lo que se hará (Alert nativo). */
export function confirmarAccion(
  titulo: string,
  mensaje: string,
  textoConfirmar: string,
  alConfirmar: () => void,
  destructiva = false,
) {
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoConfirmar, style: destructiva ? 'destructive' : 'default', onPress: alConfirmar },
  ]);
}

/** Estado de una acción en curso: verificando, error o "Verificar" si no se pudo comprobar. */
export function MensajeAccion({
  fase,
  error,
  onVerificar,
}: {
  fase: FaseAccion;
  error: string | null;
  onVerificar: () => void;
}) {
  return (
    <>
      {fase === 'verificando' ? <Aviso tono="informacion" mensaje={MENSAJE_VERIFICANDO} /> : null}
      {error ? <Aviso mensaje={error} /> : null}
      {fase === 'incierto' ? (
        <Boton titulo="Verificar" variante="secundario" ancho="completo" onPress={onVerificar} />
      ) : null}
    </>
  );
}

/** Opciones excluyentes con área táctil de 48 dp (una sola a la vez). */
export function OpcionesRadio<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T;
  onCambio: (valor: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={estilos.opciones}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityLabel={o.etiqueta}
            accessibilityState={{ selected: activa }}
            onPress={() => onCambio(o.valor)}
            style={[estilos.opcion, activa && estilos.opcionActiva]}
          >
            <Texto variante="etiqueta" color={activa ? colores.sobreTinta : colores.texto}>
              {o.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Carga el contrato para las pantallas de formulario: cargando, error con Reintentar o contenido. */
export function CargaContrato({
  id,
  children,
}: {
  id: string;
  children: (contrato: ContratoDetalle) => ReactNode;
}) {
  const { data, isPending, error, refetch } = useContrato(id);
  if (data === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={2} />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }
  return <PantallaPila>{children(data)}</PantallaPila>;
}

/**
 * Sección "Acciones" del detalle. Los botones salen del estado del contrato y de los booleanos
 * puede_dar / puede_cancelar del servidor (la app no calcula el plazo). Cada acción con formulario
 * tiene su pantalla; cancelar aviso y cancelar programado se confirman aquí mismo.
 */
export function AccionesContrato({ contrato }: { contrato: ContratoDetalle }) {
  const router = useRouter();
  const a = accionesDisponibles(contrato);
  const cancelarAviso = useAccionContrato(contrato.id, 'cancelarAviso');
  const cancelarProgramado = useAccionContrato(contrato.id, 'cancelarProgramado');
  const ir = (
    pathname:
      | '/contrato/[id]/estado-cuenta'
      | '/contrato/[id]/incremento'
      | '/contrato/[id]/prorroga'
      | '/contrato/[id]/aviso',
  ) => router.push({ pathname, params: { id: contrato.id } });

  // Cancelado el programado, se vuelve a la lista con el estado ya actualizado.
  useEffect(() => {
    if (cancelarProgramado.fase === 'exito') router.replace('/contratos-arrendador');
  }, [cancelarProgramado.fase, router]);

  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Acciones
      </Texto>
      <Boton
        titulo="Estado de cuenta"
        variante="secundario"
        ancho="completo"
        onPress={() => ir('/contrato/[id]/estado-cuenta')}
      />
      {a.incremento ? (
        <Boton
          titulo="Aplicar incremento"
          variante="secundario"
          ancho="completo"
          onPress={() => ir('/contrato/[id]/incremento')}
        />
      ) : null}
      {a.prorroga ? (
        <Boton
          titulo="Prorrogar contrato"
          variante="secundario"
          ancho="completo"
          onPress={() => ir('/contrato/[id]/prorroga')}
        />
      ) : null}
      {a.darAviso ? (
        <Boton
          titulo="Dar aviso de no renovación"
          variante="secundario"
          ancho="completo"
          onPress={() => ir('/contrato/[id]/aviso')}
        />
      ) : null}

      {a.cancelarAviso ? (
        <>
          <Boton
            titulo="Cancelar aviso"
            tituloCargando="Cancelando aviso…"
            cargando={cancelarAviso.fase === 'enviando' || cancelarAviso.fase === 'verificando'}
            variante="secundario"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Cancelar aviso',
                'El contrato seguirá su curso: sin aviso, se prorroga automáticamente por el mismo término.',
                'Cancelar aviso',
                () => void cancelarAviso.iniciar(() => cancelarAvisoNoRenovacion(contrato.id)),
              )
            }
          />
          <MensajeAccion
            fase={cancelarAviso.fase}
            error={cancelarAviso.error}
            onVerificar={() => void cancelarAviso.verificar()}
          />
        </>
      ) : null}
      {cancelarAviso.fase === 'exito' ? <Aviso tono="exito" mensaje="Aviso cancelado." /> : null}

      {a.cancelarProgramado ? (
        <>
          <Boton
            titulo="Cancelar contrato programado"
            tituloCargando="Cancelando…"
            cargando={
              cancelarProgramado.fase === 'enviando' || cancelarProgramado.fase === 'verificando'
            }
            variante="destructivo"
            ancho="completo"
            onPress={() =>
              confirmarAccion(
                'Cancelar contrato programado',
                'El contrato quedará Cancelado, no se borra nada, el código de acceso dejará de servir y las fechas quedan libres para otro contrato.',
                'Cancelar contrato',
                () => void cancelarProgramado.iniciar(() => cancelarProgramadoApi(contrato.id)),
                true,
              )
            }
          />
          <MensajeAccion
            fase={cancelarProgramado.fase}
            error={cancelarProgramado.error}
            onVerificar={() => void cancelarProgramado.verificar()}
          />
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  opcion: {
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    borderRadius: radios.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tintaAlfa(0.06),
  },
  opcionActiva: { backgroundColor: colores.tinta },
});
