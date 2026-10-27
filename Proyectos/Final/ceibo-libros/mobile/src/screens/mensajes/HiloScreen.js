// Conversación: burbujas, envío y actualización automática cada 10 segundos.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useBadges } from '../../context/BadgesContext';
import { useTheme } from '../../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../../theme/tokens';
import { fechaHora, ROL_TEXTO } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { usePolling } from '../../hooks/useFocus';
import { useResponsive } from '../../utils/useResponsive';
import ErrorState from '../../components/ErrorState';
import ScreenContainer from '../../components/ScreenContainer';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

export default function HiloScreen({ route }) {
  const { id, asunto } = route.params;
  const { colors } = useTheme();
  const toast = useToast();
  const { maxWidth } = useResponsive();
  const { refrescar } = useBadges();
  const lista = useRef(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const hilo = useAsync(() => api.mensajes.hilo({ hilo_id: id }), [id]);
  usePolling(hilo.refresh, 10000);
  const cantidad = hilo.data?.mensajes?.length || 0;

  // Al llegar mensajes nuevos: bajar al final y actualizar el contador del menú
  useEffect(() => {
    if (!cantidad) return;
    refrescar();
    setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80);
  }, [cantidad, refrescar]);

  const enviar = useCallback(async () => {
    const cuerpo = texto.trim();
    if (!cuerpo || enviando) return;
    setEnviando(true);
    try {
      await api.mensajes.enviar({ hilo_id: id, cuerpo });
      setTexto('');
      await hilo.refresh();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setEnviando(false);
    }
  }, [texto, enviando, id, hilo, toast]);

  const con = hilo.data?.hilo?.con;

  return (
    <ScreenContainer
      title={asunto || hilo.data?.hilo?.asunto || 'Conversación'}
      back
      scroll={false}
      showBell={false}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {con ? (
          <View style={{ flexShrink: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }} numberOfLines={1}>Conversación con {con.nombre}</Text>
          </View>
        ) : null}
        {hilo.loading && !hilo.data ? (
          <View style={{ padding: spacing.lg }}>
            <Skeleton height={56} width="70%" />
            <Skeleton height={56} width="60%" style={{ marginTop: 12, alignSelf: 'flex-end' }} />
          </View>
        ) : hilo.error && !hilo.data ? (
          <ErrorState error={hilo.error} onRetry={hilo.reload} />
        ) : (
          <FlatList
            ref={lista}
            style={{ flex: 1 }}
            data={hilo.data?.mensajes || []}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: spacing.lg, width: '100%', maxWidth, alignSelf: 'center' }}
            renderItem={({ item }) => {
              const mio = item.mio;
              return (
                <View style={[styles.fila, { justifyContent: mio ? 'flex-end' : 'flex-start' }]}>
                  <View
                    style={[styles.burbuja, mio
                      ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}
                    accessible
                    accessibilityLabel={`${mio ? 'Vos' : item.remitente.nombre}: ${item.cuerpo}`}
                  >
                    {!mio ? (
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', marginBottom: 2 }}>
                        {item.remitente.nombre} · {ROL_TEXTO[item.remitente.rol] || item.remitente.rol}
                      </Text>
                    ) : null}
                    <Text style={{ color: mio ? colors.onPrimary : colors.text, fontSize: 15, lineHeight: 21 }}>{item.cuerpo}</Text>
                    <Text style={{ color: mio ? colors.onPrimary : colors.textMuted, opacity: 0.75, fontSize: 11, marginTop: 4, alignSelf: 'flex-end' }}>{fechaHora(item.creado_en)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={[styles.barra, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth, alignSelf: 'center' }}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribí un mensaje…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              accessibilityLabel="Escribí un mensaje"
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, outlineStyle: 'none' }]}
            />
            <Pressable
              onPress={enviar}
              disabled={!texto.trim() || enviando}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              style={[styles.enviar, { backgroundColor: colors.primary, opacity: !texto.trim() || enviando ? 0.45 : 1 }]}
            >
              <MaterialCommunityIcons name="send" size={22} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', marginBottom: spacing.sm },
  burbuja: { maxWidth: '82%', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  barra: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  input: { flex: 1, maxHeight: 120, minHeight: MIN_TAP, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
  enviar: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
});