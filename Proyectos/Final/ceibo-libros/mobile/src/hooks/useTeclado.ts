// Dice si el teclado en pantalla está abierto (celular nativo y navegador del celular).
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useTecladoAbierto() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const mostrar = Keyboard.addListener('keyboardDidShow', () => setAbierto(true));
      const ocultar = Keyboard.addListener('keyboardDidHide', () => setAbierto(false));
      return () => { mostrar.remove(); ocultar.remove(); };
    }

    // Web: el teclado achica el área visible. Se compara con el alto máximo visto para este ancho.
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;
    let ancho = vv.width;
    let maximo = Math.max(vv.height, window.innerHeight);
    const revisar = () => {
      if (Math.abs(vv.width - ancho) > 50) { ancho = vv.width; maximo = vv.height; } // giró la pantalla
      maximo = Math.max(maximo, vv.height);
      setAbierto(maximo - vv.height > 120);
    };
    vv.addEventListener('resize', revisar);
    return () => vv.removeEventListener('resize', revisar);
  }, []);

  return abierto;
}
