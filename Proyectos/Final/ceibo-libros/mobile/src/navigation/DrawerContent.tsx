// Menú lateral del celular (botón ☰ de la barra superior): logo y nombre de la app, y los accesos según el rol.
// En la compu no se usa: esos accesos están en el menú de la cuenta.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, font, spacing } from '../theme/tokens';
import Logo from '../components/Logo';
import { useAccesos } from '../components/NavAcciones';

export default function DrawerContent({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const accesos = useAccesos();
  return (
    <View style={[styles.flex, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Logo size={44} />
        <Text style={[styles.nombre, { color: colors.primary, fontFamily: font.title }]} numberOfLines={1}>Ceibo Libros</Text>
      </View>
      <ScrollView>
        {accesos.map((a) => (
          <Pressable
            key={a.pantalla}
            accessibilityRole="button"
            onPress={() => { navigation.closeDrawer(); navigation.navigate('Main', { screen: a.pantalla }); }}
            style={({ pressed }) => [styles.fila, pressed && { backgroundColor: colors.primarySoft }]}
          >
            <MaterialCommunityIcons name={a.icon} size={24} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', marginLeft: spacing.lg }}>{a.texto}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1 },
  nombre: { flex: 1, fontSize: 22, fontWeight: '700' },
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 8, paddingHorizontal: spacing.lg },
});
