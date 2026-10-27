// Avisos breves (reemplazan a los alert). useToast() -> { success, error, info, fromError }
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadow, spacing } from '../theme/tokens';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const op = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null));
  }, [op]);

  const show = useCallback((mensaje, tipo = 'info') => {
    clearTimeout(timer.current);
    setToast({ mensaje, tipo });
    Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
    timer.current = setTimeout(hide, tipo === 'error' ? 5000 : 3500);
  }, [op, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useRef({}).current;
  api.success = (m) => show(m, 'success');
  api.error = (m) => show(m, 'error');
  api.info = (m) => show(m, 'info');
  api.fromError = (e, fallback = 'Ocurrió un error. Probá de nuevo.') => show(e?.message || fallback, 'error');

  const tono = toast && {
    success: { bg: colors.success, icon: 'check-circle-outline', fg: colors.mode === 'dark' ? '#14210F' : '#FFFFFF' },
    error: { bg: colors.danger, icon: 'alert-circle-outline', fg: colors.onDanger },
    info: { bg: colors.primary, icon: 'information-outline', fg: colors.onPrimary },
  }[toast.tipo];

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 84, opacity: op }]}>
          <Pressable onPress={hide} accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.toast, { backgroundColor: tono.bg }, shadow('#000')]}>
            <MaterialCommunityIcons name={tono.icon} size={22} color={tono.fg} />
            <Text style={[styles.text, { color: tono.fg }]}>{toast.mensaje}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg, zIndex: 999 },
  toast: { flexDirection: 'row', alignItems: 'center', maxWidth: 520, width: '100%', borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.lg },
  text: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', lineHeight: 19 },
});
