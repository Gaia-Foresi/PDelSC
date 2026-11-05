import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';

import type { IconName } from '../types';
import type { StyleProp, ViewStyle } from 'react-native';
interface ButtonProps {
  title?: string;
  onPress?: (...args: any[]) => any;
  variant?: string;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

// variant: primary | secondary | danger | ghost | soft
export default function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style, fullWidth = true, accessibilityLabel }: ButtonProps) {
  const { colors } = useTheme();
  const inactivo = disabled || loading;

  const estilos = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: 'transparent', fg: colors.primary, border: colors.primary },
    danger: { bg: colors.danger, fg: colors.onDanger, border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!inactivo, busy: !!loading }}
      onPress={inactivo ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: estilos.bg, borderColor: estilos.border, minHeight: small ? 38 : MIN_TAP + 4, opacity: inactivo ? 0.5 : pressed ? 0.85 : 1 },
        fullWidth ? null : { alignSelf: 'flex-start' },
        small && { paddingHorizontal: spacing.md },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={estilos.fg} />
        ) : icon ? (
          <MaterialCommunityIcons name={icon} size={small ? 17 : 20} color={estilos.fg} style={title ? { marginRight: 8 } : null} />
        ) : null}
        {title ? <Text style={[styles.text, { color: estilos.fg, fontSize: small ? 14 : 16 }]} numberOfLines={1}>{title}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  text: { fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
