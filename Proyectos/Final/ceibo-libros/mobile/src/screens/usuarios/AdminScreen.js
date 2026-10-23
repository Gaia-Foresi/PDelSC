// Panel de administración (solo dueño): administrar roles de usuarios y bibliotecarios registrados.
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Pressable, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { nombreCompleto, ROL_TEXTO } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { SheetModal } from '../../components/Modal';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'bibliotecario', label: 'Bibliotecarios' },
  { value: 'usuario', label: 'Usuarios' },
  { value: 'bloqueado', label: 'Bloqueados' },
];
const ROLES = [
  { value: 'usuario', label: 'Usuario', texto: 'Reserva libros, ve sus préstamos y le escribe a la biblioteca.', icono: 'account-outline' },
  { value: 'bibliotecario', label: 'Bibliotecario', texto: 'Gestiona stock, préstamos, reservas y usuarios, y responde consultas.', icono: 'account-tie-outline' },
  { value: 'dueno', label: 'Dueño', texto: 'Acceso total: estadísticas, panel de admin y pedidos a la distribuidora.', icono: 'shield-crown-outline' },
];

export default function AdminScreen({ navigation }) {
  const { colors } = useTheme();
  const { esDueno, usuario: yo } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(false);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [elegido, setElegido] = useState(null); // usuario al que se le cambia el rol

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const datos = useAsync(() => {
    const body = { ...(busqueda ? { q: busqueda } : {}), limite: 100 };
    if (filtro === 'bloqueado') body.estado = 'bloqueado';
    else if (filtro !== 'todos') body.rol = filtro;
    return esDueno ? api.usuarios.listar(body) : Promise.resolve(null);
  }, [busqueda, filtro, esDueno]);
  useRefreshOnFocus(datos.refresh);

  if (!esDueno) {
    return (
      <ScreenContainer title="Panel de admin" back>
        <EmptyState icon="shield-lock-outline" title="Solo para el dueño" text="Este panel es exclusivo del dueño de la biblioteca." />
      </ScreenContainer>
    );
  }

  const cambiar = async (rol) => {
    if (!elegido || rol.value === elegido.rol) { setElegido(null); return; }
    const u = elegido;
    const ok = await confirm({
      title: `¿Cambiar el rol a ${rol.label}?`,
      message: `${nombreCompleto(u)} pasa de ${ROL_TEXTO[u.rol]} a ${rol.label}. ${rol.texto}`,
      confirmText: 'Cambiar rol', destructive: rol.value === 'dueno',
    });
    if (!ok) return;
    try {
      await api.admin.cambiarRol({ id: u.id, rol: rol.value });
      setElegido(null);
      toast.success(`${u.nombre} ahora es ${rol.label}.`);
      datos.refresh();
    } catch (err) {
      toast.fromError(err);
    }
  };

  const encabezado = (
    <View>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 }}>
        Administrá los roles de las personas registradas. Los usuarios nunca se eliminan: se bloquean desde su perfil.
      </Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por nombre o email" />
      <Chips options={FILTROS} value={filtro} onChange={setFiltro} />
    </View>
  );

  return (
    <ScreenContainer title="Panel de admin" back scroll={false}>
      <FlatList
        data={datos.data?.usuarios || []}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={contenido}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={datos.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item: u }) => (
          <Card>
            <Pressable accessibilityRole="button" accessibilityLabel={`${nombreCompleto(u)}, ${ROL_TEXTO[u.rol]}`} onPress={() => navigation.navigate('UsuarioDetalle', { id: u.id })} style={styles.fila}>
              <Avatar usuario={u} size={48} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{nombreCompleto(u)}{u.id === yo.id ? ' (vos)' : ''}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>{u.email}</Text>
                <View style={styles.badges}>
                  <Badge text={ROL_TEXTO[u.rol]} tone={u.rol === 'usuario' ? 'neutral' : 'primary'} />
                  {u.estado === 'bloqueado' ? <Badge text="Bloqueado" tone="danger" icon="lock-outline" /> : null}
                </View>
              </View>
            </Pressable>
            {u.id !== yo.id ? (
              <Button title="Cambiar rol" icon="account-switch-outline" variant="soft" small fullWidth={false} onPress={() => setElegido(u)} style={{ marginTop: spacing.md }} />
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          datos.loading && !datos.data ? <SkeletonList count={5} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState icon="account-search-outline" title="No encontramos personas" text="Probá con otra búsqueda o cambiá el filtro." />
        }
      />

      <SheetModal visible={!!elegido} title={elegido ? `Rol de ${elegido.nombre}` : ''} onClose={() => setElegido(null)}>
        {ROLES.map((r) => {
          const actual = elegido?.rol === r.value;
          return (
            <Card key={r.value} onPress={() => cambiar(r)} accessibilityLabel={`${r.label}${actual ? ', rol actual' : ''}`} style={actual ? { borderColor: colors.primary, borderWidth: 2 } : null}>
              <View style={styles.fila}>
                <Avatar nombre={r.label} apellido="" size={40} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{r.label}{actual ? ' · actual' : ''}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{r.texto}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </SheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
