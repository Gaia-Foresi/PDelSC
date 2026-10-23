// Menú desplegable (boceto 1): nombre y logo de la app arriba, modo claro/oscuro, libros reservados,
// y —solo para el dueño— panel admin y pedir libros.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, font, radius, spacing } from '../theme/tokens';
import { ROL_TEXTO, nombreCompleto } from '../utils/format';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Logo from '../components/Logo';
import { useConfirm } from '../components/Confirm';

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
  const { colors, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario, esDueno, esStaff, cerrarSesion } = useAuth();
  const confirm = useConfirm();

  const ir = (pantalla) => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: pantalla });
  };

  const salir = async () => {
    navigation.closeDrawer();
    const ok = await confirm({ title: '¿Cerrar sesión?', message: 'Vas a tener que volver a ingresar para usar la aplicación.', confirmText: 'Cerrar sesión', destructive: true });
    if (ok) await cerrarSesion();
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* Nombre y logo de la biblioteca */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Logo size={44} />
        <Text style={[styles.nombre, { color: colors.primary, fontFamily: font.title }]} numberOfLines={1}>Ceibo Libros</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
        {usuario ? (
          <View style={[styles.usuario, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Avatar usuario={usuario} size={44} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{nombreCompleto(usuario)}</Text>
              <Badge text={ROL_TEXTO[usuario.rol]} tone="primary" style={{ marginTop: 4 }} />
            </View>
          </View>
        ) : null}

        {/* Modo claro / oscuro */}
        <View style={styles.item} accessible accessibilityRole="switch" accessibilityLabel="Modo oscuro" accessibilityState={{ checked: isDark }}>
          <MaterialCommunityIcons name={isDark ? 'weather-night' : 'white-balance-sunny'} size={24} color={colors.primary} />
          <Text style={[styles.itemText, { color: colors.text }]}>Modo oscuro</Text>
          <Switch value={isDark} onValueChange={toggle} trackColor={{ true: colors.secondary, false: colors.border }} thumbColor={isDark ? colors.primary : '#FFFFFF'} />
        </View>

        {esStaff ? <Item icon="calendar-month-outline" label="Calendario de visitas" onPress={() => ir('Calendario')} /> : null}
        {esDueno ? <Item icon="chart-box-outline" label="Estadísticas" onPress={() => ir('Estadisticas')} /> : null}
        {esDueno ? <Item icon="shield-crown-outline" label="Panel admin" onPress={() => ir('Admin')} /> : null}
        {esDueno ? <Item icon="truck-delivery-outline" label="Pedir libros" onPress={() => ir('PedirLibros')} /> : null}

        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <Item icon="shield-lock-outline" label="Seguridad de la cuenta" onPress={() => ir('Seguridad')} />
        <Item icon="book-information-variant" label="Manual de usuario" onPress={() => ir('Manual')} />
        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <Item icon="logout" label="Cerrar sesión" danger onPress={salir} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1 },
  nombre: { flex: 1, fontSize: 22, fontWeight: '700' },
  usuario: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 6, paddingHorizontal: spacing.lg, borderRadius: radius.md, marginHorizontal: spacing.sm },
  itemText: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: spacing.md },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm, marginHorizontal: spacing.lg },
});
