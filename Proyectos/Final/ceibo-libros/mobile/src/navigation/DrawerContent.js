// Menú desplegable (celular): logo de la app y accesos secundarios (estadísticas, panel admin y pedir libros
// para el dueño, y el manual). El modo claro/oscuro, el calendario, el perfil, Seguridad y Cerrar sesión están en la barra superior.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, font, radius, spacing } from '../theme/tokens';
import Logo from '../components/Logo';

function Item({ icon, label, onPress, badge, danger }) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.itemText, { color }]}>{label}</Text>
      {badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={{ color: colors.onDanger, fontSize: 11, fontWeight: '800' }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DrawerContent({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { esDueno } = useAuth();

  const ir = (pantalla) => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: pantalla });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* Nombre y logo de la biblioteca */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Logo size={44} />
        <Text style={[styles.nombre, { color: colors.primary, fontFamily: font.title }]} numberOfLines={1}>Ceibo Libros</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
        {esDueno ? <Item icon="chart-box-outline" label="Estadísticas" onPress={() => ir('Estadisticas')} /> : null}
        {esDueno ? <Item icon="shield-crown-outline" label="Panel admin" onPress={() => ir('Admin')} /> : null}
        {esDueno ? <Item icon="truck-delivery-outline" label="Pedir libros" onPress={() => ir('PedirLibros')} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1 },
  nombre: { flex: 1, fontSize: 22, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 6, paddingHorizontal: spacing.lg, borderRadius: radius.md, marginHorizontal: spacing.sm },
  itemText: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: spacing.md },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
});
