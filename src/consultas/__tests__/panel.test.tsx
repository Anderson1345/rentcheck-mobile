import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import type { PanelArrendador } from '../../api/panel';
import { clavesPanel, usePanelArrendador } from '../panel';

const mockObtener = jest.fn();
jest.mock('../../api/panel', () => ({
  obtenerPanelArrendador: (...a: unknown[]) => mockObtener(...a),
}));

const PANEL = { mes: '2026-10', calculado_para: '2026-10-02' } as PanelArrendador;

let actual!: ReturnType<typeof usePanelArrendador>;
let cliente!: QueryClient;

function Arnes() {
  const resultado = usePanelArrendador();
  useEffect(() => {
    actual = resultado;
  });
  return null;
}

async function montar() {
  cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await act(async () => {
    create(
      <QueryClientProvider client={cliente}>
        <Arnes />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
}

beforeEach(() => {
  mockObtener.mockReset().mockResolvedValue(PANEL);
});

describe('clavesPanel', () => {
  it('cuelga de la raíz del arrendador (el cierre de sesión que vacía la caché la alcanza)', () => {
    expect(clavesPanel.todos).toEqual(['arrendador', 'panel']);
  });
});

describe('usePanelArrendador', () => {
  it('pide el Panel una vez y lo guarda bajo la clave del arrendador', async () => {
    await montar();
    expect(mockObtener).toHaveBeenCalledTimes(1);
    expect(actual.data).toBe(PANEL);
    expect(cliente.getQueryData(['arrendador', 'panel'])).toBe(PANEL);
  });

  it('no hay intervalo: sin que nada lo invalide no vuelve a pedir', async () => {
    await montar();
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 60));
    });
    expect(mockObtener).toHaveBeenCalledTimes(1);
  });

  it('invalidar la clave del Panel lo vuelve a pedir (refresco al enfocar y pull-to-refresh)', async () => {
    await montar();
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: clavesPanel.todos });
    });
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it('con datos recién pedidos no está viejo; tras invalidar sí (lo que mira useRefrescarAlEnfocar)', async () => {
    await montar();
    expect(actual.isStale).toBe(false);
    await act(async () => {
      cliente.getQueryCache().find({ queryKey: clavesPanel.todos })?.invalidate();
    });
    expect(cliente.getQueryState(clavesPanel.todos)?.isInvalidated).toBe(true);
  });

  it('vaciar la caché (cierre de sesión) no deja nada del Panel', async () => {
    await montar();
    cliente.clear();
    expect(cliente.getQueryData(clavesPanel.todos)).toBeUndefined();
  });
});
