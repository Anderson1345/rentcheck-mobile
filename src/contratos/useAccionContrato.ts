import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import { type ContratoDetalle, obtenerContrato } from '../api/contratos';
import { mensajeDeErrorAccion } from '../api/errores';
import { clavesContratos } from '../consultas/contratos';
import { type AccionContrato, huboCambio } from './acciones';

export type FaseAccion = 'inactivo' | 'enviando' | 'verificando' | 'exito' | 'incierto';

export const MENSAJE_NO_SE_APLICO = 'No se aplicó. Puedes intentarlo de nuevo.';
export const MENSAJE_VERIFICANDO = 'No sabemos si se aplicó. Verificando…';
const MENSAJE_INCIERTO =
  'No sabemos si se aplicó y no pudimos comprobarlo. Verifica antes de intentarlo de nuevo.';

/**
 * Ejecuta una acción del contrato (incremento, prórroga, aviso…): el doble toque no la repite, un
 * éxito vuelve a pedir detalle, lista, documentos y estado de cuenta, y "sin respuesta" NO da el
 * éxito por hecho ni reintenta sola: recarga el detalle y compara con lo que había antes.
 */
export function useAccionContrato<R = unknown>(contratoId: string, accion: AccionContrato) {
  const cliente = useQueryClient();
  const [fase, setFase] = useState<FaseAccion>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<R | null>(null);
  const [despues, setDespues] = useState<ContratoDetalle | null>(null);
  const antes = useRef<ContratoDetalle | null>(null);
  const [previo, setPrevio] = useState<ContratoDetalle | null>(null);
  const enCurso = useRef(false);

  /** Detalle, lista, documentos y estado de cuenta: todo cuelga de la clave "contratos". */
  async function refrescar() {
    await cliente.invalidateQueries({ queryKey: clavesContratos.todos });
  }

  /** Compara el detalle real con el de antes; true si la acción se aplicó (y ya refrescó todo). */
  async function verificarCambio(): Promise<boolean | null> {
    try {
      const actual = await obtenerContrato(contratoId);
      const previo = antes.current;
      if (previo && huboCambio(accion, previo, actual)) {
        cliente.setQueryData(clavesContratos.detalle(contratoId), actual);
        setDespues(actual);
        await refrescar();
        return true;
      }
      return false;
    } catch {
      return null;
    }
  }

  async function iniciar(ejecutar: () => Promise<R>) {
    if (enCurso.current) return;
    enCurso.current = true;
    antes.current =
      cliente.getQueryData<ContratoDetalle>(clavesContratos.detalle(contratoId)) ?? null;
    setPrevio(antes.current);
    setFase('enviando');
    setError(null);
    try {
      const respuesta = await ejecutar();
      setResultado(respuesta);
      await refrescar();
      setDespues(
        cliente.getQueryData<ContratoDetalle>(clavesContratos.detalle(contratoId)) ?? null,
      );
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
      }
    } finally {
      enCurso.current = false;
    }
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
    iniciar,
    verificar,
  };
}
