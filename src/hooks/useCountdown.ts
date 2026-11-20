import { useCallback, useEffect, useRef, useState } from 'react';

type CountdownState = { endAt: number; now: number; durationMs: number; running: boolean };

const IDLE: CountdownState = { endAt: 0, now: 0, durationMs: 0, running: false };

// Timestamp-based: the remaining time is computed from the clock, not by
// counting ticks, so a delayed tick can never make the timer drift.
export function useCountdown() {
  const [state, setState] = useState<CountdownState>(IDLE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Stop ticking when the screen unmounts.
  useEffect(() => clear, [clear]);

  const start = useCallback(
    (seconds: number, onDone: () => void) => {
      clear();
      const startedAt = Date.now();
      const endAt = startedAt + seconds * 1000;
      startedAtRef.current = startedAt;
      setState({ endAt, now: startedAt, durationMs: seconds * 1000, running: true });
      intervalRef.current = setInterval(() => {
        const t = Date.now();
        if (t >= endAt) {
          clear();
          setState((s) => ({ ...s, now: endAt, running: false }));
          onDone();
        } else {
          setState((s) => ({ ...s, now: t }));
        }
      }, 250);
    },
    [clear],
  );

  // Returns the whole seconds that had elapsed since start().
  const stop = useCallback((): number => {
    const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
    clear();
    setState((s) => ({ ...s, running: false }));
    return elapsed;
  }, [clear]);

  const remainingMs = state.running ? Math.max(0, state.endAt - state.now) : 0;

  return {
    running: state.running,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    fraction: state.durationMs > 0 ? remainingMs / state.durationMs : 0,
    start,
    stop,
  };
}
