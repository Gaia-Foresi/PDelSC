// Avisos de la biblioteca: recordatorios de devolución, bloqueos, reservas, etc.
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useBadges } from '../../context/BadgesContext';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { fechaHora } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';

const TIPOS = {
  recordatorio_devolucion: { icon: 'calendar-clock-outline', tono: 'warning' },
  vencimiento: { icon: 'clock-alert-outline', tono: 'danger' },
  bloqueo: { icon: 'lock-alert-outline', tono: 'danger' },
  desbloqueo: { icon: 'lock-open-check-outline', tono: 'success' },
  reserva: { icon: 'bookmark-check-outline', tono: 'primary' },
  sistema: { icon: 'bell-outline', tono: 'primary' },
};

export default function NotificacionesScreen() {
  const { colors } = useTheme();
  const { refrescar } = useBadges();
  const contenido = useListContentStyle(false);
  const datos = useAsync(() => api.notificaciones.listar({}), []);

  // Se muestran con su estado original (las nuevas resaltadas) y recién después se marcan como leídas
  const cargadas = !!datos.data;
  useEffect(() => {
    if (!cargadas) return;
    api.notificaciones.marcarLeidas({}).then(refrescar).catch(() => {});
  }, [cargadas, refrescar]);

  const color = (tono) => ({
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    success: [colors.successSoft, colors.success],
    primary: [colors.primarySoft, colors.primary],
  }[tono]);

  return (
    <ScreenContainer title="Notificaciones" back showBell={false} scroll={false}>
      <FlatList
        data={datos.data?.notificaciones || []}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={contenido}
        refreshing={false}
        onRefresh={datos.reload}
        renderItem={({ item: n }) => {
          const t = TIPOS[n.tipo] || TIPOS.sistema;
          const [fondo, fg] = color(t.tono);
          return (
            <Card style={!n.leida ? { borderColor: colors.primary, borderWidth: 2 } : null} accessibilityLabel={`${n.leida ? '' : 'Nueva. '}${n.titulo}. ${n.cuerpo}`}>
              <View style={styles.fila}>
                <View style={[styles.icono, { backgroundColor: fondo }]}>
                  <MaterialCommunityIcons name={t.icon} size={22} color={fg} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={styles.fila}>
                    <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: n.leida ? '600' : '800' }}>{n.titulo}</Text>
                    {!n.leida ? <View style={[styles.punto, { backgroundColor: colors.danger }]} /> : null}
                  </View>
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{n.cuerpo}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{fechaHora(n.creada_en)}</Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          datos.loading && !datos.data ? <SkeletonList count={4} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState icon="bell-check-outline" title="No tenés notificaciones" text="Acá te vamos a avisar cuando se acerque la fecha de devolución de tus libros." />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  punto: { width: 10, height: 10, borderRadius: radius.pill, marginLeft: spacing.sm },
});
