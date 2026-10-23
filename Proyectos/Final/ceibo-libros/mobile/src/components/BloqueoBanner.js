// Aviso destacado para usuarios bloqueados: muestra el motivo que dejó la biblioteca.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';

export default function BloqueoBanner() {
  const { colors } = useTheme();
  const { bloqueado, usuario } = useAuth();
  if (!bloqueado) return null;
  return (
    <View style={[styles.box, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]} accessibilityRole="alert">
      <MaterialCommunityIcons name="lock-alert-outline" size={26} color={colors.danger} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 15 }}>Tu cuenta está bloqueada</Text>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 }}>
          {usuario?.motivo_bloqueo || 'Tenés libros pendientes de devolución. Devolvelos para volver a reservar y pedir libros.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
});
