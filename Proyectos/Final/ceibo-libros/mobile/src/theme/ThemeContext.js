// Tema claro/oscuro. Por defecto sigue al sistema; la elección del usuario se guarda.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './colors';

const KEY = 'ceibo.tema';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [preferencia, setPreferencia] = useState(null); // null = seguir sistema, 'light' | 'dark'

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'light' || v === 'dark') && setPreferencia(v))
      .catch(() => {});
  }, []);

  const mode = preferencia || (system === 'dark' ? 'dark' : 'light');
  const colors = mode === 'dark' ? darkColors : lightColors;

  const setMode = useCallback((nuevo) => {
    setPreferencia(nuevo);
    AsyncStorage.setItem(KEY, nuevo).catch(() => {});
  }, []);
  const toggle = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const value = useMemo(() => ({ colors, mode, isDark: mode === 'dark', setMode, toggle }), [colors, mode, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
