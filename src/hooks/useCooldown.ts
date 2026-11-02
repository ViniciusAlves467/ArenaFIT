import { useCallback, useEffect, useState } from 'react';

/** Contagem regressiva para limitar reenvios (o Supabase recusa e-mails a cada < 60 s). */
export function useCooldown(seconds = 60, startActive = true) {
  const [left, setLeft] = useState(startActive ? seconds : 0);
  const running = left > 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const restart = useCallback(() => setLeft(seconds), [seconds]);
  return { left, ready: left === 0, restart };
}
