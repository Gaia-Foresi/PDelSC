// Punto de entrada: proveedores globales (tema, sesión, avisos, confirmaciones) + navegación.
import 'react-native-gesture-handler';
import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { BadgesProvider } from './src/context/BadgesContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import { ConfirmProvider } from './src/components/Confirm';
import { DatosLectorProvider } from './src/components/DatosLector';
import RootNavigator from './src/navigation/RootNavigator';

// En la versión web (compu) se ocultan las barras de scroll; se sigue scrolleando con rueda o dedo.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const estilo = document.createElement('style');
  estilo.textContent = '*{scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none;width:0;height:0}';
  document.head.appendChild(estilo);
}

function Contenido() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BadgesProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <DatosLectorProvider>
                    <Contenido />
                  </DatosLectorProvider>
                </ConfirmProvider>
              </ToastProvider>
            </BadgesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
