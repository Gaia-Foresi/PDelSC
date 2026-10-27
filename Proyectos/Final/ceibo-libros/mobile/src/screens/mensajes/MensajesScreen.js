// Lista de conversaciones. Usuario: consultas a la biblioteca. Staff: consultas de usuarios + mensajes internos.
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../context/BadgesContext';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { fechaCorta } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { usePolling, useRefreshOnFocus } from '../../hooks/useFocus';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'consulta', label: 'Consultas' },
  { value: 'interno', label: 'Internos' },
  { value: 'respondidos', label: 'Respondidos' },
];

export default function MensajesScreen({ navigation }) {
  const { colors } = useTheme();
  const { esStaff } = useAuth();
  const { refrescar } = useBadges();
  const contenido = useListContentStyle(true);
  const [filtro, setFiltro] = useState('todos');

  const verRespondidos = esStaff && filtro === 'respondidos';
  const hilos = useAsync(() => api.mensajes.hilos(verRespondidos ? { respondidos: true } : {}), [verRespondidos]);
  useRefreshOnFocus(hilos.refresh);
  usePolling(hilos.refresh, 20000);
  // Cuando llegan los datos, se actualiza el globito del menú inferior
  useEffect(() => { if (hilos.data) refrescar(); }, [hilos.data, refrescar]);

  const lista = useMemo(
    () => (hilos.data?.hilos || []).filter((h) => {
      if (!esStaff) return true;
      if (filtro === 'respondidos') return h.respondido === true; // solo las que de verdad ya respondió el personal
      return !h.respondido && (filtro === 'todos' || h.tipo === filtro);
    }),
    [hilos.data, filtro, esStaff],
  );

  const encabezado = (
    <View>
      {esStaff
        ? <Chips options={FILTROS} value={filtro} onChange={setFiltro} />
        : null}
      <Button
        title={esStaff ? 'Mensaje al equipo' : 'Nueva consulta'}
        icon={esStaff ? 'account-tie-outline' : 'message-plus-outline'}
        onPress={() => navigation.navigate('NuevoMensaje', { tipo: esStaff ? 'interno' : 'consulta' })}
        style={{ marginBottom: spacing.lg }}
      />
    </View>
  );

  return (
    <ScreenContainer title="Mensajes" menu tab scroll={false}>
      <FlatList
        data={lista}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={contenido}
        refreshing={false}
        onRefresh={hilos.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item }) => {
          const sinLeer = item.no_leidos > 0;
          return (
            <Card onPress={() => navigation.navigate('Hilo', { id: item.id, asunto: item.asunto })} accessibilityLabel={`${item.asunto}, con ${item.con?.nombre}${sinLeer ? `, ${item.no_leidos} sin leer` : ''}`}>
              <View style={styles.fila}>
                <View style={[styles.icono, { backgroundColor: item.tipo === 'interno' ? colors.warningSoft : colors.primarySoft }]}>
                  <MaterialCommunityIcons
                    name={item.tipo === 'interno' ? 'account-tie-outline' : 'help-circle-outline'}
                    size={22}
                    color={item.tipo === 'interno' ? colors.warning : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={styles.fila}>
                    <Text style={[styles.asunto, { color: colors.text, fontWeight: sinLeer ? '800' : '600' }]} numberOfLines={1}>{item.asunto}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: spacing.sm }}>{fechaCorta(item.ultimo_en)}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>{item.con?.nombre}</Text>
                  <View style={styles.fila}>
                    <Text style={{ flex: 1, color: sinLeer ? colors.text : colors.textMuted, fontSize: 14, marginTop: 2 }} numberOfLines={1}>{item.ultimo_mensaje}</Text>
                    {sinLeer ? (
                      <View style={[styles.globo, { backgroundColor: colors.danger }]}>
                        <Text style={{ color: colors.onDanger, fontSize: 11, fontWeight: '800' }}>{item.no_leidos > 9 ? '9+' : item.no_leidos}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          hilos.loading && !hilos.data ? <SkeletonList count={4} /> :
          hilos.error ? <ErrorState error={hilos.error} onRetry={hilos.reload} /> :
          <EmptyState
            icon="message-outline"
            title={verRespondidos ? 'No hay conversaciones respondidas' : 'Todavía no hay conversaciones'}
            text={verRespondidos ? 'Las consultas que ya respondiste se guardan acá y vuelven a la lista cuando el usuario escribe de nuevo.' : esStaff ? 'Cuando un usuario te escriba o le escribas al equipo, lo vas a ver acá.' : 'Si tenés una duda, escribile a la biblioteca con una nueva consulta.'}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  asunto: { flex: 1, fontSize: 16 },
  globo: { minWidth: 20, height: 20, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: spacing.sm },
});
