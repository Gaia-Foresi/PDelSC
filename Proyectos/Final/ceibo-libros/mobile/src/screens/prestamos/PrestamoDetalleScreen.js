// Detalle de un préstamo. El personal puede devolver libros, agregar libros y extender el plazo.
// El usuario común solo lo ve.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, spacing } from '../../theme/tokens';
import { diasTexto, fecha, fechaHora, visitaTexto } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import CodigoRetiro from '../../components/CodigoRetiro';
import ErrorState from '../../components/ErrorState';
import { SheetModal } from '../../components/Modal';
import ScreenContainer from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import { LibroPicker } from './PrestamoNuevoScreen';

const MAX_ABIERTOS = 5;
const EXTENSIONES = [
  { value: 3, label: '3 días' },
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
];

export default function PrestamoDetalleScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { esStaff } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const detalle = useAsync(() => api.prestamos.detalle({ id }), [id]);
  const prestamo = detalle.data?.prestamo;

  const [ocupado, setOcupado] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [nuevos, setNuevos] = useState([]);
  const [extendiendo, setExtendiendo] = useState(false);
  const [dias, setDias] = useState(7);

  const aplicar = (p) => detalle.setData({ prestamo: p });

  const devolver = async (item) => {
    const todos = !item;
    const ok = await confirm({
      title: todos ? '¿Devolver todos los libros?' : '¿Registrar la devolución?',
      message: todos
        ? 'Se van a marcar como devueltos todos los libros pendientes de este préstamo.'
        : `Se va a marcar como devuelto "${item.titulo}".`,
      confirmText: 'Devolver',
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await api.prestamos.devolver({ prestamo_id: id, ...(item ? { libro_id: item.libro_id } : {}) });
      aplicar(r.prestamo);
      toast.success(r.usuario_desbloqueado ? 'Devolución registrada. Cuenta del usuario habilitada.' : 'Devolución registrada.');
    } catch (e) {
      toast.fromError(e);
    } finally {
      setOcupado(false);
    }
  };

  const abiertos = prestamo ? prestamo.items.filter((i) => !i.devuelto_en).length : 0;
  const cupo = Math.max(0, MAX_ABIERTOS - abiertos);

  const agregar = async () => {
    setOcupado(true);
    try {
      const r = await api.prestamos.agregarLibros({ prestamo_id: id, libro_ids: nuevos });
      aplicar(r.prestamo);
      setAgregando(false);
      setNuevos([]);
      toast.success('Libros agregados al préstamo.');
    } catch (e) {
      toast.fromError(e);
    } finally {
      setOcupado(false);
    }
  };

  const extender = async () => {
    setOcupado(true);
    try {
      const r = await api.prestamos.extender({ prestamo_id: id, dias });
      aplicar(r.prestamo);
      setExtendiendo(false);
      toast.success(`Plazo extendido ${dias} días.`);
    } catch (e) {
      toast.fromError(e);
    } finally {
      setOcupado(false);
    }
  };

  const toggleNuevo = (libro) => setNuevos((ids) => (ids.includes(libro.id) ? ids.filter((i) => i !== libro.id) : [...ids, libro.id]));

  const activo = prestamo?.estado === 'activo';
  const tono = !prestamo ? 'neutral' : prestamo.estado === 'cerrado' ? 'neutral' : prestamo.vencido ? 'danger' : prestamo.dias_restantes <= 2 ? 'warning' : 'success';

  return (
    <ScreenContainer title={`Préstamo #${id}`} back showBell={false} refreshing={false} onRefresh={detalle.refresh}>
      {detalle.loading && !prestamo ? <SkeletonList count={2} height={110} /> :
        detalle.error && !prestamo ? <ErrorState error={detalle.error} onRetry={detalle.reload} /> :
        prestamo ? (
          <View>
            <Card
              onPress={esStaff ? () => navigation.navigate('UsuarioDetalle', { id: prestamo.usuario.id }) : undefined}
              accessibilityLabel={`Ver al usuario ${prestamo.usuario.nombre}`}
            >
              <View style={styles.fila}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', fontFamily: font.title }}>{prestamo.usuario.nombre}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{prestamo.usuario.email}</Text>
                  {prestamo.usuario.curso || prestamo.usuario.dni ? (
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                      {prestamo.usuario.curso ? `Curso ${prestamo.usuario.curso}` : ''}{prestamo.usuario.curso && prestamo.usuario.dni ? ' · ' : ''}{prestamo.usuario.dni ? `DNI ${prestamo.usuario.dni}` : ''}
                    </Text>
                  ) : null}
                </View>
                {esStaff ? <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} /> : null}
              </View>
            </Card>

            <Card>
              <Badge text={diasTexto(prestamo)} tone={tono} icon={prestamo.vencido ? 'alert-circle-outline' : 'clock-outline'} />
              {prestamo.visita ? <Fila etiqueta="Visita a la biblioteca" valor={visitaTexto(prestamo.visita)} /> : null}
              <Fila etiqueta="Inicio" valor={fecha(prestamo.fecha_inicio)} />
              <Fila etiqueta="Vencimiento" valor={fecha(prestamo.fecha_vencimiento)} />
              <Fila etiqueta="Estado" valor={prestamo.estado === 'cerrado' ? 'Cerrado (todo devuelto)' : prestamo.vencido ? 'Vencido' : 'Activo'} />
              {prestamo.registrado_por ? <Fila etiqueta="Registrado por" valor={prestamo.registrado_por} /> : null}
              <CodigoRetiro codigo={prestamo.codigo_retiro} />
            </Card>

            <Text style={[styles.seccion, { color: colors.text }]}>Libros ({prestamo.items.length})</Text>
            {prestamo.items.map((i) => (
              <Card key={i.libro_id}>
                <View style={styles.fila}>
                  <MaterialCommunityIcons name={i.devuelto_en ? 'check-circle' : 'book-open-page-variant-outline'} size={26} color={i.devuelto_en ? colors.success : colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', fontFamily: font.title }}>{i.titulo}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{i.autor}</Text>
                    {i.devuelto_en ? <Text style={{ color: colors.success, fontSize: 12, marginTop: 2 }}>Devuelto el {fechaHora(i.devuelto_en)}</Text> : null}
                  </View>
                  {esStaff && !i.devuelto_en && activo ? <Button title="Devolver" small fullWidth={false} variant="soft" disabled={ocupado} onPress={() => devolver(i)} /> : null}
                </View>
              </Card>
            ))}

            {esStaff && activo ? (
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Devolver todos" icon="check-all" disabled={ocupado} onPress={() => devolver(null)} />
                <Button title={cupo > 0 ? 'Agregar libros' : 'Límite de libros alcanzado'} icon="plus" variant="secondary" disabled={ocupado || cupo === 0} onPress={() => setAgregando(true)} style={{ marginTop: spacing.sm }} />
                <Button title="Extender plazo" icon="calendar-plus" variant="secondary" disabled={ocupado} onPress={() => setExtendiendo(true)} style={{ marginTop: spacing.sm }} />
              </View>
            ) : null}
          </View>
        ) : null}

      <SheetModal
        visible={agregando}
        title="Agregar libros al préstamo"
        onClose={() => { setAgregando(false); setNuevos([]); }}
        footer={<Button title={nuevos.length ? `Agregar ${nuevos.length} libro${nuevos.length === 1 ? '' : 's'}` : 'Elegí al menos un libro'} disabled={!nuevos.length} loading={ocupado} onPress={agregar} />}
      >
        {agregando ? <LibroPicker seleccion={nuevos} onToggle={toggleNuevo} max={cupo} excluir={prestamo ? prestamo.items.map((i) => i.libro_id) : []} /> : null}
      </SheetModal>

      <SheetModal
        visible={extendiendo}
        title="Extender plazo"
        onClose={() => setExtendiendo(false)}
        footer={<Button title={`Extender ${dias} días`} icon="calendar-check" loading={ocupado} onPress={extender} />}
      >
        <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>
          El nuevo plazo se cuenta desde el vencimiento actual ({prestamo ? fecha(prestamo.fecha_vencimiento) : ''}).
        </Text>
        <Chips options={EXTENSIONES} value={dias} onChange={setDias} />
      </SheetModal>
    </ScreenContainer>
  );
}

function Fila({ etiqueta, valor }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dato}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{etiqueta}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  seccion: { fontSize: 18, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.md },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.sm },
});
