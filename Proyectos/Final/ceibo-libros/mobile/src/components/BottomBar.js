// Barra inferior de "botones principales". Cambia según el rol del usuario.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP } from '../theme/tokens';
import { useBadges } from '../context/BadgesContext';
import { useAuth } from '../context/AuthContext';

export const TAB_INFO = {
  Inicio: { label: 'Inicio', icon: 'home-variant-outline', iconOn: 'home-variant' },
  Mensajes: { label: 'Mensajes', icon: 'message-outline', iconOn: 'message' },
  Stock: { label: 'Stock', icon: 'bookshelf', iconOn: 'bookshelf' },
  Prestamos: { label: 'Préstamos', icon: 'book-clock-outline', iconOn: 'book-clock' },
  ReservasTab: { label: 'Reservas', icon: 'bookmark-multiple-outline', iconOn: 'bookmark-multiple' },
  Usuarios: { label: 'Usuarios', icon: 'account-group-outline', iconOn: 'account-group' },
  Perfil: { label: 'Perfil', icon: 'account-circle-outline', iconOn: 'account-circle' },
};

// Qué botón se resalta según la pantalla donde estés (las pantallas de detalle pertenecen a un botón)
const PERTENECE = {
  Inicio: 'Inicio', LibrosCategoria: 'Inicio',
  Mensajes: 'Mensajes', Hilo: 'Mensajes', NuevoMensaje: 'Mensajes',
  Stock: 'Stock', LibroForm: 'Stock', Categorias: 'Stock', PedirLibros: 'Stock', Distribuidoras: 'Stock',
  ReservasTab: 'ReservasTab', Reservas: 'ReservasTab', Calendario: 'ReservasTab',
  Prestamos: 'Prestamos', PrestamoDetalle: 'Prestamos', PrestamoNuevo: 'Prestamos',
  Usuarios: 'Usuarios', UsuarioDetalle: 'Usuarios', Admin: 'Usuarios',
  Perfil: 'Perfil', EditarPerfil: 'Perfil', Seguridad: 'Perfil',
};

// Nombre de la pantalla que se está viendo (la más profunda del estado de navegación)
export function pantallaActual(state) {
  let r = state;
  let nombre = null;
  while (r && r.routes) {
    const ruta = r.routes[r.index ?? 0];
    nombre = ruta?.name ?? nombre;
    r = ruta?.state;
  }
  return nombre;
}

// Barra fija: se ve en TODAS las pantallas de la app (listas, detalles, formularios, manual...)
export default function BottomBar({ actual, onIr }) {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const { mensajes } = useBadges();
  const staff = usuario?.rol !== 'usuario';
  const botones = ['Inicio', 'Mensajes', ...(staff ? ['Stock'] : []), 'ReservasTab', 'Prestamos', ...(staff ? ['Usuarios'] : [])];
  const resaltado = PERTENECE[actual] || null;

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {botones.map((nombre) => {
        const info = TAB_INFO[nombre];
        const activo = resaltado === nombre;
        const color = activo ? colors.primary : colors.textMuted;
        return (
          <Pressable key={nombre} onPress={() => onIr(nombre)} accessibilityRole="tab" accessibilityState={{ selected: activo }} accessibilityLabel={info.label} style={styles.item}>
            <View style={[styles.pill, activo && { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons name={activo ? info.iconOn : info.icon} size={23} color={color} />
              {nombre === 'Mensajes' && mensajes > 0 ? (
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
