import { act, create } from 'react-test-renderer';

import { useCuentaRegresiva } from '../cuentaRegresiva';

function probar(segundos: number) {
  const salida: { restantes: number; reiniciar: () => void } = {
    restantes: -1,
    reiniciar: () => undefined,
  };
  function Sonda() {
    Object.assign(salida, useCuentaRegresiva(segundos));
    return null;
  }
  let raiz!: ReturnType<typeof create>;
  act(() => {
    raiz = create(<Sonda />);
  });
  return { salida, raiz };
}

describe('useCuentaRegresiva (reenvío de 60 s)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('empieza en los segundos indicados', () => {
    expect(probar(60).salida.restantes).toBe(60);
  });

  it('baja de a un segundo y se detiene en 0', () => {
    const { salida } = probar(60);
    act(() => jest.advanceTimersByTime(1000));
    expect(salida.restantes).toBe(59);
    act(() => jest.advanceTimersByTime(29_000));
    expect(salida.restantes).toBe(30);
    act(() => jest.advanceTimersByTime(30_000));
    expect(salida.restantes).toBe(0);
    act(() => jest.advanceTimersByTime(10_000));
    expect(salida.restantes).toBe(0);
  });

  it('reiniciar vuelve a 60 y sigue contando', () => {
    const { salida } = probar(60);
    act(() => jest.advanceTimersByTime(60_000));
    expect(salida.restantes).toBe(0);
    act(() => salida.reiniciar());
    expect(salida.restantes).toBe(60);
    act(() => jest.advanceTimersByTime(5_000));
    expect(salida.restantes).toBe(55);
  });

  it('con la app en segundo plano usa el reloj real: al volver descuenta el tiempo transcurrido', () => {
    const { salida } = probar(60);
    // Los temporizadores se pausan en segundo plano; el reloj sigue avanzando.
    jest.setSystemTime(Date.now() + 45_000);
    act(() => jest.advanceTimersByTime(1000));
    expect(salida.restantes).toBeLessThanOrEqual(14);
  });

  it('al desmontar libera el temporizador', () => {
    const { raiz } = probar(60);
    act(() => raiz.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });
});
