// Barra inferior de "botones principales". Cambia según el rol del usuario.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP } from '../theme/tokens';
import { useBadges } from '../context/BadgesContext';

export const TAB_INFO = {
  Inicio: { label: 'Inicio', icon: 'home-variant-outline', iconOn: 'home-variant' },
  Mensajes: { label: 'Mensajes', icon: 'message-outline', iconOn: 'message' },
  Stock: { label: 'Stock', icon: 'bookshelf', iconOn: 'bookshelf' },
  Prestamos: { label: 'Préstamos', icon: 'book-clock-outline', iconOn: 'book-clock' },
  ReservasTab: { label: 'Reservas', icon: 'bookmark-multiple-outline', iconOn: 'bookmark-multiple' },
  Usuarios: { label: 'Usuarios', icon: 'account-group-outline', iconOn: 'account-group' },
  Perfil: { label: 'Perfil', icon: 'account-circle-outline', iconOn: 'account-circle' },
};

export default function BottomBar({ state, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { mensajes } = useBadges();

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const info = TAB_INFO[route.name];
        const activo = state.index === index;
        const color = activo ? colors.primary : colors.textMuted;
        const onPress = () => {
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!activo && !evento.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: activo }} accessibilityLabel={info.label} style={styles.item}>
            <View style={[styles.pill, activo && { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons name={activo ? info.iconOn : info.icon} size={23} color={color} />
              {route.name === 'Mensajes' && mensajes > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={[styles.badgeText, { color: colors.onDanger }]}>{mensajes > 9 ? '9+' : mensajes}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color, fontWeight: activo ? '800' : '600' }]} numberOfLines={1}>{info.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', minHeight: MIN_TAP + 6, justifyContent: 'center' },
  pill: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, marginTop: 2 },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '800' },
});
