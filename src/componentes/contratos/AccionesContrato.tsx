// Piezas compartidas de las acciones sobre un contrato: confirmación, mensajes de una acción en curso,
// opciones excluyentes y la carga del contrato para las pantallas de formulario. Las acciones del detalle
// del arrendador viven en GestionarContrato (R2-B). R4-E: el resumen de lo que va a pasar (ResumenCambio)
// y los estados "no encontrado" y "no disponible" de las pantallas de acción del arrendador.
import { useRouter } from 'expo-router';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { ContratoDetalle } from '../../api/contratos';
import { ErrorApi } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import { useContrato } from '../../consultas/contratos';
import { type FaseAccion, MENSAJE_VERIFICANDO } from '../../contratos/useAccionContrato';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { EsqueletoCarga } from '../EsqueletoCarga';
import { EstadoMensaje } from '../EstadoMensaje';
import { PantallaPila } from '../PantallaPila';
import { Superficie } from '../Superficie';
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
  recargable = false,
  onRecargar,
}: {
  fase: FaseAccion;
  error: string | null;
  onVerificar: () => void;
  /** 409 por estado desactualizado: invita a recargar el contrato. */
  recargable?: boolean;
  onRecargar?: () => void;
}) {
  return (
    <>
      {fase === 'verificando' ? <Aviso tono="informacion" mensaje={MENSAJE_VERIFICANDO} /> : null}
      {error ? <Aviso mensaje={error} /> : null}
      {fase === 'incierto' ? (
        <Boton titulo="Verificar" variante="secundario" ancho="completo" onPress={onVerificar} />
      ) : null}
      {recargable && onRecargar ? (
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Puede que el contrato haya cambiado: recárgalo para ver su estado actual.
          </Texto>
          <Boton
            titulo="Recargar contrato"
            variante="secundario"
            ancho="completo"
            onPress={onRecargar}
          />
        </>
      ) : null}
    </>
  );
}

/** Una fila del resumen: qué cambia y cómo queda ("Canon actual", "$ 1.000.000"). */
export interface FilaCambio {
  etiqueta: string;
  /** Lo que se lee después de la etiqueta; en pantalla empieza con mayúscula. */
  valor: string;
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Resumen arriba de lo que va a pasar (R4-E): filas de un mismo contenedor, etiqueta a la izquierda y
 * valor a la derecha. Solo muestra datos del contrato y lo que eligió la persona; lo que calcula el
 * servidor (canon nuevo, nueva fecha de fin) se dice así, la app no lo calcula.
 */
export function ResumenCambio({
  titulo = 'Qué va a pasar',
  filas,
}: {
  titulo?: string;
  filas: readonly FilaCambio[];
}) {
  return (
    <View style={estilos.grupo}>
      <EncabezadoSeccion titulo={titulo} />
      <Superficie relleno="ninguno">
        {filas.map((fila, indice) => (
          <View
            key={fila.etiqueta}
            testID="fila-cambio"
            accessible
            accessibilityLabel={`${fila.etiqueta}: ${fila.valor}`}
            style={[estilos.filaCambio, indice > 0 && estilos.conSeparador]}
          >
            <Texto variante="secundario" color={colores.textoSecundario} style={estilos.etiqueta}>
              {fila.etiqueta}
            </Texto>
            <Texto variante="cuerpoFuerte" style={estilos.valor}>
              {conMayuscula(fila.valor)}
            </Texto>
          </View>
        ))}
      </Superficie>
    </View>
  );
}

/** 404 de una pantalla de acción del arrendador: el contrato no existe o no es suyo. */
export function NoEncontradoContrato() {
  const router = useRouter();
  return (
    <EstadoMensaje
      titulo="No encontrado"
      mensaje="Este contrato no existe o no tienes acceso a él."
    >
      <Boton
        titulo="Volver"
        variante="acento"
        ancho="completo"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/contratos-arrendador');
        }}
      />
    </EstadoMensaje>
  );
}

/**
 * La acción no se ofrece porque el servidor no la permite (los mismos booleanos y estados con los que
 * GestionarContrato decide qué fila mostrar): llegar por un enlace viejo no abre el formulario.
 */
export function AccionNoDisponible() {
  const router = useRouter();
  return (
    <PantallaPila>
      <EstadoMensaje
        titulo="Esta acción no está disponible"
        mensaje="El contrato cambió o su estado ya no la permite. Vuelve al contrato para ver qué puedes hacer."
      >
        <Boton
          titulo="Volver al contrato"
          variante="acento"
          ancho="completo"
          onPress={() => router.back()}
        />
      </EstadoMensaje>
    </PantallaPila>
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

/**
 * Carga el contrato para las pantallas de formulario: cargando, error con Reintentar o contenido.
 * Por defecto lee el detalle del arrendador; el portal del inquilino pasa su propia consulta
 * (`usar`, siempre la misma función: es un hook) y qué mostrar ante un 404 (`noEncontrado`).
 */
export function CargaContrato<D = ContratoDetalle>({
  id,
  children,
  usar = useContrato as unknown as (id: string) => UseQueryResult<D>,
  noEncontrado,
  sinMarco = false,
}: {
  id: string;
  children: (contrato: D) => ReactNode;
  usar?: (id: string) => UseQueryResult<D>;
  noEncontrado?: () => ReactNode;
  /** Con el contrato cargado, el contenido pone su propia PantallaPila (p. ej. con barra fija, R4-B). */
  sinMarco?: boolean;
}) {
  const { data, isPending, error, refetch } = usar(id);
  if (noEncontrado && error instanceof ErrorApi && error.status === 404) {
    return <PantallaPila>{noEncontrado()}</PantallaPila>;
  }
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
  if (sinMarco) return <>{children(data)}</>;
  return <PantallaPila>{children(data)}</PantallaPila>;
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  filaCambio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: 52,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  conSeparador: { borderTopWidth: 1, borderTopColor: tintaAlfa(0.07) },
  etiqueta: { flex: 1 },
  valor: { flex: 1, textAlign: 'right' },
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
