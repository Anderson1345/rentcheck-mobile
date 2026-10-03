import { act, create } from 'react-test-renderer';

import { useRefrescarAlVolverAPrimerPlano } from '../primerPlano';

type Escucha = (estado: string) => void;
const mockEscuchas: Escucha[] = [];
const mockQuitar = jest.fn();
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: (_evento: string, escucha: Escucha) => {
      mockEscuchas.push(escucha);
      return { remove: mockQuitar };
    },
  },
}));

type Consulta = { isStale: boolean; isError: boolean; refetch: () => unknown };

function Pantalla({ consulta }: { consulta: Consulta }) {
  useRefrescarAlVolverAPrimerPlano(consulta);
  return null;
}

const emitir = (estado: string) =>
  act(() => {
    mockEscuchas.forEach((e) => e(estado));
  });

beforeEach(() => {
  mockEscuchas.length = 0;
  mockQuitar.mockReset();
});

describe('useRefrescarAlVolverAPrimerPlano', () => {
  it('al volver a primer plano con datos viejos, refresca', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: true, isError: false, refetch }} />);
    });
    emitir('background');
    expect(refetch).not.toHaveBeenCalled();
    emitir('active');
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('con datos frescos (menos de su staleTime) no pide nada: volver de la cámara no dispara una petición', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: false, isError: false, refetch }} />);
    });
    emitir('inactive');
    emitir('active');
    expect(refetch).not.toHaveBeenCalled();
  });

  it('con error refresca aunque los datos no estén viejos', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: false, isError: true, refetch }} />);
    });
    emitir('background');
    emitir('active');
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('un "active" que ya estaba activo no cuenta como volver', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: true, isError: false, refetch }} />);
    });
    emitir('active');
    expect(refetch).not.toHaveBeenCalled();
  });

  it('usa la consulta más reciente y deja de escuchar al desmontar', async () => {
    const viejo = jest.fn();
    const nuevo = jest.fn();
    let raiz!: ReturnType<typeof create>;
    await act(async () => {
      raiz = create(<Pantalla consulta={{ isStale: true, isError: false, refetch: viejo }} />);
    });
    await act(async () => {
      raiz.update(<Pantalla consulta={{ isStale: true, isError: false, refetch: nuevo }} />);
    });
    emitir('background');
    emitir('active');
    expect(viejo).not.toHaveBeenCalled();
    expect(nuevo).toHaveBeenCalledTimes(1);
    await act(async () => raiz.unmount());
    expect(mockQuitar).toHaveBeenCalled();
  });
});
