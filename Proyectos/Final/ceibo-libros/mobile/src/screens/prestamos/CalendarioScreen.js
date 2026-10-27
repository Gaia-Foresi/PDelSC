// Calendario de visitas (dueño y bibliotecario): cada reserva/préstamo con su día y hora de visita.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, spacing } from '../../theme/tokens';
import { diaLargo, MESES_LARGO, diaSemana } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import ErrorState from '../../components/ErrorState';
import ScreenContainer from '../../components/ScreenContainer';

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const ETIQUETA = {
  'reserva-sala': ['Reserva · sala', 'primary', 'book-open-variant'],
  'reserva-retiro': ['Reserva · retiro', 'warning', 'bookmark-outline'],
  prestamo: ['Préstamo', 'success', 'swap-horizontal'],
};

export default function CalendarioScreen({ navigation }) {
  const { colors } = useTheme();
  const hoy = new Date();
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [mes, setMes] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [dia, setDia] = useState(hoyIso);

  const diasMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const desde = iso(mes.y, mes.m, 1);
  const hasta = iso(mes.y, mes.m, diasMes);
  const datos = useAsync(() => api.calendario.listar({ desde, hasta }), [desde, hasta]);
  useRefreshOnFocus(datos.refresh);

  const porDia = useMemo(() => {
    const mapa = {};
    for (const e of datos.data?.eventos || []) (mapa[e.visita.fecha] ||= []).push(e);
    return mapa;
  }, [datos.data]);

  const cambiarMes = (delta) => {
    const f = new Date(mes.y, mes.m + delta, 1);
    setMes({ y: f.getFullYear(), m: f.getMonth() });
    setDia(iso(f.getFullYear(), f.getMonth(), 1));
  };

  // Lunes primero
  const offset = (diaSemana(desde) + 6) % 7;
  const celdas = [...Array(offset).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const eventos = porDia[dia] || [];

  const abrir = (e) => navigation.navigate(e.tipo === 'prestamo' ? 'PrestamoDetalle' : 'ReservasTab', e.tipo === 'prestamo' ? { id: e.ref_id } : undefined);

  return (
    <ScreenContainer title="Calendario de visitas" back refreshing={datos.loading && !!datos.data} onRefresh={datos.refresh}>
      <Card>
        <View style={styles.nav}>
          <Pressable onPress={() => cambiarMes(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" style={styles.flecha}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontFamily: font.title, fontSize: 17, fontWeight: '700' }}>
            {MESES_LARGO[mes.m][0].toUpperCase() + MESES_LARGO[mes.m].slice(1)} {mes.y}
          </Text>
          <Pressable onPress={() => cambiarMes(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" style={styles.flecha}>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.grilla}>
          {SEMANA.map((s, i) => (
            <Text key={i} style={[styles.celda, { color: colors.textMuted, fontSize: 12, fontWeight: '700' }]}>{s}</Text>
          ))}
          {celdas.map((d, i) => {
            if (!d) return <View key={`v${i}`} style={styles.celda} />;
            const f = iso(mes.y, mes.m, d);
            const n = (porDia[f] || []).length;
            const sel = f === dia;
            return (
              <Pressable
                key={f}
                onPress={() => setDia(f)}
                accessibilityRole="button"
                accessibilityLabel={`${diaLargo(f)}, ${n} ${n === 1 ? 'visita' : 'visitas'}`}
                style={[styles.celda, styles.dia, sel && { backgroundColor: colors.primary }, !sel && f === hoyIso && { borderWidth: 1, borderColor: colors.primary }]}
              >
                <Text style={{ color: sel ? colors.onPrimary : colors.text, fontWeight: sel || f === hoyIso ? '700' : '400' }}>{d}</Text>
                <View style={[styles.punto, { backgroundColor: n ? (sel ? colors.onPrimary : colors.primary) : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Text style={[styles.titulo, { color: colors.text, fontFamily: font.title }]} accessibilityRole="header">{diaLargo(dia)[0].toUpperCase() + diaLargo(dia).slice(1)}</Text>

      {datos.error && !datos.data ? <ErrorState error={datos.error} onRetry={datos.reload} /> : null}
      {!datos.error && !datos.loading && !eventos.length ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>No hay visitas registradas para este día.</Text>
      ) : null}

      {eventos.map((e) => {
        const [txt, tono, icono] = ETIQUETA[e.tipo === 'prestamo' ? 'prestamo' : `reserva-${e.subtipo || 'retiro'}`];
        return (
          <Card key={e.clave} onPress={() => abrir(e)} accessibilityLabel={`${e.visita.hora}, ${e.usuario.nombre} ${e.usuario.apellido}`} style={{ marginTop: spacing.sm }}>
            <View style={styles.fila}>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '800', width: 62 }}>{e.visita.hora}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{e.usuario.nombre} {e.usuario.apellido}</Text>
                {e.libros.map((t, i) => (
                  <Text key={i} style={{ color: colors.text, fontSize: 14, marginTop: 2 }}>📖 {t}</Text>
                ))}
                <View style={styles.badges}>
                  <Badge text={txt} tone={tono} icon={icono} />
                  {e.codigo_retiro ? <Badge text={`Código ${e.codigo_retiro}`} tone="neutral" /> : null}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
            </View>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  dia: { height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  titulo: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg },
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
});
