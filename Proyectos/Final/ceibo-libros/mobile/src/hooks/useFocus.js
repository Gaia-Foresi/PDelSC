// Hooks que dependen de si la pantalla está enfocada.
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Vuelve a pedir los datos cada vez que se vuelve a la pantalla (sin mostrar el esqueleto)
export function useRefreshOnFocus(refresh) {
  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primera.current) { primera.current = false; return; }
      refresh();
    }, [refresh]),
  );
}

// Ejecuta `fn` cada `ms` milisegundos mientras la pantalla está enfocada (polling suave)
export function usePolling(fn, ms = 15000) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => ref.current(), ms);
      return () => clearInterval(id);
    }, [ms]),
  );
}
