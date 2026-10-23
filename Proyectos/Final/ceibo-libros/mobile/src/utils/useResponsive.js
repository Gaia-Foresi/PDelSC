// Datos de pantalla para adaptar la interfaz (celular vertical primero; tablet y horizontal después).
import { useWindowDimensions } from 'react-native';
import { CONTENT_MAX_WIDTH } from '../theme/tokens';

// En pantallas anchas (compu / tablet horizontal) el menú lateral queda siempre visible
export const ANCHO_MENU_FIJO = 900;
export function useMenuFijo() {
  const { width } = useWindowDimensions();
  return width >= ANCHO_MENU_FIJO;
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const wide = width >= 700;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH + (wide ? 160 : 0));
  // columnas para grillas de tarjetas
  const columns = width < 520 ? 2 : width < 800 ? 3 : 4;
  return { width, height, landscape, wide, columns, contentWidth, maxWidth: wide ? CONTENT_MAX_WIDTH + 160 : undefined };
}
