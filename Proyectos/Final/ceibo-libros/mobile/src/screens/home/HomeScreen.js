// Pantalla principal: buscador + grilla de categorías (boceto 2).
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../../theme/tokens';
import { useResponsive } from '../../utils/useResponsive';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import { useReservar } from '../../hooks/useReservar';
import BookCard from '../../components/BookCard';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { Skeleton } from '../../components/Skeleton';
import BloqueoBanner from '../../components/BloqueoBanner';
import HorarioAtencion from '../../components/HorarioAtencion';

export function iconoSeguro(nombre) {
  return MaterialCommunityIcons.glyphMap[nombre] ? nombre : 'book-open-page-variant';
}

function CategoriaCard({ categoria, ancho, onPress }) {
  const { colors } = useTheme();
  const color = categoria.color || colors.secondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${categoria.nombre}, ${categoria.total_libros} libros`}
      style={({ pressed }) => [styles.cat, { width: ancho, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }, shadow(colors.shadow)]}
    >
      <View style={[styles.catIcon, { backgroundColor: color + '33', borderColor: color }]}>
        <MaterialCommunityIcons name={iconoSeguro(categoria.icono)} size={32} color={colors.mode === 'dark' ? color : colors.text} />
      </View>
      <Text style={[styles.catNombre, { color: colors.text, fontFamily: font.title }]} numberOfLines={2}>{categoria.nombre}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{categoria.total_libros} {categoria.total_libros === 1 ? 'libro' : 'libros'}</Text>
    </Pressable>
  );
}

function NuevaCategoriaCard({ ancho, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Crear una nueva categoría"
      style={({ pressed }) => [styles.cat, { width: ancho, backgroundColor: 'transparent', borderColor: colors.primary, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }]}
    >
      <MaterialCommunityIcons name="plus-circle-outline" size={40} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15, marginTop: spacing.sm, textAlign: 'center' }}>Nueva categoría</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { bloqueado, usuario, esDueno } = useAuth();
  const { width, columns, maxWidth } = useResponsive();
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cats = useAsync(() => api.categorias.listar(), []);
  useRefreshOnFocus(cats.refresh);

  // Espera 400 ms después de escribir antes de buscar
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const resultados = useAsync(() => (busqueda ? api.libros.listar({ q: busqueda }) : Promise.resolve(null)), [busqueda]);
  const reservar = useReservar(resultados.refresh);

  const areaUtil = Math.min(width, maxWidth || width) - spacing.lg * 2;
  const gap = spacing.md;
  const ancho = Math.floor((areaUtil - gap * (columns - 1)) / columns);
  const buscando = !!busqueda;

  const encabezado = (
    <View>
      <BloqueoBanner />
      <Text style={[styles.hola, { color: colors.text, fontFamily: font.title }]}>Hola, {usuario?.nombre} 👋</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>¿Qué querés leer hoy?</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por título o autor" />
      <HorarioAtencion />
      {!buscando ? <Text style={[styles.seccion, { color: colors.text }]}>Categorías</Text> : null}
    </View>
  );

  return (
    <ScreenContainer brand menu tab scroll={false}>
      {buscando ? (
        <FlatList
          data={resultados.data?.libros || []}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={encabezado}
          renderItem={({ item }) => (
            <BookCard libro={item} mostrarCategoria onReservar={(t) => reservar(item, t)} bloqueado={bloqueado} motivoBloqueo={usuario?.motivo_bloqueo} />
          )}
          ListEmptyComponent={
            resultados.loading ? <Skeleton height={120} style={{ marginTop: spacing.md }} /> :
            resultados.error ? <ErrorState error={resultados.error} onRetry={resultados.reload} /> :
            <EmptyState icon="book-search-outline" title="No encontramos libros" text={`No hay resultados para "${busqueda}". Probá con otra palabra.`} />
          }
        />
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={cats.data ? [...cats.data.categorias, ...(esDueno ? [{ id: 'nueva', nueva: true }] : [])] : []}
          numColumns={columns}
          keyExtractor={(c) => String(c.id)}
          columnWrapperStyle={{ gap, marginBottom: gap }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          refreshing={false}
          onRefresh={cats.refresh}
          ListHeaderComponent={encabezado}
          renderItem={({ item }) => (item.nueva
            ? <NuevaCategoriaCard ancho={ancho} onPress={() => navigation.navigate('Categorias', { nueva: true })} />
            : <CategoriaCard categoria={item} ancho={ancho} onPress={() => navigation.navigate('LibrosCategoria', { categoria: item })} />
          )}
          ListEmptyComponent={
            cats.loading ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={130} width={ancho} style={{ borderRadius: radius.lg }} />)}
              </View>
            ) : cats.error ? <ErrorState error={cats.error} onRetry={cats.reload} /> :
            <EmptyState title="Todavía no hay categorías" text="Cuando la biblioteca cargue categorías las vas a ver acá." />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hola: { fontSize: 24, fontWeight: '700' },
  seccion: { fontSize: 17, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.xs },
  cat: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, alignItems: 'flex-start', minHeight: 140 },
  catIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  catNombre: { fontSize: 17, fontWeight: '700', lineHeight: 21 },
});
