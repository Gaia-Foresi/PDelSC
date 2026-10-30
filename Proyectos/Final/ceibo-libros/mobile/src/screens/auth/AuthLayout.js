// Fondo y tarjeta comunes de las pantallas de ingreso
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../../theme/tokens';
import { ANCHO_MENU_FIJO, useResponsive } from '../../utils/useResponsive';
import Logo from '../../components/Logo';

export default function AuthLayout({ title, subtitle, children, compactLogo }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape, height } = useResponsive();
  const chico = compactLogo || (landscape && height < 520);
  const { width } = useWindowDimensions();

  // Compu: panel con el logo en un círculo a la izquierda y el formulario a la derecha
  if (width >= ANCHO_MENU_FIJO) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingVertical: spacing.xl }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.panel, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, shadow(colors.shadow)]}>
            <View style={[styles.circulo, { borderColor: colors.border }]}>
              <Logo variant="vertical" size={320} sinCaja />
            </View>
            <View style={[styles.cardCompu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
  panel: { width: '100%', maxWidth: 1040, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, borderRadius: 48, borderWidth: 1.5, padding: spacing.xl },
  circulo: { width: 400, height: 400, borderRadius: 200, borderWidth: 1.5, backgroundColor: '#F3E5D8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardCompu: { flex: 1, borderRadius: 32, borderWidth: 1, padding: spacing.xl },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14.5, lineHeight: 20, marginTop: 4, marginBottom: spacing.lg },
});