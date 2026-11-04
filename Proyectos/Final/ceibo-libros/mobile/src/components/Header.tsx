// Barra superior. En pantallas principales: logo y nombre; en las demás: botón volver. A la derecha, los accesos de la cuenta.
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, font, spacing } from '../theme/tokens';
import { useMenuFijo } from '../utils/useResponsive';
import { useBadges } from '../context/BadgesContext';
import Logo from './Logo';
import NavAcciones, { MenuApp } from './NavAcciones';

import type { IconName } from '../types';
interface IconButtonProps {
  icon?: IconName;
  onPress?: (...args: any[]) => any;
  label?: string;
  badge?: any;
  color?: string;
}

export function IconButton({ icon, onPress, label, badge, color }: IconButtonProps) {
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

interface HeaderProps {
  title?: string;
  brand?: boolean;
  menu?: boolean;
  back?: boolean;
  right?: any;
  showBell?: boolean;
}

export default function Header({ title, brand, menu, back, right, showBell = true }: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { notificaciones } = useBadges();
  const angosto = useWindowDimensions().width < 420;
  const menuFijo = useMenuFijo(); // compu: sin menú lateral ni botón ☰; los accesos van en esta barra

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {menu ? (
          <View style={{ marginLeft: 2 }}><MenuApp /></View>
        ) : back ? (
          <IconButton icon="arrow-left" label="Volver" onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />
        ) : <View style={{ width: spacing.md }} />}

        {brand ? (
          <View style={styles.brand} accessibilityRole="header">
            {menuFijo ? <Logo size={36} /> : null}
            <Text style={[styles.brandText, { color: colors.primary, fontFamily: font.title }, angosto && { fontSize: 18 }]} numberOfLines={1}>Ceibo Libros</Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        )}

        <View style={styles.right}>
          {right}
          {/* Pantallas principales y compu: accesos completos; detalles en celular: solo la campana */}
          {menu || menuFijo ? (
            <NavAcciones showBell={showBell} />
          ) : showBell ? (
            <IconButton icon="bell-outline" label="Notificaciones" badge={notificaciones} onPress={() => navigation.navigate('Notificaciones')} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 100, elevation: 100, overflow: 'visible' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: spacing.xs },
  iconBtn: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 },
  brandText: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 4 },
  right: { flexDirection: 'row', alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
});
