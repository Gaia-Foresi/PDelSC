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

const ThemeContext = createContext<ThemeValue>(null as unknown as ThemeValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preferencia, setPreferencia] = useState<'light' | 'dark' | null>(null); // null = seguir sistema, 'light' | 'dark'

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'light' || v === 'dark') && setPreferencia(v))
      .catch(() => {});
  }, []);

  const mode: 'light' | 'dark' = preferencia || (system === 'dark' ? 'dark' : 'light');
  const colors: Colores = mode === 'dark' ? darkColors : lightColors;

  const setMode = useCallback((nuevo: 'light' | 'dark') => {
    setPreferencia(nuevo);
    AsyncStorage.setItem(KEY, nuevo).catch(() => {});
  }, []);
  const toggle = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const value = useMemo(() => ({ colors, mode, isDark: mode === 'dark', setMode, toggle }), [colors, mode, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
