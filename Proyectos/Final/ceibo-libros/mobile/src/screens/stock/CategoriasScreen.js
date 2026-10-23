// Categorías de libros: crear y editar (dueño y bibliotecario), agregar libros a cada una y eliminar (solo dueño, con confirmación).
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { MIN_TAP, font, radius, spacing } from '../../theme/tokens';
import { textoSobre } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import * as v from '../../utils/validators';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Input from '../../components/Input';
import { SheetModal } from '../../components/Modal';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';

// Solo se ofrecen íconos que existen en MaterialCommunityIcons
const ICONOS = [
  'leaf', 'bank', 'feather', 'rocket-launch', 'heart', 'book-open-variant', 'magnify', 'ghost',
  'star', 'palette', 'flask', 'music', 'paw', 'earth', 'atom', 'castle', 'school', 'sword',
].filter((i) => MaterialCommunityIcons.glyphMap[i]);

const COLORES = ['#8FAE8B', '#8D5524', '#E0C097', '#4A5D23', '#C62828', '#B85C38', '#5D4037', '#37474F', '#2E4A2E', '#9CAF88'];

const VACIO = { codigo: '', nombre: '', descripcion: '', icono: 'book-open-variant', color: '#8FAE8B' };

export default function CategoriasScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { esDueno } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(false);
  const cats = useAsync(() => api.categorias.listar(), []);
  useRefreshOnFocus(cats.refresh);

  const [editando, setEditando] = useState(null); // null = cerrado | {} = nueva | categoría = edición
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  // Si se llega desde "Nueva categoría" (pantalla principal) el formulario se abre solo
  useEffect(() => {
    if (route?.params?.nueva) { setErrores({}); setForm(VACIO); setEditando({}); navigation.setParams({ nueva: undefined }); }
  }, [route?.params?.nueva]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (cat) => {
    setErrores({});
    setForm(cat ? { codigo: cat.codigo, nombre: cat.nombre, descripcion: cat.descripcion || '', icono: cat.icono, color: cat.color } : VACIO);
    setEditando(cat || {});
  };

  const guardar = async () => {
    const e = {
      codigo: v.requerido(form.codigo, 'El código') || (form.codigo.trim().length > 5 ? 'Máximo 5 caracteres' : ''),
      nombre: v.requerido(form.nombre, 'El nombre'),
    };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setGuardando(true);
    const datos = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      icono: form.icono,
      color: form.color,
    };
    try {
      if (editando?.id) await api.categorias.actualizar({ id: editando.id, ...datos });
      else await api.categorias.crear(datos);
      toast.success(editando?.id ? 'Categoría actualizada.' : 'Categoría creada.');
      setEditando(null);
      cats.refresh();
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (cat) => {
    const ok = await confirm({
      title: '¿Eliminar esta categoría?',
      message: `Vas a eliminar "${cat.nombre}". Si tiene libros, primero tenés que moverlos a otra categoría.`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.categorias.eliminar({ id: cat.id });
      toast.success('Categoría eliminada.');
      cats.refresh();
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <ScreenContainer title="Categorías" back scroll={false} showBell={false}>
      <FlatList
        data={cats.data?.categorias || []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={contenido}
        refreshing={false}
        onRefresh={cats.refresh}
        ListHeaderComponent={<Button title="Nueva categoría" icon="plus" small fullWidth={false} onPress={() => abrir(null)} style={{ marginBottom: spacing.md }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.fila}>
              <View style={[styles.icono, { backgroundColor: item.color + '33', borderColor: item.color }]}>
                <MaterialCommunityIcons name={MaterialCommunityIcons.glyphMap[item.icono] ? item.icono : 'book-open-page-variant'} size={26} color={colors.mode === 'dark' ? item.color : colors.text} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', fontFamily: font.title }}>{item.nombre}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  Código {item.codigo} · {item.total_libros} {item.total_libros === 1 ? 'libro' : 'libros'}
                </Text>
              </View>
              <Pressable onPress={() => navigation.navigate('LibroForm', { categoria_id: item.id })} accessibilityRole="button" accessibilityLabel={`Agregar un libro a ${item.nombre}`} style={styles.btnIcono}>
                <MaterialCommunityIcons name="book-plus-outline" size={22} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => abrir(item)} accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`} style={styles.btnIcono}>
                <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
              </Pressable>
              {esDueno ? (
                <Pressable onPress={() => eliminar(item)} accessibilityRole="button" accessibilityLabel={`Eliminar ${item.nombre}`} style={styles.btnIcono}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          cats.loading ? <SkeletonList count={4} height={60} /> :
          cats.error ? <ErrorState error={cats.error} onRetry={cats.reload} /> :
          <EmptyState icon="shape-outline" title="No hay categorías" text="Creá la primera para poder ordenar los libros." />
        }
      />

      <SheetModal
        visible={!!editando}
        title={editando?.id ? 'Editar categoría' : 'Nueva categoría'}
        onClose={() => setEditando(null)}
        footer={<Button title="Guardar" icon="content-save-outline" onPress={guardar} loading={guardando} />}
      >
        <Input label="Código (máx. 5)" value={form.codigo} onChangeText={set('codigo')} error={errores.codigo} maxLength={5} autoCapitalize="none" placeholder="Ej.: cn, H, CF" />
        <Input label="Nombre" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} maxLength={60} placeholder="Ej.: Ciencias Naturales" />
        <Input label="Descripción (opcional)" value={form.descripcion} onChangeText={set('descripcion')} error={errores.descripcion} maxLength={255} />

        <Text style={[styles.etiqueta, { color: colors.text }]}>Ícono</Text>
        <View style={styles.grilla}>
          {ICONOS.map((i) => {
            const activo = form.icono === i;
            return (
              <Pressable key={i} onPress={() => set('icono')(i)} accessibilityRole="button" accessibilityLabel={`Ícono ${i}`} accessibilityState={{ selected: activo }}
                style={[styles.opcion, { backgroundColor: activo ? colors.primarySoft : colors.card, borderColor: activo ? colors.primary : colors.border }]}>
                <MaterialCommunityIcons name={i} size={24} color={activo ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.etiqueta, { color: colors.text }]}>Color</Text>
        <View style={styles.grilla}>
          {COLORES.map((c) => {
            const activo = form.color === c;
            return (
              <Pressable key={c} onPress={() => set('color')(c)} accessibilityRole="button" accessibilityLabel={`Color ${c}`} accessibilityState={{ selected: activo }}
                style={[styles.opcion, { backgroundColor: c, borderColor: activo ? colors.text : 'transparent', borderWidth: 3 }]}>
                {activo ? <MaterialCommunityIcons name="check" size={22} color={textoSobre(c)} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  icono: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btnIcono: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: spacing.xs },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  opcion: { width: MIN_TAP, height: MIN_TAP, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
