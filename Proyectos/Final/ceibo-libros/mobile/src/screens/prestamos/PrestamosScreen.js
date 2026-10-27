// Préstamos. Usuario: "Mis préstamos". Personal (dueño / bibliotecario): todos los préstamos con filtros y búsqueda.
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { diasEntre, diasTexto, fecha, plural, visitaTexto } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Badge from '../../components/Badge';
import BloqueoBanner from '../../components/BloqueoBanner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import CodigoRetiro from '../../components/CodigoRetiro';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';

const FILTROS_USUARIO = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'cerrado', label: 'Cerrados' },
];
const FILTROS_STAFF = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'cerrado', label: 'Cerrados' },
];

function PrestamoCard({ prestamo, staff, onPress }) {
  const { colors } = useTheme();
  const cerrado = prestamo.estado === 'cerrado';
  const porVencer = !cerrado && !prestamo.vencido && prestamo.dias_restantes <= 2;
  const tono = cerrado ? 'neutral' : prestamo.vencido ? 'danger' : porVencer ? 'warning' : 'success';
  const icono = cerrado ? 'check-circle-outline' : prestamo.vencido ? 'alert-circle-outline' : 'clock-outline';

  return (
    <Card onPress={onPress} accessibilityLabel={`Préstamo ${prestamo.id}, ${diasTexto(prestamo)}`}>
      <View style={styles.cabecera}>
        <View style={{ flex: 1 }}>
          {staff ? <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{prestamo.usuario.nombre}</Text> : <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Préstamo #{prestamo.id}</Text>}
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
            Desde {fecha(prestamo.fecha_inicio)} · {cerrado ? 'cerrado' : `vence ${fecha(prestamo.fecha_vencimiento)}`} · {plural(diasEntre(prestamo.fecha_inicio, prestamo.fecha_vencimiento), 'día', 'días')} de plazo
          </Text>
          {prestamo.visita ? <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 2 }}>Visita: {visitaTexto(prestamo.visita)}</Text> : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </View>
      <Badge text={diasTexto(prestamo)} tone={tono} icon={icono} style={{ marginTop: spacing.sm }} />
      {!cerrado ? <CodigoRetiro codigo={prestamo.codigo_retiro} compacto /> : null}
      <View style={{ marginTop: spacing.md }}>
        {prestamo.items.map((i) => (
          <View key={i.libro_id} style={styles.item}>
            <MaterialCommunityIcons name={i.devuelto_en ? 'check-circle' : 'book-open-page-variant-outline'} size={18} color={i.devuelto_en ? colors.success : colors.primary} />
            <Text style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 14, textDecorationLine: i.devuelto_en ? 'line-through' : 'none' }} numberOfLines={1}>
              {i.titulo} <Text style={{ color: colors.textMuted }}>· {i.autor}</Text>
            </Text>
          </View>
        ))}
      </View>
      {porVencer && !staff ? (
        <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '600', marginTop: spacing.sm }}>Se acerca la fecha: acordate de devolverlos a tiempo.</Text>
      ) : null}
    </Card>
  );
}

export default function PrestamosScreen({ navigation }) {
  const { esStaff } = useAuth();
  const contenido = useListContentStyle(true);
  const [filtro, setFiltro] = useState('todos');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const datos = useAsync(
    () => (esStaff
      ? api.prestamos.listar({ ...(filtro !== 'todos' ? { estado: filtro } : {}), ...(busqueda ? { q: busqueda } : {}) })
      : api.prestamos.mis()),
    [esStaff, filtro, busqueda],
  );
  useRefreshOnFocus(datos.refresh);

  // El usuario común filtra en el celular (son pocos préstamos)
  const prestamos = useMemo(() => {
    const todos = datos.data?.prestamos || [];
    return esStaff || filtro === 'todos' ? todos : todos.filter((p) => p.estado === filtro);
  }, [datos.data, esStaff, filtro]);

  const encabezado = (
    <View>
      {!esStaff ? <BloqueoBanner /> : null}
      <View style={styles.acciones}>
        {esStaff ? <Button title="Nuevo préstamo" icon="plus" small fullWidth={false} onPress={() => navigation.navigate('PrestamoNuevo')} /> : null}
      </View>
      {esStaff ? <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por usuario, libro, DNI o código" /> : null}
      <Chips options={esStaff ? FILTROS_STAFF : FILTROS_USUARIO} value={filtro} onChange={setFiltro} />
    </View>
  );

  return (
    <ScreenContainer title={esStaff ? 'Préstamos hechos' : 'Mis préstamos'} menu tab scroll={false}>
      <FlatList
        data={prestamos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={contenido}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={datos.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item }) => <PrestamoCard prestamo={item} staff={esStaff} onPress={() => navigation.navigate('PrestamoDetalle', { id: item.id })} />}
        ListEmptyComponent={
          datos.loading ? <SkeletonList count={3} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState
            icon="book-clock-outline"
            title="No hay préstamos para mostrar"
            text={esStaff ? 'Cuando registres préstamos los vas a ver acá.' : 'Cuando te lleves libros de la biblioteca los vas a ver acá, con su fecha de devolución.'}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
