// Menú lateral (sin uso visible): los accesos (Seguridad, Historial, Estadísticas, Panel admin, Pedir libros, Calendario)
// viven en el menú de la cuenta de la barra superior, tanto en compu como en celular.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { font, spacing } from '../theme/tokens';
import Logo from '../components/Logo';

export default function DrawerContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Logo size={44} />
        <Text style={[styles.nombre, { color: colors.primary, fontFamily: font.title }]} numberOfLines={1}>Ceibo Libros</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1 },
  nombre: { flex: 1, fontSize: 22, fontWeight: '700' },
});
