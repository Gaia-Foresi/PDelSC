// Filtros en fila (ej.: Activos / Vencidos / Cerrados)
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';

export default function Chips({ options, value, onChange, style }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0, marginBottom: spacing.md }, style]} contentContainerStyle={{ gap: spacing.sm }}>
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { backgroundColor: activo ? colors.primary : colors.card, borderColor: activo ? colors.primary : colors.border }]}
          >
            <Text style={{ color: activo ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: MIN_TAP - 4, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
});
