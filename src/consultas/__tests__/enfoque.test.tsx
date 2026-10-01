import { act, create } from 'react-test-renderer';

import { useRefrescarAlEnfocar } from '../enfoque';

const mockEnfoques: (() => void)[] = [];
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (efecto: () => void) => {
      useEffect(() => {
        mockEnfoques.push(efecto);
        return efecto();
      }, [efecto]);
    },
  };
});

type Consulta = { isStale: boolean; isError: boolean; refetch: () => unknown };

function Pantalla({ consulta }: { consulta: Consulta }) {
  useRefrescarAlEnfocar(consulta);
  return null;
}

const enfocar = () =>
  act(() => {
    mockEnfoques[mockEnfoques.length - 1]();
  });

beforeEach(() => {
  mockEnfoques.length = 0;
});

describe('useRefrescarAlEnfocar', () => {
  it('no refresca en el primer enfoque (la consulta ya carga al montar)', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: true, isError: false, refetch }} />);
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('con datos frescos NO pide nada al volver a enfocar', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: false, isError: false, refetch }} />);
    });
    enfocar();
    enfocar();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('con datos viejos SÍ refresca al volver a enfocar', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: true, isError: false, refetch }} />);
    });
    enfocar();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('con error refresca aunque los datos no estén viejos', async () => {
    const refetch = jest.fn();
    await act(async () => {
      create(<Pantalla consulta={{ isStale: false, isError: true, refetch }} />);
    });
    enfocar();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('usa el estado más reciente de la consulta: fresca al montar, vieja después', async () => {
    const refetch = jest.fn();
    let raiz!: ReturnType<typeof create>;
    await act(async () => {
      raiz = create(<Pantalla consulta={{ isStale: false, isError: false, refetch }} />);
    });
    enfocar();
    expect(refetch).not.toHaveBeenCalled();
    await act(async () => {
      raiz.update(<Pantalla consulta={{ isStale: true, isError: false, refetch }} />);
    });
    enfocar();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
