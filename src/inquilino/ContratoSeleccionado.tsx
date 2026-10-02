import type { UseQueryResult } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import type { ContratoInquilinoResumen } from '../api/inquilino';
import { useContratosInquilino } from '../consultas/inquilino';
import { useSesion } from '../sesion/SesionProvider';
import { resolverSeleccion } from './seleccion';

export interface ContratoSeleccionado {
  /** La consulta de GET /inquilino/contratos (cargando, error y reintento). */
  lista: UseQueryResult<ContratoInquilinoResumen[]>;
  /** El contrato elegido, o el primero de la lista si no hay elegido válido; null sin contratos. */
  contratoId: string | null;
  contrato: ContratoInquilinoResumen | null;
  seleccionar: (id: string) => void;
  /** Olvida la elección (al cerrar sesión). */
  limpiar: () => void;
}

const Contexto = createContext<ContratoSeleccionado | null>(null);

/**
 * Id del contrato elegido por el inquilino, solo en memoria. Si el elegido deja de estar en la lista
 * (desvinculado, cancelado) vale el primero. La elección pertenece a la cuenta que la hizo: si la
 * sesión cambia o se cierra, deja de valer.
 */
export function ContratoSeleccionadoProvider({ children }: { children: ReactNode }) {
  const lista = useContratosInquilino();
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  const [eleccion, setEleccion] = useState<{ usuarioId: string | null; id: string | null }>({
    usuarioId: null,
    id: null,
  });

  const seleccionar = useCallback((id: string) => setEleccion({ usuarioId, id }), [usuarioId]);
  const limpiar = useCallback(() => setEleccion({ usuarioId: null, id: null }), []);

  const elegido = eleccion.usuarioId === usuarioId ? eleccion.id : null;
  const contratoId = lista.data ? resolverSeleccion(lista.data, elegido) : null;
  const contrato = lista.data?.find((c) => c.id === contratoId) ?? null;

  return (
    <Contexto.Provider value={{ lista, contratoId, contrato, seleccionar, limpiar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useContratoSeleccionado(): ContratoSeleccionado {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error(
      'useContratoSeleccionado debe usarse dentro de <ContratoSeleccionadoProvider>.',
    );
  }
  return valor;
}
