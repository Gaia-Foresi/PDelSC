// Estructura común de pantalla: encabezado + contenido centrado (maxWidth en tablets) + pull-to-refresh.
import React from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/tokens';
import { useResponsive } from '../utils/useResponsive';
import Header from './Header';
import { useFocusEffect } from '@react-navigation/native';
import { useHayFondo } from './FondoDecorativo';
import { fijarAnchoColumna } from '../utils/fondo';
import { RevelaProvider, useRevelador } from './Revelador';
import { useVolverArriba } from './VolverArriba';
import { useTecladoAbierto } from '../hooks/useTeclado';

import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
interface ScreenContainerProps {
  title?: string;
  brand?: boolean;
  menu?: boolean;
  tab?: boolean;
  back?: boolean;
  right?: any;
  showBell?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: (...args: any[]) => any;
  children?: ReactNode;
  padded?: boolean;
  header?: boolean;
  anchoMax?: any;
}

export default function ScreenContainer({ title, brand, menu, back, right, showBell, scroll = true, refreshing, onRefresh, children, padded = true, header = true, anchoMax }: ScreenContainerProps) {
  const { colors } = useTheme();
  const { maxWidth } = useResponsive();
  const tecladoAbierto = useTecladoAbierto();
  // Con el teclado abierto se deja aire extra abajo para poder subir el formulario y ver los últimos campos
  const bottom = tecladoAbierto ? spacing.lg + 160 : spacing.lg + 72; // espacio para que el botón de subir no tape lo último; // la barra de abajo (fija) ya cubre el área segura

  const { ref, onScroll: alDesplazar, boton } = useVolverArriba();
  const revelador = useRevelador(ref);
  const onScroll = (e) => { alDesplazar(e); revelador.onScroll(e); };
  const hayFondo = useHayFondo();
  const anchoColumna = anchoMax || maxWidth;
  useFocusEffect(React.useCallback(() => { if (anchoColumna) fijarAnchoColumna(anchoColumna); }, [anchoColumna]));
  // Con el dibujo de fondo (compu) solo la columna central tiene color, así se ve el dibujo a los costados
  const contenido: ViewStyle = { width: '100%', maxWidth: anchoMax || maxWidth, alignSelf: 'center', ...(hayFondo ? { backgroundColor: colors.bg } : null) };

  return (
    <View style={[styles.flex, { backgroundColor: hayFondo ? 'transparent' : colors.bg }]}>
      {header ? <Header title={title} brand={brand} menu={menu} back={back} right={right} showBell={showBell} /> : null}
      {scroll ? (
        <View ref={revelador.contenedor} collapsable={false} style={styles.flex}>
        <ScrollView
          ref={ref}
          onScroll={onScroll}
          scrollEventThrottle={64}
          style={styles.flex}
          contentContainerStyle={[contenido, hayFondo && { flexGrow: 1 }, padded && { padding: spacing.lg, paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} // deslizar el formulario esconde el teclado y deja ver todo
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
        >
          <RevelaProvider value={revelador.valor}>{children}</RevelaProvider>
        </ScrollView>
        {/* El botón siempre queda en la esquina de la columna central, igual que en las pantallas con lista */}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
          <View pointerEvents="box-none" style={{ flex: 1, width: '100%', maxWidth: anchoColumna }}>{boton}</View>
        </View>
        </View>
      ) : (
        <View style={[styles.flex, contenido]}>{children}</View>
      )}
    </View>
  );
}

// Estilo para el contenido de un FlatList (centrado y con el mismo padding)
export function useListContentStyle(_conAcciones?: boolean): ViewStyle {
  const { maxWidth } = useResponsive();
  return { width: '100%', maxWidth, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xl + 64 };
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
