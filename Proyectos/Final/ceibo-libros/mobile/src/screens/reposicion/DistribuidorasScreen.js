// Distribuidoras a las que el dueño les pide libros (solo dueño).
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { useAsync } from '../../hooks/useAsync';
import * as v from '../../utils/validators';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Input from '../../components/Input';
import { SheetModal } from '../../components/Modal';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const VACIO = { nombre: '', email: '', telefono: '' };

export default function DistribuidorasScreen() {
  const { colors } = useTheme();
  const { esDueno } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(false);
  const [editando, setEditando] = useState(null); // null = cerrado, {} = nueva, {id,...} = editar
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const datos = useAsync(() => (esDueno ? api.distribuidoras.listar() : Promise.resolve(null)), [esDueno]);

  if (!esDueno) return <ScreenContainer title="Distribuidoras" back><EmptyState icon="lock-outline" title="Solo para el dueño" /></ScreenContainer>;

  const abrir = (d) => {
    setEditando(d || {});
    setForm(d ? { nombre: d.nombre, email: d.email, telefono: d.telefono || '' } : VACIO);
    setErrores({});
  };

  const guardar = async () => {
    const e = { nombre: v.requerido(form.nombre, 'El nombre'), email: v.email(form.email) };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setGuardando(true);
    try {
      const body = { nombre: form.nombre.trim(), email: form.email.trim().toLowerCase(), telefono: form.telefono.trim() };
      if (editando.id) await api.distribuidoras.actualizar({ id: editando.id, ...body });
      else await api.distribuidoras.crear(body);
      toast.success(editando.id ? 'Distribuidora actualizada.' : 'Distribuidora agregada.');
      setEditando(null);
      datos.refresh();
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (d) => {
    const ok = await confirm({
      title: `¿Eliminar a ${d.nombre}?`,
      message: 'Ya no vas a poder enviarle pedidos. El historial de pedidos anteriores se conserva.',
      confirmText: 'Eliminar', destructive: true,
    });
    if (!ok) return;
    try {
      await api.distribuidoras.eliminar({ id: d.id });
      toast.success('Distribuidora eliminada.');
      datos.refresh();
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <ScreenContainer title="Distribuidoras" back scroll={false}>
      <FlatList
        data={datos.data?.distribuidoras || []}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={contenido}
        refreshing={false}
        onRefresh={datos.refresh}
        ListHeaderComponent={<Button title="Agregar distribuidora" icon="plus" onPress={() => abrir(null)} style={{ marginBottom: spacing.lg }} />}
        renderItem={({ item: d }) => (
          <Card>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{d.nombre}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 2 }}>{d.email}</Text>
            {d.telefono ? <Text style={{ color: colors.textMuted }}>{d.telefono}</Text> : null}
            <View style={styles.acciones}>
              <Button title="Editar" icon="pencil-outline" variant="soft" small onPress={() => abrir(d)} style={{ flex: 1 }} />
              <View style={{ width: spacing.sm }} />
              <Button title="Eliminar" icon="trash-can-outline" variant="secondary" small onPress={() => eliminar(d)} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          datos.loading && !datos.data ? <SkeletonList count={2} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState icon="truck-outline" title="Todavía no cargaste distribuidoras" text="Agregá una para poder pedirle libros." />
        }
      />
      <SheetModal
        visible={!!editando}
        title={editando?.id ? 'Editar distribuidora' : 'Nueva distribuidora'}
        onClose={() => setEditando(null)}
        footer={<Button title="Guardar" onPress={guardar} loading={guardando} />}
      >
        <Input label="Nombre" icon="truck-outline" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} maxLength={100} />
        <Input label="Email (a donde llegan los pedidos)" icon="email-outline" value={form.email} onChangeText={set('email')} error={errores.email} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Teléfono" icon="phone-outline" value={form.telefono} onChangeText={set('telefono')} error={errores.telefono} keyboardType="phone-pad" placeholder="Opcional" maxLength={30} />
      </SheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ acciones: { flexDirection: 'row', marginTop: spacing.md } });
