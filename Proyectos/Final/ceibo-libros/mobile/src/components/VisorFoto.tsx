// Foto ampliada a pantalla completa. Se cierra tocando cualquier parte o con la X.
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';

interface VisorFotoProps {
  visible?: boolean;
  uri?: string | null;
  nombre?: string;
  onClose?: () => void;
  onCambiar?: () => void; // si se pasa, aparece el botón "Cambiar foto" debajo de la imagen
}

export default function VisorFoto({ visible, uri, nombre, onClose, onCambiar }: VisorFotoProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!uri) return null;
  const lado = Math.min(width - spacing.lg * 2, height * 0.7, 720);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.fondo} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar foto">
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={12} style={[styles.cerrar, { top: insets.top + spacing.md }]}>
          <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <Image source={{ uri }} style={{ width: lado, height: lado, borderRadius: 16 }} resizeMode="contain" accessibilityLabel={`Foto de ${nombre || 'perfil'}`} />
        {nombre ? <Text style={styles.nombre}>{nombre}</Text> : null}
        {onCambiar ? (
          <Pressable onPress={onCambiar} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" style={styles.boton}>
            <MaterialCommunityIcons name="camera-outline" size={20} color="#FFFFFF" />
            <Text style={styles.botonTexto}>Cambiar foto</Text>
          </Pressable>
        ) : null}
        <View style={{ height: insets.bottom }} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  cerrar: { position: 'absolute', right: spacing.lg, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  nombre: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  boton: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  botonTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
});
