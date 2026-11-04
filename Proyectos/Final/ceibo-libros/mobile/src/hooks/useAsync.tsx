// Carga datos de la API y expone { data, loading, error, reload }.
// `fn` se vuelve a ejecutar cuando cambian las dependencias (deps).
import { useCallback, useEffect, useRef, useState } from 'react';

interface EstadoAsync<T> {
  data: T | null;
  loading: boolean;
  error: any;
}

// `T` es el tipo de lo que devuelve `fn` (se deduce solo de la llamada a la API).
export function useAsync<T = any>(fn: (...args: any[]) => Promise<T> | T, deps: unknown[] = [], { immediate = true }: { immediate?: boolean } = {}) {
  const [state, setState] = useState<EstadoAsync<T>>({ data: null, loading: immediate, error: null });
  const vivo = useRef(true);
  const llamada = useRef(0);
  useEffect(() => () => { vivo.current = false; }, []);

  const run = useCallback(async (...args: any[]) => {
    const id = ++llamada.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn(...args);
      if (vivo.current && id === llamada.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (vivo.current && id === llamada.current) setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Recarga "silenciosa": no muestra el esqueleto, solo actualiza (para pull-to-refresh y polling)
  const refresh = useCallback(async () => {
    const id = ++llamada.current;
    try {
      const data = await fn();
      if (vivo.current && id === llamada.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (vivo.current && id === llamada.current) setState((s) => ({ ...s, loading: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  const setData = useCallback((updater: T | null | ((actual: T | null) => T | null)) => setState((s) => ({ ...s, data: typeof updater === 'function' ? (updater as (actual: T | null) => T | null)(s.data) : updater })), []);

  return { ...state, reload: run, refresh, setData };
}
