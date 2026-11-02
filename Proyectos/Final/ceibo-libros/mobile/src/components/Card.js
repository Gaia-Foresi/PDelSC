import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadow, spacing } from '../theme/tokens';

// Componente Card que puede ser presionado o no, dependiendo de si se le pasa la prop onPress
export default function Card({ children, onPress, style, accessibilityLabel }) {
  const { colors } = useTheme();
  const base = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadow(colors.shadow), style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.88 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
});
