// Libros de una categoría: buscador, filtro "solo disponibles" y reserva (leer en sala / llevar).
import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme/tokens';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import { useReservar } from '../../hooks/useReservar';
import BookCard from '../../components/BookCard';
import Button from '../../components/Button';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';
import BloqueoBanner from '../../components/BloqueoBanner';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';

const FILTROS = [
  { value: false, label: 'Todos' },
  { value: true, label: 'Solo disponibles' },
];

// Si se recarga la página, la categoría (que viaja en memoria) se pierde: se vuelve al inicio.
export default function LibrosCategoriaScreen(props) {
  const { navigation, route } = props;
  const categoria = route.params?.categoria;
  useEffect(() => { if (!categoria) navigation.navigate('Tabs'); }, [categoria, navigation]);
  return categoria ? <ListaCategoria {...props} categoria={categoria} /> : null;
}

function ListaCategoria({ navigation, categoria }) {
  const { bloqueado, usuario, esStaff, esDueno } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(false);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  // Espera 400 ms después de escribir antes de buscar
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const libros = useAsync(
    () => api.libros.listar({
      categoria_id: categoria.id,
      ...(busqueda ? { q: busqueda } : {}),
      ...(soloDisponibles ? { solo_disponibles: true } : {}),
    }),
    [categoria.id, busqueda, soloDisponibles],
  );
  useRefreshOnFocus(libros.refresh);
  const reservar = useReservar(libros.refresh);

  const eliminar = async (libro) => {
    const ok = await confirm({
      title: '¿Eliminar este libro?',
      message: `"${libro.titulo}" va a dejar de aparecer en el catálogo. Esta acción no se puede deshacer desde la app.`,
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
      <BloqueoBanner />
      {esStaff ? (
        <Button title={`Agregar libro a ${categoria.nombre}`} icon="plus" small fullWidth={false} onPress={() => navigation.navigate('LibroForm', { categoria_id: categoria.id })} style={{ marginBottom: spacing.md }} />
      ) : null}
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por título o autor" />
      <Chips options={FILTROS} value={soloDisponibles} onChange={setSoloDisponibles} />
    </View>
  );

  return (
    <ScreenContainer title={categoria.nombre} back scroll={false}>
      <FlatList
        data={libros.data?.libros || []}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={[contenido, { paddingBottom: contenido.paddingBottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={libros.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item }) => (
          <BookCard
            libro={item}
            color={categoria.color}
            onReservar={(tipo) => reservar(item, tipo)}
            bloqueado={bloqueado}
            motivoBloqueo={usuario?.motivo_bloqueo}
            staff={esStaff}
            onEdit={() => navigation.navigate('LibroForm', { libro: item })}
            onDelete={esDueno ? () => eliminar(item) : undefined}
          />
        )}
        ListEmptyComponent={
          libros.loading ? <SkeletonList count={3} height={120} /> :
          libros.error ? <ErrorState error={libros.error} onRetry={libros.reload} /> :
          <EmptyState
            icon="book-search-outline"
            title={busqueda || soloDisponibles ? 'No encontramos libros' : 'Todavía no hay libros'}
            text={busqueda || soloDisponibles ? 'Probá con otra búsqueda o sacá el filtro de disponibles.' : 'Cuando la biblioteca cargue libros en esta categoría los vas a ver acá.'}
          />
        }
      />
    </ScreenContainer>
  );
}
