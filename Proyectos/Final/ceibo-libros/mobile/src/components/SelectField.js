// Campo que abre una hoja con opciones (reemplaza al <select>)
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';
import { SheetModal } from './Modal';

// options: [{ value, label, description? }]
export default function SelectField({ label, value, options, onChange, placeholder = 'Elegir…', error, title }) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const actual = options.find((o) => o.value === value);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Selector'}: ${actual?.label || placeholder}`}
        onPress={() => setAbierto(true)}
        style={[styles.box, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border }]}
      >
        <Text style={{ flex: 1, fontSize: 16, color: actual ? colors.text : colors.textMuted }} numberOfLines={1}>{actual?.label || placeholder}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 13, marginTop: 4 }}>{error}</Text> : null}
      <SheetModal visible={abierto} title={title || label || 'Elegí una opción'} onClose={() => setAbierto(false)}>
        {options.map((o) => {
          const activo = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              onPress={() => { onChange(o.value); setAbierto(false); }}
              style={[styles.option, { backgroundColor: activo ? colors.primarySoft : 'transparent', borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: activo ? '700' : '500' }}>{o.label}</Text>
                {o.description ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{o.description}</Text> : null}
              </View>
              {activo ? <MaterialCommunityIcons name="check" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: MIN_TAP + 4 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 4, paddingHorizontal: spacing.md, borderRadius: radius.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
