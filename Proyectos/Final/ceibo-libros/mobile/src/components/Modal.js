// Diálogos propios (la app NO usa alert del sistema).
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../theme/tokens';
import Button from './Button';

// Confirmación: "¿Seguro que querés eliminar…?"
export function ConfirmDialog({ visible, title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', destructive, onConfirm, onCancel }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors.shadow)]} accessibilityViewIsModal>
          <View style={[styles.icon, { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft }]}>
            <MaterialCommunityIcons name={destructive ? 'alert-outline' : 'help-circle-outline'} size={28} color={destructive ? colors.danger : colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: font.title }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button title={cancelText} variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <View style={{ width: spacing.md }} />
            <Button title={confirmText} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Hoja inferior con título y contenido (formularios, selectores)
export function SheetModal({ visible, title, onClose, children, footer }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.overlay, { backgroundColor: colors.overlay, justifyContent: 'flex-end' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: font.title }]} numberOfLines={2}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.close}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.lg }}>{children}</ScrollView>
          {footer ? <View style={{ paddingTop: spacing.sm }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 400, borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.xl, width: '100%' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '88%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, padding: spacing.lg, paddingBottom: spacing.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
