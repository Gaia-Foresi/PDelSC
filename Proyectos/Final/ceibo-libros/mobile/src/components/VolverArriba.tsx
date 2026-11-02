// Botón flotante "volver arriba": aparece cuando bajaste bastante en una lista o pantalla larga.
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, spacing } from '../theme/tokens';

import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const UMBRAL = 360; // px que hay que bajar para que aparezca el botón

export function BotonVolverArriba({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Volver arriba"
      style={({ pressed }) => [styles.boton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
    >
      <MaterialCommunityIcons name="chevron-up" size={28} color={colors.onPrimary} />
    </Pressable>
  );
}

/**
 * Para un ScrollView o FlatList: pasale `ref` y `onScroll` (con scrollEventThrottle) y mostrá `boton` dentro del contenedor.
 */
export function useVolverArriba() {
  const ref = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pasado = e.nativeEvent.contentOffset.y > UMBRAL;
    setVisible((v) => (v === pasado ? v : pasado)); // si no cambia, React no vuelve a dibujar
  }, []);
  const subir = useCallback(() => {
    const lista = ref.current;
    if (!lista) return;
    if (lista.scrollToOffset) lista.scrollToOffset({ offset: 0, animated: true });
    else lista.scrollTo?.({ y: 0, animated: true });
  }, []);
  return { ref, onScroll, boton: <BotonVolverArriba visible={visible} onPress={subir} /> };
}

const styles = StyleSheet.create({
  boton: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: MIN_TAP + 4, height: MIN_TAP + 4, borderRadius: (MIN_TAP + 4) / 2,
    alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
