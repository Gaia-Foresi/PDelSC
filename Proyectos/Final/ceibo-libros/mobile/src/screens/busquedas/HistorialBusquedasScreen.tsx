// Historial completo de búsquedas (con fecha y hora). Se llega desde el menú de la cuenta, debajo de "Seguridad".
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { MIN_TAP, spacing } from '../../theme/tokens';
import { fechaYHora } from '../../utils/format';
import { borrarHistorial, leerHistorial, quitarBusqueda } from '../../utils/historialBusquedas';
import type { BusquedaGuardada } from '../../utils/historialBusquedas';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

import type { PantallaProps } from '../../types';

export default function HistorialBusquedasScreen({ navigation }: PantallaProps) {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [lista, setLista] = useState<BusquedaGuardada[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      leerHistorial(usuario?.id).then((h) => { if (vivo) setLista(h); });
      return () => { vivo = false; };
    }, [usuario?.id]),
  );

  const buscarDeNuevo = (q: string) => navigation.navigate('Tabs', { screen: 'Inicio', params: { buscar: q, t: Date.now() } });
  const quitar = async (q: string) => setLista(await quitarBusqueda(usuario?.id, q));
  const borrarTodo = async () => {
    const ok = await confirm({ title: '¿Borrar el historial?', message: 'Se van a borrar todas tus búsquedas guardadas en este dispositivo.', confirmText: 'Borrar todo', destructive: true });
    if (!ok) return;
    await borrarHistorial(usuario?.id);
    setLista([]);
    toast.success('Historial borrado.');
  };

  return (
    <ScreenContainer title="Historial de búsquedas" back>
      <Text style={{ color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg }}>
        Acá ves todo lo que buscaste, con el día y la hora. Se guarda solo en este dispositivo.
      </Text>

      {lista === null ? null : lista.length === 0 ? (
        <EmptyState icon="history" title="Todavía no buscaste nada" text="Cuando busques un libro por título o autor, la búsqueda va a quedar guardada acá." />
      ) : (
        <View>
          {lista.map((h) => (
            <Card key={`${h.q}-${h.fecha}`} style={styles.card}>
              <Pressable onPress={() => buscarDeNuevo(h.q)} accessibilityRole="button" accessibilityLabel={`Buscar de nuevo ${h.q}`} style={styles.principal}>
                <MaterialCommunityIcons name="history" size={22} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }} numberOfLines={2}>{h.q}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{h.fecha ? fechaYHora(h.fecha) : 'Sin fecha registrada'}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => quitar(h.q)} accessibilityRole="button" accessibilityLabel={`Quitar ${h.q} del historial`} style={styles.quitar} hitSlop={6}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </Card>
          ))}
          <Button title="Borrar todo el historial" icon="trash-can-outline" variant="ghost" onPress={borrarTodo} style={{ marginTop: spacing.md }} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  principal: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP },
  quitar: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
});
