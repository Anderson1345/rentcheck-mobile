import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import {
  clavesInmuebles,
  useActualizarUnidad,
  useCrearUnidad,
  useEliminarInmueble,
  useEliminarUnidad,
  useInmueble,
  useInmuebles,
  useSubirFotoUnidad,
} from '../inmuebles';
import { useActualizarPerfil, usePerfil, useSubirFotoCedula } from '../perfil';

const mockListar = jest.fn();
const mockObtener = jest.fn();
const mockCrearUnidad = jest.fn();
const mockActUnidad = jest.fn();
const mockElimUnidad = jest.fn();
const mockElimInmueble = jest.fn();
const mockFotoUnidad = jest.fn();
const mockPerfil = jest.fn();
const mockActPerfil = jest.fn();
const mockFotoCedula = jest.fn();
jest.mock('../../api/inmuebles', () => ({
  listarInmuebles: (...a: unknown[]) => mockListar(...a),
  obtenerInmueble: (...a: unknown[]) => mockObtener(...a),
  crearUnidad: (...a: unknown[]) => mockCrearUnidad(...a),
  actualizarUnidad: (...a: unknown[]) => mockActUnidad(...a),
  eliminarUnidad: (...a: unknown[]) => mockElimUnidad(...a),
  eliminarInmueble: (...a: unknown[]) => mockElimInmueble(...a),
  subirFotoUnidad: (...a: unknown[]) => mockFotoUnidad(...a),
  actualizarInmueble: jest.fn(),
  crearInmuebleConFoto: jest.fn(),
  subirFotoPortada: jest.fn(),
}));
jest.mock('../../api/perfil', () => ({
  obtenerPerfil: (...a: unknown[]) => mockPerfil(...a),
  actualizarPerfil: (...a: unknown[]) => mockActPerfil(...a),
  subirFotoCedula: (...a: unknown[]) => mockFotoCedula(...a),
}));

const FOTO = { uri: 'file:///f.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
let cliente!: QueryClient;
let raiz!: ReturnType<typeof create>;
let detalleHabilitado = true;
let h!: Record<string, any>;

function Arnes() {
  const r = {
    lista: useInmuebles(),
    detalle: useInmueble('i1', detalleHabilitado),
    crearU: useCrearUnidad('i1'),
    editarU: useActualizarUnidad('i1', 'u1'),
    elimU: useEliminarUnidad('i1', 'u1'),
    fotoU: useSubirFotoUnidad('i1', 'u1'),
    elimI: useEliminarInmueble('i1'),
    perfil: usePerfil(),
    editarP: useActualizarPerfil(),
    fotoC: useSubirFotoCedula(),
  };
  useEffect(() => {
    h = r;
  });
  return null;
}
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
  detalleHabilitado = true;
  await act(async () => {
    raiz = create(
      <QueryClientProvider client={cliente}>
        <Arnes />
      </QueryClientProvider>,
    );
  });
  await esperar();
}

beforeEach(() => {
  for (const m of [
    mockListar,
    mockObtener,
    mockCrearUnidad,
    mockActUnidad,
    mockElimUnidad,
    mockElimInmueble,
    mockFotoUnidad,
    mockPerfil,
    mockActPerfil,
    mockFotoCedula,
  ]) {
    m.mockReset();
  }
  mockListar.mockResolvedValue([]);
  mockObtener.mockResolvedValue({ id: 'i1', unidades: [] });
  mockPerfil.mockResolvedValue({ id: 'a1', nombre: 'M' });
  for (const m of [
    mockCrearUnidad,
    mockActUnidad,
    mockElimUnidad,
    mockElimInmueble,
    mockFotoUnidad,
    mockActPerfil,
    mockFotoCedula,
  ]) {
    m.mockResolvedValue({ id: 'x' });
  }
});

describe.each([
  [
    'crear unidad',
    () => h.crearU.mutateAsync({ nombre: 'L' }),
    () => mockCrearUnidad,
    ['i1', { nombre: 'L' }],
  ],
  [
    'editar unidad',
    () => h.editarU.mutateAsync({ nombre: 'L' }),
    () => mockActUnidad,
    ['i1', 'u1', { nombre: 'L' }],
  ],
  ['eliminar unidad', () => h.elimU.mutateAsync(), () => mockElimUnidad, ['i1', 'u1']],
  ['foto de unidad', () => h.fotoU.mutateAsync(FOTO), () => mockFotoUnidad, ['i1', 'u1', FOTO]],
])('%s', (_n, ejecutar, mock, args) => {
  it('llama a la API y recarga lista y detalle', async () => {
    await montar();
    await act(async () => {
      await ejecutar();
    });
    await esperar();
    expect(mock()).toHaveBeenCalledWith(...(args as unknown[]));
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });
});

describe('eliminar inmueble', () => {
  it('quita el detalle de la caché (sin pedirlo otra vez → sin 404) y recarga la lista', async () => {
    await montar();
    expect(cliente.getQueryData(clavesInmuebles.detalle('i1'))).toBeDefined();
    // La pantalla deja de consultar el detalle ANTES de eliminar (si no, lo pediría y daría 404).
    detalleHabilitado = false;
    await act(async () => {
      raiz.update(
        <QueryClientProvider client={cliente}>
          <Arnes />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await h.elimI.mutateAsync();
    });
    await esperar();
    expect(mockElimInmueble).toHaveBeenCalledWith('i1');
    expect(cliente.getQueryData(clavesInmuebles.detalle('i1'))).toBeUndefined();
    expect(mockObtener).toHaveBeenCalledTimes(1);
    expect(mockListar).toHaveBeenCalledTimes(2);
  });

  it('si el servidor responde 409, no toca la caché', async () => {
    mockElimInmueble.mockRejectedValue(new Error('409'));
    await montar();
    await act(async () => {
      await h.elimI.mutateAsync().catch(() => undefined);
    });
    expect(cliente.getQueryData(clavesInmuebles.detalle('i1'))).toBeDefined();
    expect(mockListar).toHaveBeenCalledTimes(1);
  });
});

describe('perfil', () => {
  it('guardar y subir la foto de cédula recargan el perfil', async () => {
    await montar();
    expect(mockPerfil).toHaveBeenCalledTimes(1);
    await act(async () => {
      await h.editarP.mutateAsync({ nombre: 'N' });
    });
    await esperar();
    expect(mockActPerfil).toHaveBeenCalledWith({ nombre: 'N' });
    expect(mockPerfil).toHaveBeenCalledTimes(2);
    await act(async () => {
      await h.fotoC.mutateAsync(FOTO);
    });
    await esperar();
    expect(mockFotoCedula).toHaveBeenCalledWith(FOTO);
    expect(mockPerfil).toHaveBeenCalledTimes(3);
  });
});
