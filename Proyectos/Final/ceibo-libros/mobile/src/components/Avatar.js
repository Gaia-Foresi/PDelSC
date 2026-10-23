import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { iniciales } from '../utils/format';

// Foto en círculo; si no hay, muestra las iniciales
export default function Avatar({ usuario, size = 44, nombre, apellido, uri }) {
  const { colors } = useTheme();
  const foto = uri || usuario?.foto_url;
  const texto = iniciales(nombre ?? usuario?.nombre, apellido ?? usuario?.apellido);
  const caja = { width: size, height: size, borderRadius: size / 2 };
  if (foto) return <Image source={{ uri: foto }} style={[caja, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel="Foto de perfil" />;
  return (
    <View style={[styles.box, caja, { backgroundColor: colors.primarySoft, borderColor: colors.secondary }]}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.36 }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 } });
