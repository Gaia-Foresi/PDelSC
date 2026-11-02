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

// Celular (web): como el navegador no deja "tirar para recargar" (la app ocupa toda la pantalla y scrollea por dentro),
// se hace a mano: tirar hacia abajo desde arriba del todo recarga la página.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  let inicio = null;
  const arriba = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 1 && n.scrollTop > 0) return false;
    }
    return true;
  };
  document.addEventListener('touchstart', (e) => {
    inicio = e.touches.length === 1 && arriba(e.target) ? e.touches[0].clientY : null;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (inicio !== null && e.changedTouches[0].clientY - inicio > 140) window.location.reload();
    inicio = null;
  }, { passive: true });
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
            <ToastProvider>
              <BadgesProvider>
                <ConfirmProvider>
                  <DatosLectorProvider>
                    <Contenido />
                  </DatosLectorProvider>
                </ConfirmProvider>
              </BadgesProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
