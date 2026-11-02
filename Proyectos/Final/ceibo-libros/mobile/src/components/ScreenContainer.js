// Estructura común de pantalla: encabezado + contenido centrado (maxWidth en tablets) + pull-to-refresh.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';
import { useResponsive } from '../utils/useResponsive';
import Header from './Header';

// Componente que representa un contenedor de pantalla con encabezado, contenido centrado y soporte para desplazamiento y actualización. Permite personalizar el título, el logotipo, los botones de navegación y el estilo del contenido.
export default function ScreenContainer({ title, brand, menu, back, right, showBell, scroll = true, refreshing, onRefresh, children, padded = true, header = true, anchoMax }) {
  const { colors } = useTheme();
  const { maxWidth } = useResponsive();
  const bottom = spacing.lg; // la barra de abajo (fija) ya cubre el área segura

  const contenido = { width: '100%', maxWidth: anchoMax || maxWidth, alignSelf: 'center' };

  // Renderiza el contenedor de pantalla con encabezado, contenido centrado y soporte para desplazamiento y actualización. Aplica estilos según el tema y las props proporcionadas.
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      {header ? <Header title={title} brand={brand} menu={menu} back={back} right={right} showBell={showBell} /> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[contenido, padded && { padding: spacing.lg, paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contenido]}>{children}</View>
      )}
    </View>
  );
}

// Estilo para el contenido de un FlatList (centrado y con el mismo padding)
export function useListContentStyle() {
  const { maxWidth } = useResponsive();
  return { width: '100%', maxWidth, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xl };
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
