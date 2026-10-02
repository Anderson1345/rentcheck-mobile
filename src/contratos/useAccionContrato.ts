import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import { type ContratoDetalle, obtenerContrato } from '../api/contratos';
import { esConflictoDeEstado, mensajeDeErrorAccion } from '../api/errores';
import { clavesContratos } from '../consultas/contratos';
import { type AccionContrato, type DetalleAccionable, huboCambio } from './acciones';

export type FaseAccion = 'inactivo' | 'enviando' | 'verificando' | 'exito' | 'incierto';

/** Otra forma de comprobar si la acción se aplicó (p. ej. la lista de documentos). */
export interface Verificador<T> {
  leer: () => Promise<T>;
  cambio: (leido: T) => boolean;
}

/**
 * De dónde se lee el detalle del recurso y qué claves de consulta se invalidan. Por defecto, el del
 * contrato del arrendador; el portal del inquilino pasa el suyo y los pagos del arrendador (E7-B) el
 * suyo, con su propia comparación (`huboCambio`). Es lo que hace neutro al hook.
 */
export interface FuenteDetalle<D extends object = ContratoDetalle> {
  obtener: (id: string) => Promise<D>;
  /**
   * ¿La acción ya se aplicó? Por defecto compara contratos (`huboCambio` de acciones.ts); un recurso
   * que no es un contrato aporta la suya.
   */
  huboCambio?: (accion: AccionContrato, antes: D, despues: D) => boolean;
  claves: {
    /** Prefijo que cuelga todo el contrato (detalle, lista, documentos, estado de cuenta). */
    todos: readonly unknown[];
    detalle: (id: string) => readonly unknown[];
  };
}

export const FUENTE_ARRENDADOR: FuenteDetalle = {
  obtener: (id) => obtenerContrato(id),
  claves: clavesContratos,
};

export const MENSAJE_NO_SE_APLICO = 'No se aplicó. Puedes intentarlo de nuevo.';
export const MENSAJE_VERIFICANDO = 'No sabemos si se aplicó. Verificando…';
const MENSAJE_INCIERTO =
  'No sabemos si se aplicó y no pudimos comprobarlo. Verifica antes de intentarlo de nuevo.';

/**
 * Ejecuta una acción del contrato (incremento, prórroga, aviso…): el doble toque no la repite, un
 * éxito vuelve a pedir detalle, lista, documentos y estado de cuenta, y "sin respuesta" NO da el
 * éxito por hecho ni reintenta sola: recarga el detalle y compara con lo que había antes.
 */
export function useAccionContrato<R = unknown, T = unknown, D extends object = ContratoDetalle>(
  contratoId: string,
  accion: AccionContrato,
  fuente: FuenteDetalle<D> = FUENTE_ARRENDADOR as unknown as FuenteDetalle<D>,
) {
  const cliente = useQueryClient();
  const [fase, setFase] = useState<FaseAccion>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<R | null>(null);
  const [despues, setDespues] = useState<D | null>(null);
  const [leido, setLeido] = useState<T | null>(null);
  const [recargable, setRecargable] = useState(false);
  const verificador = useRef<Verificador<T> | null>(null);
  const antes = useRef<D | null>(null);
  const [previo, setPrevio] = useState<D | null>(null);
  const enCurso = useRef(false);

  /** Detalle, lista, documentos y estado de cuenta: todo cuelga de la clave "contratos". */
  async function refrescar() {
    await cliente.invalidateQueries({ queryKey: fuente.claves.todos });
  }

  /** Compara el detalle real con el de antes; true si la acción se aplicó (y ya refrescó todo). */
  async function verificarCambio(): Promise<boolean | null> {
    try {
      if (verificador.current) {
        const resultadoLeido = await verificador.current.leer();
        if (verificador.current.cambio(resultadoLeido)) {
          setLeido(resultadoLeido);
          await refrescar();
          return true;
        }
        return false;
      }
      const actual = await fuente.obtener(contratoId);
      const previo = antes.current;
      const comparar =
        fuente.huboCambio ??
        ((a: AccionContrato, x: D, y: D) =>
          huboCambio(a, x as DetalleAccionable, y as DetalleAccionable));
      if (previo && comparar(accion, previo, actual)) {
        cliente.setQueryData(fuente.claves.detalle(contratoId), actual);
        setDespues(actual);
        await refrescar();
        return true;
      }
      return false;
    } catch {
      return null;
    }
  }

  async function iniciar(ejecutar: () => Promise<R>, comprobacion?: Verificador<T>) {
    if (enCurso.current) return;
    enCurso.current = true;
    verificador.current = comprobacion ?? null;
    setRecargable(false);
    antes.current = cliente.getQueryData<D>(fuente.claves.detalle(contratoId)) ?? null;
    setPrevio(antes.current);
    setFase('enviando');
    setError(null);
    try {
      const respuesta = await ejecutar();
      setResultado(respuesta);
      await refrescar();
      setDespues(cliente.getQueryData<D>(fuente.claves.detalle(contratoId)) ?? null);
      setFase('exito');
    } catch (falla) {
      if (falla instanceof ErrorTimeout || falla instanceof ErrorSinConexion) {
        setFase('verificando');
        const aplicado = await verificarCambio();
        if (aplicado === true) setFase('exito');
        else if (aplicado === false) {
          setFase('inactivo');
          setError(MENSAJE_NO_SE_APLICO);
        } else {
          setFase('incierto');
          setError(MENSAJE_INCIERTO);
        }
      } else {
        setFase('inactivo');
        setError(mensajeDeErrorAccion(falla));
        // Alguien cambió el contrato: se refresca el detalle y se invita a recargar.
        if (esConflictoDeEstado(falla)) {
          setRecargable(true);
          void refrescar();
        }
      }
    } finally {
      enCurso.current = false;
    }
  }

  /** Vuelve a pedir el detalle (y todo lo que cuelga del contrato). */
  async function recargar() {
    await refrescar();
    setRecargable(false);
  }

  /** Botón "Verificar" cuando ni siquiera se pudo comprobar. */
  async function verificar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setFase('verificando');
    const aplicado = await verificarCambio();
    if (aplicado === true) setFase('exito');
    else if (aplicado === false) {
      setFase('inactivo');
      setError(MENSAJE_NO_SE_APLICO);
    } else {
      setFase('incierto');
      setError(MENSAJE_INCIERTO);
    }
    enCurso.current = false;
  }

  return {
    fase,
    error,
    resultado,
    /** Detalle de antes de ejecutar (para mostrar "canon anterior"). */
    antes: previo,
    despues,
    /** Lo que leyó el verificador (si se usó). */
    leido,
    recargable,
    recargar,
    iniciar,
    verificar,
  };
}

/**
 * Para los PATCH de corrección: son idempotentes (sin cambios reales no hacen nada), así que tras
 * "sin respuesta" se deja reintentar directamente, sin dar el éxito por hecho.
 */
export function useEnvioReintentable<R = unknown>(contratoId: string) {
  const cliente = useQueryClient();
  const [fase, setFase] = useState<'inactivo' | 'enviando' | 'exito'>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<R | null>(null);
  const [recargable, setRecargable] = useState(false);
  const enCurso = useRef(false);

  async function enviar(ejecutar: () => Promise<R>) {
    if (enCurso.current) return;
    enCurso.current = true;
    setFase('enviando');
    setError(null);
    setRecargable(false);
    try {
      const respuesta = await ejecutar();
      setResultado(respuesta);
      await cliente.invalidateQueries({ queryKey: clavesContratos.todos });
      setFase('exito');
    } catch (falla) {
      setFase('inactivo');
      if (falla instanceof ErrorTimeout || falla instanceof ErrorSinConexion) {
        setError('No sabemos si se aplicó. Puedes reintentar: no se duplica nada.');
      } else {
        setError(mensajeDeErrorAccion(falla));
        if (esConflictoDeEstado(falla)) {
          setRecargable(true);
          void cliente.invalidateQueries({ queryKey: clavesContratos.todos });
        }
      }
    } finally {
      enCurso.current = false;
    }
  }

  return {
    fase,
    error,
    resultado,
    recargable,
    enviar,
    recargar: () => cliente.invalidateQueries({ queryKey: clavesContratos.todos }),
  };
}
