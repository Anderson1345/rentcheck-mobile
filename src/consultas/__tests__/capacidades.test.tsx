import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create } from 'react-test-renderer';

import type { Capacidades } from '../../api/auth';
import { ErrorSinConexion } from '../../api/cliente';
import { useCapacidades } from '../capacidades';

const mockObtener = jest.fn();
jest.mock('../../api/auth', () => ({
  ...jest.requireActual('../../api/auth'),
  obtenerCapacidades: () => mockObtener(),
}));

async function usarHook() {
  const cliente = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const salida: { actual?: Capacidades } = {};
  function Sonda() {
    salida.actual = useCapacidades();
    return null;
  }
  let raiz!: ReturnType<typeof create>;
  await act(async () => {
    raiz = create(
      <QueryClientProvider client={cliente}>
        <Sonda />
      </QueryClientProvider>,
    );
  });
  montados.push({ desmontar: () => raiz.unmount(), cliente });
  // La respuesta llega después del primer render: se dejan correr varios ciclos.
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise<void>((resolver) => setTimeout(resolver, 10));
    });
  }
  return { salida, cliente };
}

const montados: { desmontar: () => void; cliente: QueryClient }[] = [];

beforeEach(() => mockObtener.mockReset());

// Cada prueba desmonta su árbol y vacía su caché: así ninguna deja consultas vivas para la siguiente.
afterEach(() => {
  for (const { desmontar, cliente } of montados.splice(0)) {
    act(() => desmontar());
    cliente.clear();
  }
});

describe('useCapacidades', () => {
  it('mientras carga, asume que ambas funciones están apagadas', async () => {
    mockObtener.mockReturnValue(new Promise(() => undefined));
    const { salida } = await usarHook();
    expect(salida.actual).toEqual({ verificacion_correo: false, recuperacion_contrasena: false });
  });

  it('éxito: devuelve lo que responde el servidor', async () => {
    mockObtener.mockResolvedValue({ verificacion_correo: true, recuperacion_contrasena: true });
    const { salida } = await usarHook();
    expect(salida.actual).toEqual({ verificacion_correo: true, recuperacion_contrasena: true });
  });

  it('cada función se lee por separado', async () => {
    mockObtener.mockResolvedValue({ verificacion_correo: false, recuperacion_contrasena: true });
    const { salida } = await usarHook();
    expect(salida.actual).toEqual({ verificacion_correo: false, recuperacion_contrasena: true });
  });

  it('fallo (sin conexión): se asume false y no se reintenta', async () => {
    mockObtener.mockRejectedValue(new ErrorSinConexion());
    const { salida } = await usarHook();
    expect(salida.actual).toEqual({ verificacion_correo: false, recuperacion_contrasena: false });
    expect(mockObtener).toHaveBeenCalledTimes(1);
  });

  it('una respuesta con otra forma también se trata como apagada', async () => {
    mockObtener.mockResolvedValue({ cualquier: 'cosa' });
    const { salida } = await usarHook();
    expect(salida.actual).toEqual({ verificacion_correo: false, recuperacion_contrasena: false });
  });

  it('se guarda 5 minutos: un segundo uso no vuelve a pedir', async () => {
    mockObtener.mockResolvedValue({ verificacion_correo: true, recuperacion_contrasena: true });
    const { cliente } = await usarHook();
    expect(
      cliente.getQueryCache().find({ queryKey: ['capacidades'] })?.observers[0]?.options.staleTime,
    ).toBe(5 * 60_000);
  });
});
