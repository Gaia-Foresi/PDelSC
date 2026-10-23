// Manual de usuario dentro de la app, según el rol, con botón para descargarlo en PDF.
import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, spacing } from '../theme/tokens';
import { ROL_TEXTO } from '../utils/format';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenContainer from '../components/ScreenContainer';
import { useToast } from '../components/Toast';
import manual from '../content/manual.json';
import { seccionesDe } from '../content/manualRoles';

// Un PDF por rol (se generan con `npm run manual:pdf`)
const PDFS = {
  usuario: require('../../assets/manuales/manual-usuario.pdf'),
  bibliotecario: require('../../assets/manuales/manual-bibliotecario.pdf'),
  dueno: require('../../assets/manuales/manual-dueno.pdf'),
};


function Seccion({ seccion }) {
  const { colors } = useTheme();
  const [abierta, setAbierta] = useState(false);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setAbierta((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        style={styles.cabecera}
      >
        <Text style={[styles.tituloSec, { color: colors.text, fontFamily: font.title }]}>{seccion.tituloNumerado}</Text>
        <MaterialCommunityIcons name={abierta ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textMuted} />
      </Pressable>
      {abierta ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          {seccion.items.map((it) => (
            <View key={it.t} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{it.t}</Text>
              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 2 }}>{it.p}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export default function ManualScreen() {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const toast = useToast();
  const [descargando, setDescargando] = useState(false);
  const rol = usuario?.rol || 'usuario';

  const descargar = async () => {
    setDescargando(true);
    try {
      const asset = Asset.fromModule(PDFS[usuario?.rol] || PDFS.usuario);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      if (Platform.OS === 'web') {
        await Linking.openURL(uri); // en el navegador se abre/descarga el PDF
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Manual de usuario - Ceibo Libros', UTI: 'com.adobe.pdf' });
      } else {
        toast.error('Este dispositivo no permite compartir archivos.');
      }
    } catch (e) {
      toast.error('No pudimos abrir el manual en PDF. Probá de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <ScreenContainer title="Manual de usuario" back>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{manual.intro}</Text>
      <Text style={{ color: colors.text, fontWeight: '700', marginVertical: spacing.md }}>
        Guía para tu rol: <Text style={{ color: colors.primary }}>{ROL_TEXTO[rol]}</Text>
      </Text>
      <Button title="Descargar manual en PDF" icon="file-pdf-box" onPress={descargar} loading={descargando} style={{ marginBottom: spacing.lg }} />

      {seccionesDe(rol).map((s) => <Seccion key={s.id} seccion={s} />)}

      <Text style={[styles.faq, { color: colors.text, fontFamily: font.title }]}>Preguntas frecuentes</Text>
      {manual.faq.map((f) => (
        <Card key={f.q}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{f.q}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>{f.r}</Text>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, minHeight: 56 },
  tituloSec: { flex: 1, fontSize: 17, fontWeight: '700', paddingRight: spacing.sm },
  faq: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.md, borderRadius: radius.sm },
});
