// Barra superior. En pantallas principales: menú ☰ + logo y nombre; en las demás: botón volver.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, font, spacing } from '../theme/tokens';
import { useBadges } from '../context/BadgesContext';
import { useMenuFijo } from '../utils/useResponsive';
import Logo from './Logo';

export function IconButton({ icon, onPress, label, badge, color }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn} hitSlop={4}>
      <MaterialCommunityIcons name={icon} size={26} color={color || colors.text} />
      {badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={[styles.badgeText, { color: colors.onDanger }]}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Header({ title, brand, menu, back, right, showBell = true }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { notificaciones } = useBadges();
  const menuFijo = useMenuFijo(); // con el menú siempre visible no hace falta el botón ☰

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {menu && menuFijo ? (
          <View style={{ width: spacing.md }} />
        ) : menu ? (
          <IconButton icon="menu" label="Abrir menú" onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
        ) : back ? (
          <IconButton icon="arrow-left" label="Volver" onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />
        ) : <View style={{ width: spacing.md }} />}

        {brand ? (
          <View style={styles.brand} accessibilityRole="header">
            <Logo size={36} />
            <Text style={[styles.brandText, { color: colors.primary, fontFamily: font.title }]} numberOfLines={1}>Ceibo Libros</Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        )}

        <View style={styles.right}>
          {right}
          {showBell ? (
            <IconButton icon="bell-outline" label={`Notificaciones${notificaciones ? `, ${notificaciones} nuevas` : ''}`} badge={notificaciones} onPress={() => navigation.navigate('Notificaciones')} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: spacing.xs },
  iconBtn: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 },
  brandText: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 4 },
  right: { flexDirection: 'row', alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
});
