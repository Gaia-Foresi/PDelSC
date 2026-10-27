// Cartel con el horario de atención de la biblioteca (lunes a sábados de 08:00 a 18:00 hs).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';

export const HORARIO_ATENCION = 'Lunes a sábados de 08:00 a 18:00 hs';

export default function HorarioAtencion({ style, compacto = false }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.caja, { backgroundColor: colors.primarySoft, borderColor: colors.border }, style]} accessible accessibilityLabel={`Horario de atención: ${HORARIO_ATENCION}. Domingos cerrado.`}>
      <MaterialCommunityIcons name="clock-outline" size={compacto ? 18 : 22} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: compacto ? 13 : 14 }}>Horario de atención</Text>
        <Text style={{ color: colors.text, fontSize: compacto ? 13 : 14 }}>{HORARIO_ATENCION} · Domingos cerrado</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
});
