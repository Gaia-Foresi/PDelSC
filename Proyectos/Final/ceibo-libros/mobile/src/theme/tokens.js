// Medidas compartidas: espaciado, radios, tipografía y sombras.
import { Platform } from 'react-native';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const font = {
  // Serif para títulos: da el aire de "libro"; el resto usa la fuente del sistema.
  title: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
};

export const type = {
  h1: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  tiny: { fontSize: 11, lineHeight: 14 },
};

export const shadow = (color = '#000') =>
  Platform.select({
    web: { boxShadow: '0 2px 8px rgba(62, 39, 35, 0.12)' },
    default: { shadowColor: color, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  });

export const MIN_TAP = 44;
export const CONTENT_MAX_WIDTH = 720;
