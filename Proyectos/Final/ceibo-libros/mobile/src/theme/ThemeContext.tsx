// Tema claro/oscuro. Por defecto sigue al sistema; la elección del usuario se guarda.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './colors';


const KEY = 'ceibo.tema';
type Colores = typeof lightColors;
interface ThemeValue {
  colors: Colores;
  mode: 'light' | 'dark';
  isDark: boolean;
  setMode: (nuevo: 'light' | 'dark') => void;
  toggle: () => void;
}

// createContext crea una "caja" compartida: cualquier pantalla puede leer el tema con useTheme().
const ThemeContext = createContext<ThemeValue>(null as unknown as ThemeValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useColorScheme dice si el celular está en modo claro u oscuro.
  const system = useColorScheme();
  const [preferencia, setPreferencia] = useState<'light' | 'dark' | null>(null); // null = seguir sistema, 'light' | 'dark'

  // Al abrir la app, lee la preferencia guardada.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'light' || v === 'dark') && setPreferencia(v))
      .catch(() => {});
  }, []);

  // Si el usuario eligió un modo, se usa ese; si no, el del sistema.
  const mode: 'light' | 'dark' = preferencia || (system === 'dark' ? 'dark' : 'light');
  const colors: Colores = mode === 'dark' ? darkColors : lightColors;

  // useCallback guarda la función para no recrearla en cada render.
  const setMode = useCallback((nuevo: 'light' | 'dark') => {
    setPreferencia(nuevo);
    AsyncStorage.setItem(KEY, nuevo).catch(() => {});
  }, []);
  const toggle = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  // useMemo arma el valor compartido una sola vez, salvo que cambie algo de la lista.
  const value = useMemo(() => ({ colors, mode, isDark: mode === 'dark', setMode, toggle }), [colors, mode, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook para usar el tema en cualquier componente: const { colors, isDark } = useTheme();
export const useTheme = () => useContext(ThemeContext);
