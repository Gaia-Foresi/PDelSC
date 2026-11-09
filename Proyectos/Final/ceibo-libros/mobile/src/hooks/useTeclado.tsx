// Dice si el teclado en pantalla está abierto (celular nativo y navegador del celular).
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import type { RefObject } from 'react';

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

/**
 * Cuánto tapa el teclado al contenedor `ref` (en px). En Android con pantalla completa el sistema a veces NO achica la ventana
 * al abrir el teclado y la barra de abajo (ej. la de escribir en un chat) queda escondida. Esto mide cuánto del contenedor
 * queda detrás del teclado y devuelve ese alto para usarlo como paddingBottom de un View interno (el `ref` va en el View exterior). Si el sistema ya achicó la ventana, devuelve 0.
 * En la web no hace nada (el navegador lo resuelve solo).
 */
export function useEspacioTeclado(ref: RefObject<any>): number {
  const [espacio, setEspacio] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let vivo = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const medir = (tecladoArriba: number) => {
      const vista = ref.current;
      if (!vista?.measureInWindow) return;
      vista.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        if (!vivo) return;
        // `ref` es el contenedor exterior (sin el padding), así que la medida no depende del espacio ya aplicado
        setEspacio(Math.max(0, Math.round(y + h - tecladoArriba)));
      });
    };

    const mostrar = Keyboard.addListener('keyboardDidShow', (e) => {
      const arriba = e.endCoordinates?.screenY ?? (Dimensions.get('screen').height - (e.endCoordinates?.height || 0));
      // se mide un par de veces porque el sistema puede tardar en acomodar la ventana
      [0, 120, 350].forEach((ms) => timers.push(setTimeout(() => medir(arriba), ms)));
    });
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setEspacio(0));
    return () => { vivo = false; timers.forEach(clearTimeout); mostrar.remove(); ocultar.remove(); };
  }, [ref]);

  return espacio;
}
