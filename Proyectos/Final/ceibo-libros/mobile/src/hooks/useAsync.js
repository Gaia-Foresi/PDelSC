// Carga datos de la API y expone { data, loading, error, reload }.
// `fn` se vuelve a ejecutar cuando cambian las dependencias (deps).
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const vivo = useRef(true);
  const llamada = useRef(0);
  useEffect(() => () => { vivo.current = false; }, []);

  const run = useCallback(async (...args) => {
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

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);

  return { ...state, reload: run, refresh, setData };
}
