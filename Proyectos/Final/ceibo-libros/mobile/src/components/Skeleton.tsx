import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';

import type { DimensionValue } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
interface SkeletonProps {
  height?: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

// Bloque que "late" mientras carga el contenido
export function Skeleton({ height = 16, width = '100%', style }: SkeletonProps) {
  const { colors } = useTheme();
  const op = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(op, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [op]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.skeleton, opacity: op }, style]} />;
}

interface SkeletonListProps {
  count?: number;
  height?: number;
}

// Lista de tarjetas de relleno
export function SkeletonList({ count = 4, height = 84 }: SkeletonListProps) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Cargando" accessibilityLiveRegion="polite">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <Skeleton height={height * 0.25} width="55%" />
          <Skeleton height={height * 0.18} width="85%" style={{ marginTop: 10 }} />
          <Skeleton height={height * 0.18} width="40%" style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}
