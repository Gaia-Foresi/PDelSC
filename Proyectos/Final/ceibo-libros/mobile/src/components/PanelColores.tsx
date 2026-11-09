// Panel para elegir un color deslizando: tono, intensidad y brillo, con vista previa y botón para confirmar.
// No usa librerías externas: las barras se dibujan con franjas de color y se arrastran con el dedo (o el mouse).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../theme/tokens';
import { textoSobre } from '../utils/format';
import Button from './Button';

// ---- conversión de colores ----
const aHex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** h: 0-360, s y v: 0-1 -> #RRGGBB */
export function hsvAHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return aHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** #RRGGBB -> { h: 0-360, s: 0-1, v: 0-1 } */
export function hexAHsv(hex: string): { h: number; s: number; v: number } {
  const n = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#8FAE8B';
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
}

// ---- barra deslizable ----
interface BarraProps {
  etiqueta: string;
  valor: number; // 0-1
  onChange: (v: number) => void;
  franjas: string[]; // colores de las franjas que forman el degradé
}

const ALTO_BARRA = 44;

function Barra({ etiqueta, valor, onChange, franjas }: BarraProps) {
  const { colors } = useTheme();
  const ancho = useRef(1);
  const cambiar = useRef(onChange);
  cambiar.current = onChange;

  const mover = (x: number) => cambiar.current(Math.min(1, Math.max(0, x / ancho.current)));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // que la hoja no robe el gesto mientras se desliza
    onPanResponderGrant: (e) => mover(e.nativeEvent.locationX),
    onPanResponderMove: (e) => mover(e.nativeEvent.locationX),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>{etiqueta}</Text>
      <View
        {...pan.panHandlers}
        onLayout={(e) => { ancho.current = e.nativeEvent.layout.width || 1; }}
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(valor * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(1, Math.max(0, valor + (e.nativeEvent.actionName === 'increment' ? 0.05 : -0.05))))}
        style={[styles.barra, { borderColor: colors.border }]}
      >
        <View pointerEvents="none" style={styles.franjas}>
          {franjas.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
        </View>
        <View pointerEvents="none" style={[styles.pulgar, { left: `${valor * 100}%`, borderColor: '#FFFFFF' }]} />
      </View>
    </View>
  );
}

// ---- panel ----
interface PanelColoresProps {
  visible?: boolean;
  color?: string;
  onConfirm?: (hex: string) => void;
  onCancel?: () => void;
}

export default function PanelColores({ visible, color = '#8FAE8B', onConfirm, onCancel }: PanelColoresProps) {
  const { colors } = useTheme();
  const [hsv, setHsv] = useState(() => hexAHsv(color));

  // cada vez que se abre, arranca desde el color actual
  useEffect(() => { if (visible) setHsv(hexAHsv(color)); }, [visible, color]);

  const hex = hsvAHex(hsv.h, hsv.s, hsv.v);
  const tonos = useMemo(() => Array.from({ length: 36 }, (_, i) => hsvAHex(i * 10, 1, 1)), []);
  const intensidad = useMemo(() => Array.from({ length: 20 }, (_, i) => hsvAHex(hsv.h, i / 19, hsv.v)), [hsv.h, hsv.v]);
  const brillo = useMemo(() => Array.from({ length: 20 }, (_, i) => hsvAHex(hsv.h, hsv.s, i / 19)), [hsv.h, hsv.s]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors.shadow)]} accessibilityViewIsModal>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', fontFamily: font.title, marginBottom: spacing.md }}>Panel de colores</Text>

          <View style={[styles.vista, { backgroundColor: hex, borderColor: colors.border }]}>
            <Text style={{ color: textoSobre(hex), fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>{hex}</Text>
          </View>

          <Barra etiqueta="Color (deslizá hasta encontrarlo)" valor={hsv.h / 360} onChange={(v) => setHsv((p) => ({ ...p, h: Math.min(359.9, v * 360) }))} franjas={tonos} />
          <Barra etiqueta="Intensidad" valor={hsv.s} onChange={(v) => setHsv((p) => ({ ...p, s: v }))} franjas={intensidad} />
          <Barra etiqueta="Claro u oscuro" valor={hsv.v} onChange={(v) => setHsv((p) => ({ ...p, v }))} franjas={brillo} />

          <View style={styles.acciones}>
            <Button title="Cancelar" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <View style={{ width: spacing.md }} />
            <Button title="Confirmar" icon="check" onPress={() => onConfirm?.(hex)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  vista: { height: 84, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  barra: { height: ALTO_BARRA, borderRadius: radius.md, borderWidth: 1.5, justifyContent: 'center' },
  franjas: { ...StyleSheet.absoluteFill as object, flexDirection: 'row', borderRadius: radius.md - 2, overflow: 'hidden' },
  pulgar: { position: 'absolute', top: -4, width: 16, height: ALTO_BARRA + 8, marginLeft: -8, borderRadius: 8, borderWidth: 3, backgroundColor: 'rgba(0,0,0,0.25)' },
  acciones: { flexDirection: 'row', marginTop: spacing.sm },
});
