// Estructura común de pantalla: encabezado + contenido centrado (maxWidth en tablets) + pull-to-refresh.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';
import { useResponsive } from '../utils/useResponsive';
import Header from './Header';

export default function ScreenContainer({ title, brand, menu, back, right, showBell, tab, scroll = true, refreshing, onRefresh, children, padded = true, header = true }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { maxWidth } = useResponsive();
  const bottom = tab ? spacing.lg : insets.bottom + spacing.lg;

  const contenido = { width: '100%', maxWidth, alignSelf: 'center' };

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
export function useListContentStyle(tab = true) {
  const insets = useSafeAreaInsets();
  const { maxWidth } = useResponsive();
  return { width: '100%', maxWidth, alignSelf: 'center', padding: spacing.lg, paddingBottom: tab ? spacing.xl : insets.bottom + spacing.xl };
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
