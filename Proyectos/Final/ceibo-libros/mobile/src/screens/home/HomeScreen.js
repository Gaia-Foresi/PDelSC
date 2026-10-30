// Pantalla principal: buscador + grilla de categorías (boceto 2).
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../../theme/tokens';
import { useMenuFijo, useResponsive } from '../../utils/useResponsive';
import { guardar, leer } from '../../utils/storage';
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

const ANCHO_MAX_COMPU = 1240;

function HistorialBusquedas({ historial, onUsar, onQuitar, onBorrarTodo }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.historial, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compuTitulo}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Historial de búsquedas</Text>
        {historial.length ? (
          <Pressable onPress={onBorrarTodo} accessibilityRole="button" accessibilityLabel="Borrar todo el historial">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Borrar todo</Text>
          </Pressable>
        ) : null}
      </View>
      {historial.length ? historial.map((h) => (
        <View key={h} style={styles.histFila}>
          <Pressable onPress={() => onUsar(h)} accessibilityRole="button" accessibilityLabel={`Buscar de nuevo ${h}`} style={styles.histTexto}>
            <MaterialCommunityIcons name="history" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontSize: 15, marginLeft: spacing.sm, flexShrink: 1 }} numberOfLines={1}>{h}</Text>
          </Pressable>
          <Pressable onPress={() => onQuitar(h)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${h} del historial`}>
            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      )) : (
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Todavía no buscaste nada. Lo que busques va a quedar acá.</Text>
      )}
    </View>
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

  // Versión compu (pantalla ancha): buscador + historial a la izquierda y categorías a la derecha
  const compu = useMenuFijo();
  const [historial, setHistorial] = useState([]);
  const claveHistorial = `historial_busquedas_${usuario?.id || 'anon'}`;
  useEffect(() => {
    let vivo = true;
    leer(claveHistorial).then((h) => { if (vivo && Array.isArray(h)) setHistorial(h); });
    return () => { vivo = false; };
  }, [claveHistorial]);

  const guardarHistorial = (lista) => { setHistorial(lista); guardar(claveHistorial, lista); };
  const recordarBusqueda = () => {
    const texto = q.trim();
    if (texto.length < 2) return;
    guardarHistorial([texto, ...historial.filter((h) => h.toLowerCase() !== texto.toLowerCase())].slice(0, 8));
  };
  const usarBusqueda = (texto) => { setQ(texto); setBusqueda(texto); };
  const quitarBusqueda = (texto) => guardarHistorial(historial.filter((h) => h !== texto));

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

  if (compu) {
    const ANCHO_IZQ = 360;
    const anchoDer = Math.min(width, ANCHO_MAX_COMPU) - spacing.lg * 3 - ANCHO_IZQ;
    const colsDer = anchoDer >= 760 ? 4 : 3;
    const anchoCat = Math.floor((anchoDer - gap * (colsDer - 1)) / colsDer);
    const items = cats.data ? [...cats.data.categorias, ...(esDueno ? [{ id: 'nueva', nueva: true }] : [])] : [];
    return (
      <ScreenContainer brand menu tab scroll={false} anchoMax={ANCHO_MAX_COMPU}>
        <View style={styles.compuFila}>
          <ScrollView style={{ width: ANCHO_IZQ, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BloqueoBanner />
            <Text style={[styles.hola, { color: colors.text, fontFamily: font.title }]}>Hola, {usuario?.nombre} 👋</Text>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>¿Qué querés leer hoy?</Text>
            <SearchBar value={q} onChangeText={setQ} onSubmit={recordarBusqueda} onBlur={recordarBusqueda} placeholder="Buscar por título o autor" />
            <HorarioAtencion />
            <HistorialBusquedas historial={historial} onUsar={usarBusqueda} onQuitar={quitarBusqueda} onBorrarTodo={() => guardarHistorial([])} />
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {buscando ? (
              <View>
                <View style={styles.compuTitulo}>
                  <Text style={[styles.seccion, { color: colors.text, marginBottom: 0 }]}>Resultados para "{busqueda}"</Text>
                  <Pressable onPress={() => { setQ(''); setBusqueda(''); }} accessibilityRole="button" accessibilityLabel="Volver a las categorías">
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>Ver categorías</Text>
                  </Pressable>
                </View>
                {(resultados.data?.libros || []).map((l) => (
                  <BookCard key={l.id} libro={l} mostrarCategoria onReservar={(t) => reservar(l, t)} bloqueado={bloqueado} motivoBloqueo={usuario?.motivo_bloqueo} />
                ))}
                {resultados.loading ? <Skeleton height={120} style={{ marginTop: spacing.md }} /> :
                  resultados.error ? <ErrorState error={resultados.error} onRetry={resultados.reload} /> :
                  !(resultados.data?.libros || []).length ? <EmptyState icon="book-search-outline" title="No encontramos libros" text={`No hay resultados para "${busqueda}". Probá con otra palabra.`} /> : null}
              </View>
            ) : (
              <View>
                <Text style={[styles.seccion, { color: colors.text }]}>Categorías</Text>
                {cats.loading && !items.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={130} width={anchoCat} style={{ borderRadius: radius.lg }} />)}
                  </View>
                ) : cats.error ? <ErrorState error={cats.error} onRetry={cats.reload} /> :
                !items.length ? <EmptyState title="Todavía no hay categorías" text="Cuando la biblioteca cargue categorías las vas a ver acá." /> : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                    {items.map((item) => (item.nueva
                      ? <NuevaCategoriaCard key="nueva" ancho={anchoCat} onPress={() => navigation.navigate('Categorias', { nueva: true })} />
                      : <CategoriaCard key={item.id} categoria={item} ancho={anchoCat} onPress={() => navigation.navigate('LibrosCategoria', { categoria: item })} />
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </ScreenContainer>
    );
  }

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
  compuFila: { flex: 1, flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, paddingTop: 64, paddingBottom: 0 },
  compuTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  historial: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  histFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  histTexto: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  catNombre: { fontSize: 17, fontWeight: '700', lineHeight: 21 },
});
