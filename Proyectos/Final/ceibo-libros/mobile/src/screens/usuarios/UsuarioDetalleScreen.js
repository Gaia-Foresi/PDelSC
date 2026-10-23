// Perfil de un usuario para el personal: préstamos, reservas, bloqueo con mensaje y (dueño) cambio de rol.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, spacing } from '../../theme/tokens';
import { diasTexto, fecha, fechaHora, nombreCompleto, ROL_TEXTO } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Input from '../../components/Input';
import { SheetModal } from '../../components/Modal';
import ScreenContainer from '../../components/ScreenContainer';
import SelectField from '../../components/SelectField';
import { SkeletonList } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const MOTIVO_BASE = 'Tenés libros pendientes de devolución. Devolvelos en la biblioteca para habilitar tu cuenta.';
const ROLES = [
  { value: 'usuario', label: 'Usuario', description: 'Reserva libros, ve sus préstamos y consulta a la biblioteca.' },
  { value: 'bibliotecario', label: 'Bibliotecario', description: 'Gestiona stock, préstamos, reservas y usuarios.' },
  { value: 'dueno', label: 'Dueño', description: 'Acceso total: estadísticas, panel de admin y pedidos.' },
];
const ESTADO_RESERVA = { activa: 'primary', cumplida: 'success', cancelada: 'neutral', vencida: 'warning' };

export default function UsuarioDetalleScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { esDueno, usuario: yo } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [sheetBloqueo, setSheetBloqueo] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVO_BASE);
  const [errorMotivo, setErrorMotivo] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const det = useAsync(() => api.usuarios.detalle({ id }), [id]);
  useRefreshOnFocus(det.refresh);

  const u = det.data?.usuario;
  const esComun = u?.rol === 'usuario';
  const soyYo = u?.id === yo.id;

  const bloquear = async () => {
    if (!motivo.trim()) { setErrorMotivo('Escribí el mensaje que va a ver el usuario'); return; }
    const ok = await confirm({
      title: `¿Bloquear a ${u.nombre}?`,
      message: 'No va a poder reservar ni pedir libros hasta que devuelva lo pendiente. Va a ver el mensaje que escribiste.',
      confirmText: 'Bloquear', destructive: true,
    });
    if (!ok) return;
    setTrabajando(true);
    try {
      await api.usuarios.bloquear({ id, motivo: motivo.trim() });
      setSheetBloqueo(false);
      toast.success('Usuario bloqueado. Le avisamos con tu mensaje.');
      det.refresh();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setTrabajando(false);
    }
  };

  const desbloquear = async () => {
    const ok = await confirm({ title: `¿Desbloquear a ${u.nombre}?`, message: 'Va a poder volver a reservar y pedir libros.', confirmText: 'Desbloquear' });
    if (!ok) return;
    setTrabajando(true);
    try {
      await api.usuarios.desbloquear({ id });
      toast.success('Usuario desbloqueado.');
      det.refresh();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setTrabajando(false);
    }
  };

  const cambiarRol = async (rol) => {
    if (rol === u.rol) return;
    const ok = await confirm({
      title: `¿Cambiar el rol a ${ROL_TEXTO[rol]}?`,
      message: `${nombreCompleto(u)} pasa a ser ${ROL_TEXTO[rol]}. ${ROLES.find((r) => r.value === rol).description}`,
      confirmText: 'Cambiar rol', destructive: rol === 'dueno',
    });
    if (!ok) return;
    try {
      await api.admin.cambiarRol({ id, rol });
      toast.success('Rol actualizado.');
      det.refresh();
    } catch (err) {
      toast.fromError(err);
    }
  };

  if (det.loading && !det.data) return <ScreenContainer title="Usuario" back><SkeletonList count={3} /></ScreenContainer>;
  if (det.error && !det.data) return <ScreenContainer title="Usuario" back><ErrorState error={det.error} onRetry={det.reload} /></ScreenContainer>;

  const { prestamos, reservas } = det.data;
  const abiertos = prestamos.filter((p) => p.estado === 'activo');

  return (
    <ScreenContainer title="Perfil de usuario" back refreshing={det.loading} onRefresh={det.refresh}>
      <View style={styles.cabecera}>
        <Avatar usuario={u} size={96} />
        <Text style={[styles.nombre, { color: colors.text, fontFamily: font.title }]}>{nombreCompleto(u)}</Text>
        <Text style={{ color: colors.textMuted }}>{u.email}</Text>
        <View style={styles.badges}>
          <Badge text={ROL_TEXTO[u.rol]} tone={esComun ? 'neutral' : 'primary'} />
          <Badge text={u.estado === 'bloqueado' ? 'Bloqueado' : 'Activo'} tone={u.estado === 'bloqueado' ? 'danger' : 'success'} icon={u.estado === 'bloqueado' ? 'lock-outline' : 'check-circle-outline'} />
        </View>
        {u.telefono ? <Text style={{ color: colors.textMuted, marginTop: 6 }}>Tel.: {u.telefono}</Text> : null}
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Miembro desde {fecha(u.creado_en)}</Text>
      </View>

      {u.estado === 'bloqueado' ? (
        <Card style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
          <Text style={{ color: colors.danger, fontWeight: '800' }}>Mensaje que ve el usuario</Text>
          <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{u.motivo_bloqueo}</Text>
        </Card>
      ) : null}

      {esComun ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Button title="Nuevo préstamo" icon="book-plus-outline" onPress={() => navigation.navigate('PrestamoNuevo', { usuario: { id: u.id, nombre: nombreCompleto(u), email: u.email } })} />
          {u.estado === 'bloqueado'
            ? <Button title="Desbloquear" icon="lock-open-variant-outline" variant="secondary" loading={trabajando} onPress={desbloquear} style={{ marginTop: spacing.sm }} />
            : <Button title="Bloquear" icon="lock-outline" variant="secondary" onPress={() => { setMotivo(MOTIVO_BASE); setErrorMotivo(''); setSheetBloqueo(true); }} style={{ marginTop: spacing.sm }} />}
        </View>
      ) : null}

      {esDueno && !soyYo ? (
        <Card>
          <SelectField label="Rol en la biblioteca" title="Cambiar rol" value={u.rol} options={ROLES} onChange={cambiarRol} />
        </Card>
      ) : null}

      <Text style={[styles.seccion, { color: colors.text }]}>Préstamos</Text>
      {prestamos.length === 0 ? <EmptyState icon="book-clock-outline" title="Sin préstamos" text="Todavía no se llevó libros." /> : prestamos.map((p) => (
        <Card key={p.id} onPress={() => navigation.navigate('PrestamoDetalle', { id: p.id })} accessibilityLabel={`Préstamo ${p.id}, ${diasTexto(p)}`}>
          <View style={styles.filaEntre}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Préstamo #{p.id}</Text>
            <Badge text={diasTexto(p)} tone={p.estado === 'cerrado' ? 'neutral' : p.vencido ? 'danger' : 'success'} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{fecha(p.fecha_inicio)} → {fecha(p.fecha_vencimiento)}</Text>
          {p.items.map((i) => (
            <Text key={i.libro_id} style={{ color: i.devuelto_en ? colors.textMuted : colors.text, marginTop: 4, textDecorationLine: i.devuelto_en ? 'line-through' : 'none' }} numberOfLines={1}>• {i.titulo}</Text>
          ))}
          {p.estado === 'activo' ? <Button title="Agregar libros" icon="plus" variant="soft" small fullWidth={false} onPress={() => navigation.navigate('PrestamoDetalle', { id: p.id })} style={{ marginTop: spacing.md }} /> : null}
        </Card>
      ))}
      {abiertos.length === 0 && prestamos.length > 0 ? <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md }}>No tiene préstamos abiertos.</Text> : null}

      <Text style={[styles.seccion, { color: colors.text }]}>Reservas</Text>
      {reservas.length === 0 ? <Text style={{ color: colors.textMuted }}>Sin reservas.</Text> : reservas.map((r) => (
        <Card key={r.id}>
          <View style={styles.filaEntre}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.libro.titulo}</Text>
            <Badge text={r.estado} tone={ESTADO_RESERVA[r.estado]} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
            {r.tipo === 'sala' ? 'Leer en sala' : 'Para llevar'} · hasta {fechaHora(r.fecha_limite)}
          </Text>
        </Card>
      ))}

      <SheetModal
        visible={sheetBloqueo}
        title={`Bloquear a ${u.nombre}`}
        onClose={() => setSheetBloqueo(false)}
        footer={<Button title="Bloquear usuario" icon="lock-outline" variant="danger" loading={trabajando} onPress={bloquear} />}
      >
        <Text style={{ color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 }}>
          El usuario no se elimina: queda bloqueado hasta que devuelva los libros y ve este mensaje.
        </Text>
        <Input label="Mensaje para el usuario" value={motivo} onChangeText={(t) => { setMotivo(t); setErrorMotivo(''); }} error={errorMotivo} multiline maxLength={255} />
      </SheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cabecera: { alignItems: 'center', marginBottom: spacing.lg },
  nombre: { fontSize: 22, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  seccion: { fontSize: 17, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.md },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
