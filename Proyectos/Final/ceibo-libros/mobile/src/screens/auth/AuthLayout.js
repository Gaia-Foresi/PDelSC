// Fondo y tarjeta comunes de las pantallas de ingreso
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../../theme/tokens';
import { useResponsive } from '../../utils/useResponsive';
import Logo from '../../components/Logo';

export default function AuthLayout({ title, subtitle, children, compactLogo }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape, height } = useResponsive();
  const chico = compactLogo || (landscape && height < 520);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Logo variant={chico ? 'mark' : 'vertical'} size={chico ? 80 : 170} />
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors.shadow)]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]} accessibilityRole="header">{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  inner: { width: '100%', maxWidth: 460 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14.5, lineHeight: 20, marginTop: 4, marginBottom: spacing.lg },
});
