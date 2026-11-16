// Hooks que dependen de si la pantalla está enfocada.
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Mantiene los datos de la pantalla al día sin que el usuario tenga que tirar hacia abajo para recargar.
// En criollo: vuelve a pedir los datos (sin mostrar el esqueleto de carga) en tres momentos:
//  1) cada vez que se vuelve a la pantalla,
//  2) cada `ms` milisegundos (20 s por defecto) mientras la pantalla está abierta y la app a la vista,
//  3) cuando el usuario vuelve a la app desde otra app (o a la pestaña, en la web).
// Así, si se carga un libro o una categoría desde otro dispositivo, aparece solo en unos segundos.
// Si la app está en segundo plano no consulta nada (ahorra batería y datos).
export function useRefreshOnFocus(refresh: () => unknown, ms = 20000) {
  const primera = useRef(true);
  const ref = useRef(refresh);
  useEffect(() => { ref.current = refresh; }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      if (primera.current) primera.current = false; // la primera carga ya la hizo useAsync
      else ref.current();
      const id = setInterval(() => { if (AppState.currentState === 'active') ref.current(); }, ms);
      const sub = AppState.addEventListener('change', (estado) => { if (estado === 'active') ref.current(); });
      return () => { clearInterval(id); sub.remove(); };
    }, [ms]),
  );
}

// Ejecuta `fn` cada `ms` milisegundos mientras la pantalla está enfocada (polling suave)
export function usePolling(fn: () => unknown, ms = 15000) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => ref.current(), ms);
      return () => clearInterval(id);
    }, [ms]),
  );
}
