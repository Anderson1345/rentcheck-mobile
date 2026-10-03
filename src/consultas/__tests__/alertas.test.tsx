import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import type { Alerta, FeedAlertas } from '../../api/alertas';
import {
  clavesAlertas,
  useConteoAlertas,
  useFeedAlertas,
  useMarcarAlertaLeida,
  useMarcarTodasLeidas,
} from '../alertas';

const mockFeed = jest.fn();
const mockConteo = jest.fn();
const mockMarcarUna = jest.fn();
const mockMarcarTodas = jest.fn();
jest.mock('../../api/alertas', () => ({
  obtenerFeedAlertas: (...a: unknown[]) => mockFeed(...a),
  obtenerConteoAlertas: (...a: unknown[]) => mockConteo(...a),
  marcarAlertaLeida: (...a: unknown[]) => mockMarcarUna(...a),
  marcarTodasLeidas: (...a: unknown[]) => mockMarcarTodas(...a),
}));

const alerta = (id: string, extra: Partial<Alerta> = {}): Alerta => ({
  id,
  tipo: 'PAGO_APROBADO',
  mensaje: `Mensaje ${id}`,
  leida: false,
  creado_en: '2026-10-02T15:04:00.000Z',
  recurso: null,
  ...extra,
});
const pagina = (ids: string[], siguiente: string | null, noLeidas = 3): FeedAlertas => ({
  items: ids.map((id) => alerta(id)),
  siguiente_cursor: siguiente,
  no_leidas: noLeidas,
});

type Hooks = {
  feed: ReturnType<typeof useFeedAlertas>;
  conteo: ReturnType<typeof useConteoAlertas>;
  marcarUna: ReturnType<typeof useMarcarAlertaLeida>;
  marcarTodas: ReturnType<typeof useMarcarTodasLeidas>;
};
let actual!: Hooks;
let cliente!: QueryClient;

function Arnes({ rol }: { rol: 'arrendador' | 'inquilino' }) {
  const resultado: Hooks = {
    feed: useFeedAlertas(rol),
    conteo: useConteoAlertas(rol),
    marcarUna: useMarcarAlertaLeida(rol),
    marcarTodas: useMarcarTodasLeidas(rol),
  };
  useEffect(() => {
    actual = resultado;
  });
  return null;
}

async function montar(rol: 'arrendador' | 'inquilino') {
  cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  await act(async () => {
    create(
      <QueryClientProvider client={cliente}>
        <Arnes rol={rol} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
}

beforeEach(() => {
  mockFeed.mockReset().mockResolvedValue(pagina(['a1', 'a2'], null));
  mockConteo.mockReset().mockResolvedValue({ no_leidas: 2 });
  mockMarcarUna.mockReset().mockResolvedValue(undefined);
  mockMarcarTodas.mockReset().mockResolvedValue({ marcadas: 2 });
});

describe('claves de alertas: cuelgan de la raíz del rol', () => {
  it('arrendador y inquilino empiezan por su raíz (la limpieza y las invalidaciones las alcanzan)', () => {
    expect(clavesAlertas.todos('arrendador')).toEqual(['arrendador', 'alertas']);
    expect(clavesAlertas.feed('arrendador')).toEqual(['arrendador', 'alertas', 'feed']);
    expect(clavesAlertas.conteo('arrendador')).toEqual(['arrendador', 'alertas', 'conteo']);
    expect(clavesAlertas.todos('inquilino')).toEqual(['inquilino', 'alertas']);
    expect(clavesAlertas.feed('inquilino')).toEqual(['inquilino', 'alertas', 'feed']);
    expect(clavesAlertas.conteo('inquilino')).toEqual(['inquilino', 'alertas', 'conteo']);
  });
});

describe('useFeedAlertas', () => {
  it('la primera página se pide sin cursor y hasNextPage sigue siguiente_cursor', async () => {
    mockFeed.mockResolvedValue(pagina(['a1', 'a2'], 'CURSOR_2'));
    await montar('inquilino');
    expect(mockFeed).toHaveBeenCalledWith('inquilino', undefined);
    expect(actual.feed.data?.pages).toHaveLength(1);
    expect(actual.feed.hasNextPage).toBe(true);
  });

  it('sin siguiente_cursor no hay más páginas', async () => {
    await montar('arrendador');
    expect(actual.feed.hasNextPage).toBe(false);
  });

  it('pedir más acumula las páginas y envía el cursor de la anterior', async () => {
    mockFeed
      .mockResolvedValueOnce(pagina(['a1', 'a2'], 'CURSOR_2'))
      .mockResolvedValueOnce(pagina(['a3'], null));
    await montar('arrendador');
    expect(actual.feed.hasNextPage).toBe(true);
    let resultado!: Awaited<ReturnType<typeof actual.feed.fetchNextPage>>;
    await act(async () => {
      resultado = await actual.feed.fetchNextPage();
    });
    expect(mockFeed).toHaveBeenNthCalledWith(1, 'arrendador', undefined);
    expect(mockFeed).toHaveBeenNthCalledWith(2, 'arrendador', 'CURSOR_2');
    // Lo que devuelve fetchNextPage y lo que queda en la caché del rol: las dos páginas, en orden.
    const idsDe = (paginas: FeedAlertas[] | undefined) =>
      paginas?.flatMap((p) => p.items.map((a) => a.id));
    expect(idsDe(resultado.data?.pages)).toEqual(['a1', 'a2', 'a3']);
    const enCache = cliente.getQueryData<{ pages: FeedAlertas[] }>(
      clavesAlertas.feed('arrendador'),
    );
    expect(idsDe(enCache?.pages)).toEqual(['a1', 'a2', 'a3']);
    expect(resultado.hasNextPage).toBe(false);
  });

  it('el feed y el conteo de un rol viven bajo su raíz en la caché', async () => {
    await montar('inquilino');
    expect(cliente.getQueryData(clavesAlertas.feed('inquilino'))).toBeDefined();
    expect(cliente.getQueryData(clavesAlertas.conteo('inquilino'))).toEqual({
      no_leidas: 2,
    });
    expect(cliente.getQueryCache().findAll({ queryKey: ['inquilino'] }).length).toBeGreaterThan(1);
    expect(cliente.getQueryCache().findAll({ queryKey: ['arrendador'] })).toHaveLength(0);
  });

  it('vaciar la caché (cierre de sesión) no deja nada de alertas', async () => {
    await montar('arrendador');
    cliente.clear();
    expect(cliente.getQueryCache().findAll()).toHaveLength(0);
  });
});

describe('useConteoAlertas', () => {
  it('devuelve el conteo del rol', async () => {
    mockConteo.mockResolvedValue({ no_leidas: 7 });
    await montar('arrendador');
    expect(mockConteo).toHaveBeenCalledWith('arrendador');
    expect(actual.conteo.data).toEqual({ no_leidas: 7 });
  });
});

describe('marcar leídas', () => {
  it('marcar una llama a la API con el rol y el id, e invalida el feed y el conteo', async () => {
    await montar('inquilino');
    mockFeed.mockClear();
    mockConteo.mockClear();
    await act(async () => {
      await actual.marcarUna.mutateAsync('a1');
    });
    expect(mockMarcarUna).toHaveBeenCalledWith('inquilino', 'a1');
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });
    expect(mockFeed).toHaveBeenCalled();
    expect(mockConteo).toHaveBeenCalled();
  });

  it('marcar todas llama a la API con el rol e invalida el feed y el conteo', async () => {
    await montar('arrendador');
    mockFeed.mockClear();
    mockConteo.mockClear();
    await act(async () => {
      await actual.marcarTodas.mutateAsync();
    });
    expect(mockMarcarTodas).toHaveBeenCalledWith('arrendador');
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });
    expect(mockFeed).toHaveBeenCalled();
    expect(mockConteo).toHaveBeenCalled();
  });

  it('marcar las alertas de un rol no invalida las del otro', async () => {
    await montar('inquilino');
    cliente.setQueryData(clavesAlertas.conteo('arrendador'), { no_leidas: 9 });
    await act(async () => {
      await actual.marcarUna.mutateAsync('a1');
    });
    expect(cliente.getQueryState(clavesAlertas.conteo('arrendador'))?.isInvalidated).toBe(false);
  });

  it('si marcar una falla, la mutación termina en error sin lanzar al llamar mutate', async () => {
    mockMarcarUna.mockRejectedValue(new Error('sin red'));
    await montar('arrendador');
    await act(async () => {
      actual.marcarUna.mutate('a1');
      await new Promise<void>((r) => setTimeout(r, 10));
    });
    expect(actual.marcarUna.isError).toBe(true);
  });
});
