// "Libros reservados". Usuario: sus reservas (puede cancelarlas). Personal: todas las reservas, para atenderlas o cancelarlas.
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, spacing } from '../../theme/tokens';
import { diasEntre, fechaHora, plural, visitaTexto } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import CodigoRetiro from '../../components/CodigoRetiro';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer, { useListContentStyle } from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';

const FILTROS_USUARIO = [
  { value: 'activa', label: 'Activas' },
  { value: 'todas', label: 'Todas' },
];
const FILTROS_STAFF = [
  { value: 'activa', label: 'Activas' },
  { value: 'cumplida', label: 'Cumplidas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'vencida', label: 'Vencidas' },
];
const TONO_ESTADO = { activa: 'success', cumplida: 'primary', cancelada: 'neutral', vencida: 'danger' };
const TEXTO_ESTADO = { activa: 'Activa', cumplida: 'Cumplida', cancelada: 'Cancelada', vencida: 'Vencida' };

export default function ReservasScreen({ navigation, route }) {
  const enTab = route?.name === 'ReservasTab';
  const { colors } = useTheme();
  const { esStaff } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const contenido = useListContentStyle(false);
  const [filtro, setFiltro] = useState('activa');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ocupada, setOcupada] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const estado = filtro === 'todas' ? undefined : filtro;
  const datos = useAsync(
    () => (esStaff
      ? api.reservas.listar({ ...(estado ? { estado } : {}), ...(busqueda ? { q: busqueda } : {}) })
      : api.reservas.mis({ ...(estado ? { estado } : {}) })),
    [esStaff, filtro, busqueda],
  );
  useRefreshOnFocus(datos.refresh);

  const cancelar = async (r) => {
    const ok = await confirm({
      title: '¿Cancelar la reserva?',
      message: `Se va a cancelar la reserva de "${r.libro.titulo}"${esStaff ? ` de ${r.usuario.nombre}` : ''} y el ejemplar vuelve a quedar disponible.`,
      confirmText: 'Cancelar reserva',
      cancelText: 'Volver',
      destructive: true,
    });
    if (!ok) return;
    setOcupada(r.id);
    try {
      await api.reservas.cancelar({ id: r.id });
      toast.success('Reserva cancelada.');
      datos.refresh();
    } catch (e) {
      toast.fromError(e);
    } finally {
      setOcupada(null);
    }
  };

  const atender = async (r) => {
    const sala = r.tipo === 'sala';
    const ok = await confirm({
      title: sala ? '¿Marcar la reserva como usada?' : '¿Entregar el libro?',
      message: sala
        ? `${r.usuario.nombre} ya está leyendo "${r.libro.titulo}" en la biblioteca. La reserva queda cumplida.`
        : `Se va a crear un préstamo de "${r.libro.titulo}" para ${r.usuario.nombre} y la reserva queda cumplida.`,
      confirmText: sala ? 'Marcar como usada' : 'Crear préstamo',
    });
    if (!ok) return;
    setOcupada(r.id);
    try {
      const res = await api.reservas.atender({ id: r.id });
      if (res.prestamo) {
        toast.success('Préstamo registrado.');
        navigation.navigate('PrestamoDetalle', { id: res.prestamo.id });
      } else {
        toast.success('Reserva cumplida.');
        datos.refresh();
      }
    } catch (e) {
      toast.fromError(e);
    } finally {
      setOcupada(null);
    }
  };

  const encabezado = (
    <View>
      {esStaff ? <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por usuario, libro, DNI o código" /> : null}
      <Chips options={esStaff ? FILTROS_STAFF : FILTROS_USUARIO} value={filtro} onChange={setFiltro} />
    </View>
  );

  return (
    <ScreenContainer title="Libros reservados" back={!enTab} menu={enTab} tab={enTab} scroll={false}>
      <FlatList
        data={datos.data?.reservas || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={contenido}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        onRefresh={datos.refresh}
        ListHeaderComponent={encabezado}
        renderItem={({ item: r }) => (
          <Card>
            <View style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', fontFamily: font.title }}>{r.libro.titulo}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>{r.libro.autor}</Text>
              </View>
              <Badge text={TEXTO_ESTADO[r.estado]} tone={TONO_ESTADO[r.estado]} />
            </View>
            <View style={[styles.fila, { marginTop: spacing.sm, gap: spacing.sm, flexWrap: 'wrap' }]}>
              <Badge text={r.tipo === 'sala' ? 'Leer en sala' : 'Para llevar'} tone="primary" icon={r.tipo === 'sala' ? 'seat-outline' : 'bag-personal-outline'} />
            </View>
            {esStaff ? (
              <Text style={{ color: colors.text, fontSize: 14, marginTop: spacing.sm }}>
                Reservó: <Text style={{ fontWeight: '700' }}>{r.usuario.nombre}</Text>
                {r.usuario.dni ? <Text style={{ color: colors.textMuted }}> · DNI {r.usuario.dni}</Text> : null}
              </Text>
            ) : null}
            {r.estado === 'activa' ? <CodigoRetiro codigo={r.codigo_retiro} compacto /> : null}
            {r.visita ? (
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.xs }}>
                Visita: {visitaTexto(r.visita)}
              </Text>
            ) : null}
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }}>
              {r.estado === 'activa' ? `Vence el ${fechaHora(r.fecha_limite)} (${plural(diasEntre(r.creada_en, r.fecha_limite), 'día', 'días')} desde que se reservó)` : `Reservado el ${fechaHora(r.creada_en)}`}
            </Text>
            {r.estado === 'activa' ? (
              <View style={[styles.fila, { marginTop: spacing.md, gap: spacing.sm }]}>
                <Button title="Cancelar" variant="secondary" small disabled={ocupada === r.id} onPress={() => cancelar(r)} style={{ flex: 1 }} />
                {esStaff ? <Button title="Atender" icon="check" small loading={ocupada === r.id} onPress={() => atender(r)} style={{ flex: 1 }} /> : null}
              </View>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          datos.loading ? <SkeletonList count={3} /> :
          datos.error ? <ErrorState error={datos.error} onRetry={datos.reload} /> :
          <EmptyState
            icon="bookmark-outline"
            title="No hay reservas para mostrar"
            text={esStaff ? 'Cuando los usuarios reserven libros las vas a ver acá.' : 'Reservá un libro desde su categoría para leerlo en sala o para llevártelo.'}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
});
