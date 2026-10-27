// Stock de libros (solo personal): resumen, alertas de stock bajo/agotado, filtros y acceso a altas, categorías y pedidos.
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, spacing } from '../../theme/tokens';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Badge from '../../components/Badge';
import BookCard from '../../components/BookCard';
import Button from '../../components/Button';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';

function Dato({ valor, titulo, alerta }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dato, { backgroundColor: alerta ? colors.dangerSoft : colors.card, borderColor: alerta ? colors.danger : colors.border }]}>
      <Text style={{ color: alerta ? colors.danger : colors.text, fontSize: 24, fontWeight: '800', fontFamily: font.title }}>{valor}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{titulo}</Text>
    </View>
  );
}

export default function StockScreen({ navigation }) {
  const { esDueno } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState(null); // null = todas | 'agotados' | id de categoría

  const libros = useAsync(() => api.libros.listar({}), []);
  const cats = useAsync(() => api.categorias.listar(), []);
  const recargar = () => { libros.refresh(); cats.refresh(); };
  useRefreshOnFocus(recargar);

  const todos = useMemo(() => libros.data?.libros || [], [libros.data]);
  const resumen = useMemo(() => ({
    titulos: todos.length,
    ejemplares: todos.reduce((s, l) => s + l.stock_total, 0),
    agotados: todos.filter((l) => l.disponibles <= 0).length,
  }), [todos]);

  // El filtrado se hace en el celular: son pocos libros y responde al instante
  const visibles = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return todos.filter((l) => {
      if (filtro === 'agotados' && l.disponibles > 0) return false;
      if (typeof filtro === 'number' && !(l.categorias || []).some((c) => c.id === filtro) && l.categoria_id !== filtro) return false;
      return !texto || l.titulo.toLowerCase().includes(texto) || l.autor.toLowerCase().includes(texto);
    });
  }, [todos, q, filtro]);

  const opciones = [
    { value: null, label: 'Todas' },
    { value: 'agotados', label: `Agotados (${resumen.agotados})` },
    ...(cats.data?.categorias || []).map((c) => ({ value: c.id, label: c.nombre })),
  ];

  const eliminar = async (libro) => {
    const ok = await confirm({
      title: '¿Eliminar este libro?',
      message: `"${libro.titulo}" va a dejar de aparecer en el catálogo. Si está prestado o reservado no se puede eliminar.`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.libros.eliminar({ id: libro.id });
      toast.success('Libro eliminado.');
      libros.refresh();
    } catch (e) {
      toast.fromError(e);
    }
  };

  const encabezado = (
    <View>
      <View style={styles.datos}>
        <Dato valor={resumen.titulos} titulo="Títulos" />
        <Dato valor={resumen.ejemplares} titulo="Ejemplares" />
        <Dato valor={resumen.agotados} titulo="Sin stock" alerta={resumen.agotados > 0} />
      </View>
      <View style={styles.acciones}>
        <Button title="Agregar libro" icon="plus" small fullWidth={false} onPress={() => navigation.navigate('LibroForm')} />
        <Button title="Categorías" icon="shape-outline" variant="secondary" small fullWidth={false} onPress={() => navigation.navigate('Categorias')} />
        {esDueno ? <Button title="Pedir libros" icon="truck-delivery-outline" variant="soft" small fullWidth={false} onPress={() => navigation.navigate('PedirLibros')} /> : null}
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por título o autor" />
      <Chips options={opciones} value={filtro} onChange={setFiltro} />
    </View>
  );

  return (
    <ScreenContainer title="Stock de libros" menu tab scroll={false}>
      <FlatList
        data={visibles}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={contenido}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={recargar}
        ListHeaderComponent={encabezado}
        renderItem={({ item }) => {
          const agotado = item.disponibles <= 0;
          const bajo = !agotado && item.stock_total <= 1;
          return (
            <View>
              {agotado || bajo ? (
                <Badge
                  text={agotado ? 'Agotado: sin ejemplares disponibles' : 'Stock bajo: queda un solo ejemplar'}
                  tone={agotado ? 'danger' : 'warning'}
                  icon="alert-outline"
                  style={{ marginBottom: spacing.xs }}
                />
              ) : null}
              <BookCard
                libro={item}
                mostrarCategoria
                staff
                onEdit={() => navigation.navigate('LibroForm', { libro: item })}
                onDelete={esDueno ? () => eliminar(item) : undefined}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          libros.loading ? <SkeletonList count={3} height={120} /> :
          libros.error ? <ErrorState error={libros.error} onRetry={libros.reload} /> :
          <EmptyState
            icon="bookshelf"
            title={todos.length ? 'No hay libros con ese filtro' : 'Todavía no hay libros'}
            text={todos.length ? 'Probá con otra búsqueda o categoría.' : 'Agregá el primer libro al catálogo.'}
            actionTitle={todos.length ? undefined : 'Agregar libro'}
            onAction={() => navigation.navigate('LibroForm')}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  datos: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dato: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
