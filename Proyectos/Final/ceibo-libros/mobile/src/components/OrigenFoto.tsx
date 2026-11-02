// Hoja para elegir de dónde sale la foto de perfil: sacarla con la cámara o elegirla de la galería (y, si hay, quitarla).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';
import { SheetModal } from './Modal';
import type { OrigenFoto as Origen } from '../utils/foto';
import type { IconName } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onElegir: (origen: Origen) => void;
  onQuitar?: () => void; // si se pasa, aparece "Quitar foto"
}

export default function OrigenFoto({ visible, onClose, onElegir, onQuitar }: Props) {
  const { colors } = useTheme();
  const Opcion = ({ icon, titulo, texto, onPress, danger }: { icon: IconName; titulo: string; texto?: string; onPress: () => void; danger?: boolean }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={titulo} style={({ pressed }) => [styles.opcion, { borderColor: colors.border, backgroundColor: pressed ? colors.primarySoft : colors.card }]}>
      <View style={[styles.icono, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={26} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? colors.danger : colors.text, fontWeight: '700', fontSize: 16 }}>{titulo}</Text>
        {texto ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{texto}</Text> : null}
      </View>
    </Pressable>
  );
  return (
    <SheetModal visible={visible} title="Foto de perfil" onClose={onClose}>
      <Opcion icon="camera-outline" titulo="Sacarme una foto" texto="Usa la cámara del teléfono" onPress={() => { onClose(); onElegir('camara'); }} />
      <Opcion icon="image-multiple-outline" titulo="Elegir de la galería" texto="Una foto que ya tengas guardada" onPress={() => { onClose(); onElegir('galeria'); }} />
      {onQuitar ? <Opcion icon="trash-can-outline" titulo="Quitar foto" danger onPress={() => { onClose(); onQuitar(); }} /> : null}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  opcion: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 16, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  icono: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
});
