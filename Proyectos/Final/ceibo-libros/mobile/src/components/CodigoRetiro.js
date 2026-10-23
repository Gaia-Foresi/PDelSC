// Muestra el código de retiro grande, para mostrarlo en el mostrador de la biblioteca.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, spacing } from '../theme/tokens';

export default function CodigoRetiro({ codigo, compacto, texto = 'Código de retiro' }) {
  const { colors } = useTheme();
  if (!codigo) return null;
  const separado = codigo.split('').join(compacto ? '' : ' ');
  return (
    <View
      style={[styles.caja, { backgroundColor: colors.primarySoft, borderColor: colors.primary }, compacto && { paddingVertical: spacing.sm }]}
      accessible
      accessibilityLabel={`${texto}: ${codigo.split('').join(' ')}`}
    >
      <View style={styles.titulo}>
        <MaterialCommunityIcons name="ticket-confirmation-outline" size={compacto ? 16 : 20} color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontSize: compacto ? 12 : 13, fontWeight: '700', marginLeft: 6 }}>{texto}</Text>
      </View>
      <Text selectable style={{ color: colors.primary, fontSize: compacto ? 22 : 34, fontWeight: '800', letterSpacing: compacto ? 3 : 4, fontFamily: font.title, marginTop: 2 }}>
        {separado}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  titulo: { flexDirection: 'row', alignItems: 'center' },
});
