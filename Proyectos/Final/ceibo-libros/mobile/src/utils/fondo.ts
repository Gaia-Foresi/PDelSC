// Ancho de la columna de contenido de la pantalla que se está viendo (en compu). El dibujo de fondo lo usa para
// dibujar solo en los costados que quedan libres, sin que nada quede cortado detrás de la columna.
import { useSyncExternalStore } from 'react';

let ancho = 1240;
const escuchas = new Set<() => void>();

export function fijarAnchoColumna(nuevo: number) {
  if (!nuevo || nuevo === ancho) return;
  ancho = nuevo;
  escuchas.forEach((f) => f());
}

const suscribir = (f: () => void) => { escuchas.add(f); return () => { escuchas.delete(f); }; };
export const useAnchoColumna = () => useSyncExternalStore(suscribir, () => ancho, () => ancho);
