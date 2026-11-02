import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing, sinContorno } from '../theme/tokens';

import type { StyleProp, ViewStyle } from 'react-native';
interface SearchBarProps {
  value?: any;
  onChangeText?: (...args: any[]) => any;
  placeholder?: string;
  onSubmit?: (...args: any[]) => any;
  onBlur?: (...args: any[]) => any;
  style?: StyleProp<ViewStyle>;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Buscar…', onSubmit, onBlur, style }: SearchBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onBlur={onBlur}
        accessibilityLabel={placeholder}
        style={[styles.input, { color: colors.text, ...sinContorno }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
          <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: MIN_TAP + 2, marginBottom: spacing.md },
  input: { flex: 1, fontSize: 16, marginLeft: spacing.sm, minHeight: 40 },
});
