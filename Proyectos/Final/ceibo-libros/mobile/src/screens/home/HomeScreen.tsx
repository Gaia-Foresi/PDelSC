// Pantalla principal: buscador + grilla de categorías (boceto 2).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../../theme/tokens';
import { useMenuFijo, useResponsive } from '../../utils/useResponsive';
import { borrarHistorial, leerHistorial, quitarBusqueda, recordarBusqueda } from '../../utils/historialBusquedas';
import type { BusquedaGuardada } from '../../utils/historialBusquedas';
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

import type { PantallaProps } from '../../types';
export function iconoSeguro(nombre) {
  return MaterialCommunityIcons.glyphMap[nombre] ? nombre : 'book-open-page-variant';
}

interface CategoriaCardProps {
  categoria?: any;
  ancho?: any;
  alto?: number;
  onPress?: (...args: any[]) => any;
}

// Alto fijo de las tarjetas de categoría en la compu: el historial rápido crece como máximo hasta la tercera fila
export const CAT_ALTO = 170;
const GAP_COMPU = 12;
const FILAS_HISTORIAL = 3;

function CategoriaCard({ categoria, ancho, alto, onPress }: CategoriaCardProps) {
  const { colors } = useTheme();
  const color = categoria.color || colors.secondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${categoria.nombre}, ${categoria.total_libros} libros`}
      style={({ pressed }) => [styles.cat, alto ? { height: alto } : null, { width: ancho, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }, shadow(colors.shadow)]}
    >
      <View style={[styles.catIcon, { backgroundColor: color + '33', borderColor: color }]}>
        <MaterialCommunityIcons name={iconoSeguro(categoria.icono)} size={32} color={colors.mode === 'dark' ? color : colors.text} />
      </View>
      <Text style={[styles.catNombre, { color: colors.text, fontFamily: font.title }]} numberOfLines={2}>{categoria.nombre}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{categoria.total_libros} {categoria.total_libros === 1 ? 'libro' : 'libros'}</Text>
    </Pressable>
  );
}

interface NuevaCategoriaCardProps {
  ancho?: any;
  alto?: number;
  onPress?: (...args: any[]) => any;
}

function NuevaCategoriaCard({ ancho, alto, onPress }: NuevaCategoriaCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Crear una nueva categoría"
      style={({ pressed }) => [styles.cat, alto ? { height: alto } : null, { width: ancho, backgroundColor: 'transparent', borderColor: colors.primary, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }]}
    >
      <MaterialCommunityIcons name="plus-circle-outline" size={40} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15, marginTop: spacing.sm, textAlign: 'center' }}>Nueva categoría</Text>
    </Pressable>
  );
}

const ANCHO_MAX_COMPU = 1240;

interface HistorialBusquedasProps {
  historial: BusquedaGuardada[];
  onUsar: (q: string) => void;
  onQuitar: (q: string) => void;
  onBorrarTodo: () => void;
  altoMax: number;
}

// Historial rápido (solo compu): crece hasta llegar a la altura de la tercera fila de categorías y de ahí en más se desplaza adentro
function HistorialBusquedas({ historial, onUsar, onQuitar, onBorrarTodo, altoMax }: HistorialBusquedasProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.historial, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: altoMax }]}>
      <View style={styles.compuTitulo}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Búsquedas recientes</Text>
        {historial.length ? (
          <Pressable onPress={onBorrarTodo} accessibilityRole="button" accessibilityLabel="Borrar todo el historial">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Borrar todo</Text>
          </Pressable>
        ) : null}
      </View>
      {historial.length ? (
        <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {historial.map((h) => (
            <View key={h.q} style={styles.histFila}>
              <Pressable onPress={() => onUsar(h.q)} accessibilityRole="button" accessibilityLabel={`Buscar de nuevo ${h.q}`} style={styles.histTexto}>
                <MaterialCommunityIcons name="history" size={18} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: 15, marginLeft: spacing.sm, flexShrink: 1 }} numberOfLines={1}>{h.q}</Text>
              </Pressable>
              <Pressable onPress={() => onQuitar(h.q)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${h.q} del historial`}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Todavía no buscaste nada. Lo que busques va a quedar acá.</Text>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation, route }: PantallaProps) {
  const { colors } = useTheme();
  const { bloqueado, usuario, esDueno } = useAuth();
  const { width, columns, maxWidth } = useResponsive();
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const qRef = useRef('');
  qRef.current = q;

  const cats = useAsync(() => api.categorias.listar(), []);
  useRefreshOnFocus(cats.refresh);

  // Espera 400 ms después de escribir antes de buscar
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const resultados = useAsync(() => (busqueda ? api.libros.listar({ q: busqueda }) : Promise.resolve(null)), [busqueda]);
  const reservar = useReservar(resultados.refresh);

  // Historial de búsquedas (se ve completo, con fechas, en el menú de la cuenta; acá solo el rápido de la compu)
  const compu = useMenuFijo();
  // Medidas para que el historial rápido termine, como máximo, donde termina la tercera fila de categorías
  const [yHistorial, setYHistorial] = useState(190);
  const [yGrilla, setYGrilla] = useState(34);
  const altoHistorial = Math.max(150, yGrilla + CAT_ALTO * FILAS_HISTORIAL + GAP_COMPU * (FILAS_HISTORIAL - 1) - yHistorial);
  const [historial, setHistorial] = useState<BusquedaGuardada[]>([]);
  useEffect(() => {
    let vivo = true;
    leerHistorial(usuario?.id).then((h) => { if (vivo) setHistorial(h); });
    return () => { vivo = false; };
  }, [usuario?.id]);

  const recordar = useCallback(async () => {
    const texto = qRef.current.trim();
    if (texto.length < 2) return;
    setHistorial(await recordarBusqueda(usuario?.id, texto));
  }, [usuario?.id]);
  const limpiarBusqueda = useCallback(() => { setQ(''); setBusqueda(''); }, []);
  const usarBusqueda = (texto: string) => { setQ(texto); setBusqueda(texto); };

  // Viene del "Historial de búsquedas" del menú: busca de nuevo lo elegido
  const pedida = route?.params?.buscar as string | undefined;
  const marca = route?.params?.t;
  useEffect(() => {
    if (pedida) {
      usarBusqueda(pedida);
      navigation.setParams({ buscar: undefined, t: undefined });
    }
  }, [pedida, marca]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al salir de la pantalla (o apretar "atrás" con una búsqueda abierta) se guarda en el historial y se borra el buscador
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!qRef.current) return false;
        recordar();
        limpiarBusqueda();
        Keyboard.dismiss();
        return true;
      });
      return () => {
        sub.remove();
        recordar();
        limpiarBusqueda();
      };
    }, [recordar, limpiarBusqueda]),
  );

  const areaUtil = Math.min(width, maxWidth || width) - spacing.lg * 2;
  const gap = spacing.md;
  const ancho = Math.floor((areaUtil - gap * (columns - 1)) / columns);
  const buscando = !!busqueda;

  const listaResultados = (
    <View>
      {(resultados.data?.libros || []).map((l) => (
        <BookCard key={l.id} libro={l} mostrarCategoria onReservar={(t) => reservar(l, t)} bloqueado={bloqueado} motivoBloqueo={usuario?.motivo_bloqueo} />
      ))}
      {resultados.loading ? <Skeleton height={120} style={{ marginTop: spacing.md }} /> :
        resultados.error ? <ErrorState error={resultados.error} onRetry={resultados.reload} /> :
        !(resultados.data?.libros || []).length ? <EmptyState icon="book-search-outline" title="No encontramos libros" text={`No hay resultados para "${busqueda}". Probá con otra palabra.`} /> : null}
    </View>
  );

  const items: any[] = cats.data ? [...cats.data.categorias, ...(esDueno ? [{ id: 'nueva', nueva: true }] : [])] : [];
  const grilla = (anchoCat: number, alto?: number) => (
    cats.loading && !items.length ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={alto || 130} width={anchoCat} style={{ borderRadius: radius.lg }} />)}
      </View>
    ) : cats.error ? <ErrorState error={cats.error} onRetry={cats.reload} /> :
    !items.length ? <EmptyState title="Todavía no hay categorías" text="Cuando la biblioteca cargue categorías las vas a ver acá." /> : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {items.map((item) => (item.nueva
          ? <NuevaCategoriaCard key="nueva" ancho={anchoCat} alto={alto} onPress={() => navigation.navigate('Categorias', { nueva: true })} />
          : <CategoriaCard key={item.id} categoria={item} ancho={anchoCat} alto={alto} onPress={() => navigation.navigate('LibrosCategoria', { categoria: item })} />
        ))}
      </View>
    )
  );

  if (compu) {
    const ANCHO_IZQ = 360;
    const anchoDer = Math.min(width, ANCHO_MAX_COMPU) - spacing.lg * 3 - ANCHO_IZQ;
    const colsDer = anchoDer >= 760 ? 4 : 3;
    const anchoCat = Math.floor((anchoDer - GAP_COMPU * (colsDer - 1)) / colsDer);
    return (
      <ScreenContainer brand menu tab scroll={false} anchoMax={ANCHO_MAX_COMPU}>
        <View style={styles.compuFila}>
          <ScrollView style={{ width: ANCHO_IZQ, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BloqueoBanner />
            <Text style={[styles.hola, { color: colors.text, fontFamily: font.title }]}>Hola, {usuario?.nombre} 👋</Text>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>¿Qué querés leer hoy?</Text>
            <SearchBar value={q} onChangeText={setQ} onSubmit={recordar} onBlur={recordar} placeholder="Buscar por título o autor" />
            <HorarioAtencion />
            <View onLayout={(e) => setYHistorial(e.nativeEvent.layout.y)}>
            <HistorialBusquedas
              altoMax={altoHistorial}
              historial={historial}
              onUsar={usarBusqueda}
              onQuitar={async (t) => setHistorial(await quitarBusqueda(usuario?.id, t))}
              onBorrarTodo={async () => { await borrarHistorial(usuario?.id); setHistorial([]); }}
            />
            </View>
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {buscando ? (
              <View>
                <View style={styles.compuTitulo}>
                  <Text style={[styles.seccion, { color: colors.text, marginBottom: 0 }]}>Resultados para "{busqueda}"</Text>
                  <Pressable onPress={limpiarBusqueda} accessibilityRole="button" accessibilityLabel="Volver a las categorías">
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>Ver categorías</Text>
                  </Pressable>
                </View>
                {listaResultados}
              </View>
            ) : (
              <View>
                <Text style={[styles.seccion, { color: colors.text }]}>Categorías</Text>
                <View onLayout={(e) => setYGrilla(e.nativeEvent.layout.y)}>{grilla(anchoCat, CAT_ALTO)}</View>
              </View>
            )}
          </ScrollView>
        </View>
      </ScreenContainer>
    );
  }

  // Celular: una sola lista que se desplaza. El buscador no se vuelve a crear al aparecer los resultados,
  // así el teclado queda abierto mientras se escribe.
  return (
    <ScreenContainer brand menu tab refreshing={false} onRefresh={buscando ? resultados.refresh : cats.refresh}>
      <BloqueoBanner />
      <Text style={[styles.hola, { color: colors.text, fontFamily: font.title }]}>Hola, {usuario?.nombre} 👋</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>¿Qué querés leer hoy?</Text>
      <SearchBar value={q} onChangeText={setQ} onSubmit={recordar} onBlur={recordar} placeholder="Buscar por título o autor" />
      <HorarioAtencion />
      {buscando ? listaResultados : (
        <View>
          <Text style={[styles.seccion, { color: colors.text }]}>Categorías</Text>
          {grilla(ancho)}
        </View>
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
