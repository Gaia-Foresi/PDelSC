import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';

// Campo de texto con etiqueta, error en línea y (si es contraseña) botón para mostrar/ocultar
export default function Input({ label, error, hint, secure, icon, multiline, style, inputStyle, ...rest }) {
  const { colors } = useTheme();
  const [foco, setFoco] = useState(false);
  const [oculto, setOculto] = useState(true);
  const borde = error ? colors.danger : foco ? colors.primary : colors.border;

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <View style={[styles.box, { backgroundColor: colors.card, borderColor: borde, borderWidth: foco || error ? 2 : 1.5, minHeight: multiline ? 96 : MIN_TAP + 4 }]}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={colors.textMuted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={secure && oculto}
          onFocus={(e) => { setFoco(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); rest.onBlur?.(e); }}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          style={[styles.input, { color: colors.text, textAlignVertical: multiline ? 'top' : 'center', paddingVertical: multiline ? 10 : 0 }, inputStyle, { outlineStyle: 'none' }]}
        />
        {secure ? (
          <Pressable onPress={() => setOculto((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            <MaterialCommunityIcons name={oculto ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.msg, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text style={[styles.msg, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, fontSize: 16, minHeight: 40 },
  msg: { fontSize: 13, marginTop: 4 },
});
