import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

// tone: neutral | success | danger | warning | primary
export default function Badge({ text, tone = 'neutral', icon, style }) {
  const { colors } = useTheme();
  const t = {
    neutral: [colors.surfaceAlt, colors.text],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    warning: [colors.warningSoft, colors.warning],
    primary: [colors.primarySoft, colors.primary],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t[0] }, style]}>
      {icon ? <MaterialCommunityIcons name={icon} size={13} color={t[1]} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.text, { color: t[1] }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  text: { fontSize: 12, fontWeight: '700' },
});
