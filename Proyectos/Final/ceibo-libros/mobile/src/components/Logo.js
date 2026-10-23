import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const fuentes = {
  mark: require('../../assets/logo.png'),
  vertical: require('../../assets/logo-vertical.png'),
  horizontal: require('../../assets/logo-horizontal.png'),
};
const proporcion = { mark: 1, vertical: 1, horizontal: 1.1 };

// En modo oscuro las líneas oscuras del logo se pierden, así que va sobre un fondo crema redondeado.
// La caja mide lo mismo en los dos modos (en claro es transparente), así el diseño no se mueve al cambiar de tema.
export default function Logo({ variant = 'mark', size = 44 }) {
  const { isDark, colors } = useTheme();
  const relleno = size * 0.08;
  const img = <Image source={fuentes[variant]} style={{ width: size * proporcion[variant], height: size }} resizeMode="contain" accessibilityLabel="Logo de Ceibo Libros" />;
  return (
    <View
      style={{
        padding: relleno,
        borderRadius: size * 0.28,
        borderWidth: 1,
        backgroundColor: isDark ? '#F3E5D8' : 'transparent',
        borderColor: isDark ? colors.border : 'transparent',
      }}
    >
      {img}
    </View>
  );
}
