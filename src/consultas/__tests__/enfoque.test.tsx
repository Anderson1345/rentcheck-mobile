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

function Pantalla({ refrescar }: { refrescar: () => unknown }) {
  useRefrescarAlEnfocar(refrescar);
  return null;
}

beforeEach(() => {
  mockEnfoques.length = 0;
});

describe('useRefrescarAlEnfocar', () => {
  it('no refresca en el primer enfoque (la consulta ya carga al montar)', async () => {
    const refrescar = jest.fn();
    await act(async () => {
      create(<Pantalla refrescar={refrescar} />);
    });
    expect(refrescar).not.toHaveBeenCalled();
  });

  it('refresca cada vez que la pantalla vuelve a enfocarse', async () => {
    const refrescar = jest.fn();
    await act(async () => {
      create(<Pantalla refrescar={refrescar} />);
    });
    act(() => {
      mockEnfoques[mockEnfoques.length - 1]();
    });
    expect(refrescar).toHaveBeenCalledTimes(1);
    act(() => {
      mockEnfoques[mockEnfoques.length - 1]();
    });
    expect(refrescar).toHaveBeenCalledTimes(2);
  });

  it('usa siempre la última función de refresco', async () => {
    const primera = jest.fn();
    const segunda = jest.fn();
    let raiz!: ReturnType<typeof create>;
    await act(async () => {
      raiz = create(<Pantalla refrescar={primera} />);
    });
    await act(async () => {
      raiz.update(<Pantalla refrescar={segunda} />);
    });
    act(() => {
      mockEnfoques[mockEnfoques.length - 1]();
    });
    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
  });
});
