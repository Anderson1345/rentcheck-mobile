import { useCallback, useEffect, useState } from 'react';

/**
 * Cuenta regresiva en segundos (reenvío del código: 60 s). Se calcula contra el reloj, no contando
 * ticks: si la app pasa a segundo plano y los temporizadores se pausan, al volver descuenta el
 * tiempo real transcurrido.
 */
export function useCuentaRegresiva(segundos: number): { restantes: number; reiniciar: () => void } {
  const [fin, setFin] = useState(() => Date.now() + segundos * 1000);
  const [ahora, setAhora] = useState(() => Date.now());

  const restantes = Math.max(0, Math.ceil((fin - ahora) / 1000));
  const corriendo = restantes > 0;

  useEffect(() => {
    if (!corriendo) return undefined;
    const temporizador = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, [fin, corriendo]);

  const reiniciar = useCallback(() => {
    const ahoraMs = Date.now();
    setFin(ahoraMs + segundos * 1000);
    setAhora(ahoraMs);
  }, [segundos]);

  return { restantes, reiniciar };
}
