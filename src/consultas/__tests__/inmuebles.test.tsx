import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import {
  STALE_TIME_INMUEBLES_MS,
  useActualizarInmueble,
  useCrearInmueble,
  useInmueble,
  useInmuebles,
  useSubirPortada,
} from '../inmuebles';

const mockListar = jest.fn();
const mockObtener = jest.fn();
const mockCrearConFoto = jest.fn();
const mockActualizar = jest.fn();
const mockSubirFoto = jest.fn();
jest.mock('../../api/inmuebles', () => ({
  listarInmuebles: (...a: unknown[]) => mockListar(...a),
  obtenerInmueble: (...a: unknown[]) => mockObtener(...a),
  crearInmuebleConFoto: (...a: unknown[]) => mockCrearConFoto(...a),
  actualizarInmueble: (...a: unknown[]) => mockActualizar(...a),
  subirFotoPortada: (...a: unknown[]) => mockSubirFoto(...a),
}));

const INMUEBLE = { id: 'i1', direccion: 'Calle 1', unidades: [] };
const FOTO = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
const DATOS = {
  direccion: 'Calle 1',
  ciudad: 'Bogotá',
  matricula_inmobiliaria: 'M-1',
  uso_unidad_principal: 'RESIDENCIAL' as const,
  estrato: 3,
};

type Hooks = {
  lista: ReturnType<typeof useInmuebles>;
  detalle: ReturnType<typeof useInmueble>;
  crear: ReturnType<typeof useCrearInmueble>;
  editar: ReturnType<typeof useActualizarInmueble>;
  portada: ReturnType<typeof useSubirPortada>;
};
let actual!: Hooks;
let cliente!: QueryClient;

function Arnes() {
  const resultado: Hooks = {
    lista: useInmuebles(),
    detalle: useInmueble('i1'),
    crear: useCrearInmueble(),
    editar: useActualizarInmueble('i1'),
    portada: useSubirPortada('i1'),
  };
  useEffect(() => {
    actual = resultado;
  });
  return null;
}

/** TanStack avisa de sus resultados con un setTimeout(0). */
const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });

async function montar() {
  cliente = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity },
    },
  });
  await act(async () => {
    create(
      <QueryClientProvider client={cliente}>
        <Arnes />
      </QueryClientProvider>,
    );
  });
  await esperar();
}

beforeEach(() => {
  mockListar.mockReset().mockResolvedValue([INMUEBLE]);
  mockObtener.mockReset().mockResolvedValue(INMUEBLE);
  mockCrearConFoto.mockReset().mockResolvedValue({ inmueble: INMUEBLE, fotoSubida: true });
  mockActualizar.mockReset().mockResolvedValue(INMUEBLE);
  mockSubirFoto.mockReset().mockResolvedValue(INMUEBLE);
});

describe('consultas de inmuebles', () => {
  it('lista y detalle cargan por sus funciones de la API', async () => {
    await montar();
    expect(actual.lista.data).toEqual([INMUEBLE]);
    expect(actual.detalle.data).toEqual(INMUEBLE);
    expect(mockObtener).toHaveBeenCalledWith('i1');
  });

  it('el tiempo de frescura es corto (máx. 5 min) porque las URLs firmadas expiran en 1 hora', () => {
    expect(STALE_TIME_INMUEBLES_MS).toBeGreaterThan(0);
    expect(STALE_TIME_INMUEBLES_MS).toBeLessThanOrEqual(5 * 60_000);
  });

  it('crear: llama a crearInmuebleConFoto y recarga la lista (y el detalle abierto)', async () => {
    await montar();
    expect(mockListar).toHaveBeenCalledTimes(1);

    await act(async () => {
      await actual.crear.mutateAsync({ datos: DATOS, foto: FOTO });
    });
    await esperar();

    expect(mockCrearConFoto).toHaveBeenCalledWith(DATOS, FOTO);
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it('crear sin foto: pasa la foto indefinida', async () => {
    await montar();
    await act(async () => {
      await actual.crear.mutateAsync({ datos: DATOS });
    });
    expect(mockCrearConFoto).toHaveBeenCalledWith(DATOS, undefined);
  });

  it('crear con la foto fallida: devuelve el inmueble con fotoSubida=false y recarga la lista igual', async () => {
    mockCrearConFoto.mockResolvedValue({
      inmueble: INMUEBLE,
      fotoSubida: false,
      errorFoto: new Error('x'),
    });
    await montar();

    let resultado: unknown;
    await act(async () => {
      resultado = await actual.crear.mutateAsync({ datos: DATOS, foto: FOTO });
    });
    await esperar();

    expect(resultado).toMatchObject({ inmueble: { id: 'i1' }, fotoSubida: false });
    expect(mockListar).toHaveBeenCalledTimes(2);
  });

  it('crear con error del servidor: no recarga y propaga el error', async () => {
    mockCrearConFoto.mockRejectedValue(new Error('400'));
    await montar();
    await act(async () => {
      await actual.crear.mutateAsync({ datos: DATOS }).catch(() => undefined);
    });
    await esperar();
    expect(mockListar).toHaveBeenCalledTimes(1);
    expect(actual.crear.isError).toBe(true);
  });

  it('editar: PATCH solo con los cambios y recarga lista y detalle', async () => {
    await montar();
    await act(async () => {
      await actual.editar.mutateAsync({ ciudad: 'Cali' });
    });
    await esperar();

    expect(mockActualizar).toHaveBeenCalledWith('i1', { ciudad: 'Cali' });
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it('cambiar la portada: sube la foto de ese inmueble y recarga lista y detalle', async () => {
    await montar();
    await act(async () => {
      await actual.portada.mutateAsync(FOTO);
    });
    await esperar();

    expect(mockSubirFoto).toHaveBeenCalledWith('i1', FOTO);
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it('reintentar la portada tras fallar no crea otro inmueble', async () => {
    mockCrearConFoto.mockResolvedValue({
      inmueble: INMUEBLE,
      fotoSubida: false,
      errorFoto: new Error('x'),
    });
    await montar();
    await act(async () => {
      await actual.crear.mutateAsync({ datos: DATOS, foto: FOTO });
    });
    await act(async () => {
      await actual.portada.mutateAsync(FOTO);
    });

    expect(mockCrearConFoto).toHaveBeenCalledTimes(1);
    expect(mockSubirFoto).toHaveBeenCalledTimes(1);
  });
});
