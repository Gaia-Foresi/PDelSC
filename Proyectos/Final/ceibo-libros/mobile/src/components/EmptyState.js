import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { font, spacing } from '../theme/tokens';
import Button from './Button';

export default function EmptyState({ icon = 'book-open-page-variant-outline', title, text, actionTitle, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <View style={[styles.circle, { backgroundColor: colors.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]}>{title}</Text>
      {text ? <Text style={[styles.text, { color: colors.textMuted }]}>{text}</Text> : null}
      {actionTitle ? <Button title={actionTitle} onPress={onAction} fullWidth={false} small style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', padding: spacing.xl, paddingTop: spacing.xxl },
  circle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  text: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
