// Usuarios registrados (staff). El dueño ve usuarios y bibliotecarios; el bibliotecario solo usuarios.
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { nombreCompleto, ROL_TEXTO } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';

const FILTROS_DUENO = [
  { value: 'todos', label: 'Todos' },
  { value: 'usuario', label: 'Usuarios' },
  { value: 'bibliotecario', label: 'Bibliotecarios' },
  { value: 'bloqueado', label: 'Bloqueados' },
];
const FILTROS_BIBLIO = [
  { value: 'todos', label: 'Todos' },
  { value: 'bloqueado', label: 'Bloqueados' },
];

export default function UsuariosScreen({ navigation }) {
  const { colors } = useTheme();
  const { esDueno, esStaff } = useAuth();
  const contenido = useListContentStyle(true);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const datos = useAsync(() => {
    const body = { ...(busqueda ? { q: busqueda } : {}) };
    if (filtro === 'bloqueado') body.estado = 'bloqueado';
    else if (filtro !== 'todos') body.rol = filtro;
    return api.usuarios.listar(body);
  }, [busqueda, filtro]);
  useRefreshOnFocus(datos.refresh);

  if (!esStaff) return <ScreenContainer title="Usuarios" menu tab><EmptyState icon="lock-outline" title="Sección solo para el personal" /></ScreenContainer>;

  const encabezado = (
    <View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por nombre o email" />
      <Chips options={esDueno ? FILTROS_DUENO : FILTROS_BIBLIO} value={filtro} onChange={setFiltro} />
      {datos.data ? <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md }}>{datos.data.total} {datos.data.total === 1 ? 'persona' : 'personas'}</Text> : null}
    </View>
  );

  return (
    <ScreenContainer title={esDueno ? 'Usuarios y bibliotecarios' : 'Usuarios'} menu tab scroll={false}>
      <FlatList
        data={datos.data?.usuarios || []}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={contenido}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={datos.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item: u }) => (
          <Card onPress={() => navigation.navigate('UsuarioDetalle', { id: u.id })} accessibilityLabel={`${nombreCompleto(u)}, ${ROL_TEXTO[u.rol]}${u.estado === 'bloqueado' ? ', bloqueado' : ''}`}>
            <View style={styles.fila}>
              <Avatar usuario={u} size={48} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{nombreCompleto(u)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>{u.email}</Text>
                <View style={styles.badges}>
                  <Badge text={ROL_TEXTO[u.rol]} tone={u.rol === 'usuario' ? 'neutral' : 'primary'} />
                  {u.estado === 'bloqueado' ? <Badge text="Bloqueado" tone="danger" icon="lock-outline" /> : null}
                  {u.prestamos_activos > 0 ? <Badge text={`${u.prestamos_activos} ${u.prestamos_activos === 1 ? 'libro' : 'libros'}`} tone="warning" icon="book-clock-outline" /> : null}
                </View>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          datos.loading && !datos.data ? <SkeletonList count={5} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState icon="account-search-outline" title="No encontramos personas" text="Probá con otra búsqueda o cambiá el filtro." />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
