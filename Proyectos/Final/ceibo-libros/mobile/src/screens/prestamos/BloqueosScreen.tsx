// Días no disponibles para reservar. El gerente los crea y quita; el bibliotecario los ve (con el motivo) pero no los modifica. Se elige un día o un rango (por ejemplo, una semana) en el calendario.
// Los usuarios ven esos días como "no disponibles", sin el motivo: la nota que escribe el gerente es solo para él.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, spacing } from '../../theme/tokens';
import { MESES_LARGO, diaLargo, diaSemana, plural } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

// --- Funciones chiquitas para trabajar con fechas escritas como texto 'YYYY-MM-DD' ---
const pad = (n) => String(n).padStart(2, '0'); // 5 -> '05' (para que los meses y días siempre tengan 2 cifras)
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // arma '2026-11-16' (el mes llega de 0 a 11, por eso se suma 1)
const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
// Suma (o resta, si n es negativo) días a una fecha y devuelve la fecha nueva como texto. Se usa en UTC para que la hora del celular no la corra.
const sumarDias = (f, n) => {
  const [y, m, d] = f.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
// Texto legible: un solo día -> 'lunes 16 de noviembre'; varios -> 'Del lunes 16 de noviembre al miércoles 18 de noviembre'
const rangoTexto = (desde, hasta) => (desde === hasta ? diaLargo(desde) : `Del ${diaLargo(desde)} al ${diaLargo(hasta)}`);

export default function BloqueosScreen() {
  const { colors } = useTheme();
  const { esGerente, esStaff } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const hoy = new Date();
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  // Estado de la pantalla (lo que la pantalla "recuerda" mientras está abierta):
  const [mes, setMes] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() }); // mes que se ve en el calendario
  const [ini, setIni] = useState<string | null>(null); // primer día elegido
  const [fin, setFin] = useState<string | null>(null); // último día elegido (vacío = todavía no lo eligió)
  const [motivo, setMotivo] = useState(''); // nota interna que escribe el gerente
  const [guardando, setGuardando] = useState(false); // true mientras se manda el bloqueo al servidor

  // Trae los bloqueos del servidor. Lo pueden hacer el gerente y el bibliotecario (esStaff); el usuario común no.
  const datos = useAsync(() => (esStaff ? api.bloqueos.listar() : Promise.resolve(null)), [esStaff]);
  useRefreshOnFocus(datos.refresh);
  const bloqueos: any[] = datos.data?.bloqueos || [];
  // ¿Ese día ya está cerrado? (para pintarlo de rojo en el calendario)
  const bloqueado = (f) => bloqueos.some((b) => f >= b.desde && f <= b.hasta);

  // Cuántos días tiene el mes (el día 0 del mes siguiente es el último de este) y las celdas del calendario:
  // primero casilleros vacíos hasta el día de la semana en que empieza el mes (el lunes va primero), después los días 1, 2, 3...
  const diasMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const primero = iso(mes.y, mes.m, 1);
  const celdas = useMemo(
    () => [...Array((diaSemana(primero) + 6) % 7).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)],
    [primero, diasMes],
  );
  const cambiarMes = (delta) => {
    const f = new Date(mes.y, mes.m + delta, 1);
    setMes({ y: f.getFullYear(), m: f.getMonth() });
  };

  // Si no es personal de la biblioteca, no ve nada de esto
  if (!esStaff) return <ScreenContainer title="Días no disponibles" back><EmptyState icon="lock-outline" title="Solo para el personal" /></ScreenContainer>;

  // Primer toque = día inicial; segundo toque = día final (si es el mismo, queda un solo día); un tercero empieza de nuevo
  // Lo que pasa al tocar un día del calendario (solo lo puede hacer el gerente):
  const tocar = (f) => {
    if (!ini || fin) { setIni(f); setFin(null); return; }
    if (f < ini) { setIni(f); return; }
    setFin(f);
  };
  // El rango elegido va de `desde` a `hasta`. Si todavía no eligió el final, es un solo día (hasta = desde).
  const desde = ini;
  const hasta = ini ? (fin || ini) : null;
  const enSeleccion = (f) => !!desde && f >= desde && f <= hasta;

  // Botón "Toda la semana": elige de lunes a domingo de la semana del día que se tocó (sin empezar antes de hoy)
  const semanaCompleta = () => {
    if (!ini) return;
    const lunes = sumarDias(ini, -((diaSemana(ini) + 6) % 7));
    setIni(lunes < hoyIso ? hoyIso : lunes);
    setFin(sumarDias(lunes, 6));
    const [y, m] = lunes.split('-').map(Number);
    setMes({ y, m: m - 1 });
  };
  const limpiar = () => { setIni(null); setFin(null); setMotivo(''); };

  // Botón "Bloquear estos días": manda el rango al servidor. Si sale bien, limpia la selección y vuelve a pedir la lista.
  const bloquear = async () => {
    if (!desde) return;
    setGuardando(true);
    try {
      await api.bloqueos.crear({ desde, hasta, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) });
      toast.success(desde === hasta ? 'Día bloqueado.' : 'Días bloqueados.');
      limpiar();
      datos.refresh();
    } catch (e) {
      toast.fromError(e);
    } finally {
      setGuardando(false);
    }
  };

  // Botón "Volver a habilitar": primero pregunta (para no borrar por error) y después le pide al servidor que quite el bloqueo
  const quitar = async (b) => {
    const ok = await confirm({
      title: '¿Volver a habilitar estos días?',
      message: `${rangoTexto(b.desde, b.hasta)}. Los usuarios van a poder reservar de nuevo.`,
      confirmText: 'Habilitar', cancelText: 'Volver',
    });
    if (!ok) return;
    try {
      await api.bloqueos.eliminar({ id: b.id });
      toast.success('Días habilitados.');
      datos.refresh();
    } catch (e) {
      toast.fromError(e);
    }
  };

  return (
    <ScreenContainer title="Días no disponibles" back refreshing={datos.loading && !!datos.data} onRefresh={datos.refresh}>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.md }}>
        {esGerente
          ? 'Tocá el primer día y después el último (o el mismo día, para uno solo). Los usuarios van a ver esas fechas como “no disponibles para reservas”, sin el motivo.'
          : 'Estos días el gerente cerró las reservas. Los usuarios los ven como “no disponibles para reservas”, sin el motivo. Solo el gerente puede cambiarlos.'}
      </Text>
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
          {SEMANA.map((s, i) => <Text key={i} style={[styles.celda, { color: colors.textMuted, fontSize: 12, fontWeight: '700' }]}>{s}</Text>)}
          {celdas.map((d, i) => {
            if (!d) return <View key={`v${i}`} style={styles.celda} />;
            const f = iso(mes.y, mes.m, d);
            const pasado = f < hoyIso;
            const sel = enSeleccion(f);
            const ya = bloqueado(f);
            return (
              <Pressable
                key={f}
                // Se puede tocar solo si el día no pasó y quien mira es el gerente (el bibliotecario solo mira)
                disabled={pasado || !esGerente}
                onPress={() => tocar(f)}
                accessibilityRole="button"
                accessibilityLabel={`${diaLargo(f)}${ya ? ', ya bloqueado' : ''}${sel ? ', seleccionado' : ''}`}
                accessibilityState={{ selected: sel, disabled: pasado }}
                style={[
                  styles.celda, styles.dia,
                  ya && !sel && { backgroundColor: colors.dangerSoft },
                  sel && { backgroundColor: colors.primary },
                  !sel && f === hoyIso && { borderWidth: 1, borderColor: colors.primary },
                ]}
              >
                <Text style={{ color: sel ? colors.onPrimary : ya ? colors.danger : colors.text, opacity: pasado ? 0.35 : 1, fontWeight: sel || ya || f === hoyIso ? '700' : '400', textDecorationLine: ya && !sel ? 'line-through' : 'none' }}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.leyenda}>
          <View style={[styles.muestra, { backgroundColor: colors.dangerSoft }]} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ya bloqueado</Text>
          {esGerente ? (
            <>
              <View style={[styles.muestra, { backgroundColor: colors.primary, marginLeft: spacing.md }]} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Elegido ahora</Text>
            </>
          ) : null}
        </View>
      </Card>

      {esGerente && desde ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{rangoTexto(desde, hasta)}</Text>
          {!fin ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Tocá otro día para armar un rango, o bloqueá solo este.</Text> : null}
          <Input
            label="Motivo (opcional, solo lo ves vos)"
            icon="note-text-outline"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={120}
            placeholder="Ej.: inventario, feriado, capacitación"
            style={{ marginTop: spacing.md }}
          />
          <Button title="Bloquear estos días" icon="calendar-remove-outline" onPress={bloquear} loading={guardando} />
          <View style={styles.acciones}>
            <Button title="Toda la semana" icon="calendar-week" variant="soft" small onPress={semanaCompleta} style={{ flex: 1 }} />
            <View style={{ width: spacing.sm }} />
            <Button title="Borrar selección" icon="close" variant="secondary" small onPress={limpiar} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      <Text style={[styles.titulo, { color: colors.text, fontFamily: font.title }]} accessibilityRole="header">Días bloqueados</Text>
      {datos.error && !datos.data ? <ErrorState error={datos.error} onRetry={datos.reload} /> : null}
      {!datos.error && !datos.loading && !bloqueos.length ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>No hay días bloqueados: se puede reservar cualquier día de atención.</Text>
      ) : null}
      {bloqueos.map((b) => (
        <Card key={b.id} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{rangoTexto(b.desde, b.hasta)}</Text>
          {b.motivo ? <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>{b.motivo}</Text> : null}
          {b.reservas_activas > 0 ? (
            <Text style={{ color: colors.warning || colors.text, fontSize: 13, marginTop: spacing.xs }}>
              Ya hay {plural(b.reservas_activas, 'reserva activa', 'reservas activas')} para esas fechas: siguen vigentes, atendelas o cancelalas desde Reservas.
            </Text>
          ) : null}
          {esGerente ? <Button title="Volver a habilitar" icon="calendar-check-outline" variant="secondary" small onPress={() => quitar(b)} style={{ marginTop: spacing.md }} /> : null}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  dia: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  leyenda: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  muestra: { width: 14, height: 14, borderRadius: 4 },
  acciones: { flexDirection: 'row', marginTop: spacing.sm },
  titulo: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg },
});
