// Datos de pantalla para adaptar la interfaz (celular vertical primero; tablet y horizontal después).
import { useWindowDimensions } from 'react-native';
import { CONTENT_MAX_WIDTH } from '../theme/tokens';

// En pantallas anchas (compu / tablet horizontal) no hay menú lateral: los accesos van como íconos en la barra superior
export const ANCHO_MENU_FIJO = 900;
// ¿La pantalla es lo bastante ancha para mostrar los accesos arriba en vez del menú lateral?
export function useMenuFijo() {
  // useWindowDimensions devuelve el ancho y alto actuales; si giran la pantalla, se actualiza solo.
  const { width } = useWindowDimensions();
  return width >= ANCHO_MENU_FIJO;
}

// Devuelve datos útiles para adaptar el diseño: si es ancha, si está horizontal, cuántas columnas usar...
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const wide = width >= 700;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH + (wide ? 160 : 0));
  // columnas para grillas de tarjetas
  const columns = width < 520 ? 2 : width < 800 ? 3 : 4;
  return { width, height, landscape, wide, columns, contentWidth, maxWidth: wide ? CONTENT_MAX_WIDTH + 160 : undefined };
}
