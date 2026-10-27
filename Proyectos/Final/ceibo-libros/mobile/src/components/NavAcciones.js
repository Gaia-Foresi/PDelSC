// Accesos de la barra superior: modo claro/oscuro, calendario, y (en compu) el resto de los botones del menú,
// solo con íconos. A la derecha, el cuadro del perfil junto a la campanita (con Seguridad y Cerrar sesión).
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgesContext';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';
import { ROL_TEXTO, nombreCompleto } from '../utils/format';
import { useMenuFijo } from '../utils/useResponsive';
import Avatar from './Avatar';
import { useConfirm } from './Confirm';

// Botón de solo ícono; en la web muestra el nombre al pasar el mouse
export function BotonIcono({ icon, label, onPress, badge, color, activo }) {
  const { colors } = useTheme();
  const [hover, setHover] = useState(false);
  const web = Platform.OS === 'web';
  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        onHoverIn={web ? () => setHover(true) : undefined}
        onHoverOut={web ? () => setHover(false) : undefined}
        style={[styles.iconBtn, (activo || hover) && { backgroundColor: colors.primarySoft }]}
      >
        <MaterialCommunityIcons name={icon} size={25} color={color || colors.text} />
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={[styles.badgeText, { color: colors.onDanger }]}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </Pressable>
      {web && hover ? (
        <View pointerEvents="none" style={[styles.tip, { backgroundColor: colors.text }]}>
          <Text style={{ color: colors.bg, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MenuPerfil({ visible, onClose, onIr, onSalir }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const Fila = ({ icon, texto, onPress, danger }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.fila, pressed && { backgroundColor: colors.primarySoft }]}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 15, fontWeight: '600', marginLeft: spacing.md }}>{texto}</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar menú">
        <View style={[styles.menu, { top: insets.top + 54, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.menuCab}>
            <Avatar usuario={usuario} size={44} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{nombreCompleto(usuario)}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>{ROL_TEXTO[usuario?.rol]}</Text>
            </View>
          </View>
          <View style={[styles.linea, { backgroundColor: colors.border }]} />
          <Fila icon="account-circle-outline" texto="Mi perfil" onPress={() => onIr('perfil')} />
          <Fila icon="shield-lock-outline" texto="Seguridad de la cuenta" onPress={() => onIr('seguridad')} />
          <View style={[styles.linea, { backgroundColor: colors.border }]} />
          <Fila icon="logout" texto="Cerrar sesión" danger onPress={onSalir} />
        </View>
      </Pressable>
    </Modal>
  );
}

// `completo`: muestra todos los accesos (compu); si no, solo modo claro/oscuro y calendario (celular)
export default function NavAcciones({ showBell = true }) {
  const navigation = useNavigation();
  const { colors, isDark, toggle } = useTheme();
  const { usuario, esDueno, esStaff, cerrarSesion } = useAuth();
  const { notificaciones } = useBadges();
  const confirm = useConfirm();
  const compu = useMenuFijo();
  const [abierto, setAbierto] = useState(false);

  const ir = (pantalla) => navigation.navigate(pantalla);
  const irMenu = (donde) => {
    setAbierto(false);
    if (donde === 'perfil') navigation.navigate('Tabs', { screen: 'Perfil' });
    else navigation.navigate('Seguridad');
  };
  const salir = async () => {
    setAbierto(false);
    const ok = await confirm({ title: '¿Cerrar sesión?', message: 'Vas a tener que volver a ingresar para usar la aplicación.', confirmText: 'Cerrar sesión', destructive: true });
    if (ok) await cerrarSesion();
  };

  return (
    <View style={styles.fila2}>
      <BotonIcono icon={isDark ? 'weather-sunny' : 'weather-night'} label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onPress={toggle} />
      {esStaff ? <BotonIcono icon="calendar-month-outline" label="Calendario de visitas" onPress={() => ir('Calendario')} /> : null}
      {compu && esDueno ? <BotonIcono icon="chart-box-outline" label="Estadísticas" onPress={() => ir('Estadisticas')} /> : null}
      {compu && esDueno ? <BotonIcono icon="shield-crown-outline" label="Panel admin" onPress={() => ir('Admin')} /> : null}
      {compu && esDueno ? <BotonIcono icon="truck-delivery-outline" label="Pedir libros" onPress={() => ir('PedirLibros')} /> : null}
      <BotonIcono icon="book-information-variant" label="Manual de usuario" onPress={() => ir('Manual')} />
      {showBell ? (
        <BotonIcono icon="bell-outline" label={`Notificaciones${notificaciones ? `, ${notificaciones} nuevas` : ''}`} badge={notificaciones} onPress={() => ir('Notificaciones')} />
      ) : null}
      {usuario ? (
        <Pressable
          onPress={() => setAbierto(true)}
          accessibilityRole="button"
          accessibilityLabel="Menú de mi cuenta"
          style={[styles.perfil, compu && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, paddingRight: spacing.md }]}
        >
          <Avatar usuario={usuario} size={34} />
          {compu ? (
            <View style={{ marginLeft: spacing.sm, maxWidth: 150 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{nombreCompleto(usuario)}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{ROL_TEXTO[usuario.rol]}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <MenuPerfil visible={abierto} onClose={() => setAbierto(false)} onIr={irMenu} onSalir={salir} />
    </View>
  );
}

const styles = StyleSheet.create({
  fila2: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: MIN_TAP - 4, height: MIN_TAP - 4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 1, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  tip: { position: 'absolute', top: MIN_TAP, right: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 50, minWidth: 60, alignItems: 'center' },
  perfil: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.xs, marginRight: spacing.xs, padding: 3, borderRadius: 30 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu: { position: 'absolute', right: spacing.md, width: 270, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  menuCab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  linea: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP, paddingHorizontal: spacing.md },
});
