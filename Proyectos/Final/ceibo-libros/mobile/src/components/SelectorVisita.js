// Elegir el día (mini calendario) y la hora en que se va a ir a la biblioteca.
// Los horarios disponibles los calcula el servidor (días y horas de atención). Uso:
//   <SelectorVisita tipo="retiro" value={iso} onChange={setIso} error="..." permitirAhora />
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';
import { MESES_LARGO, diaLargo, diaSemana } from '../utils/format';
import HorarioAtencion from './HorarioAtencion';

export const AHORA = 'ahora';
const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const pad = (n) => String(n).padStart(2, '0');

function Opcion({ texto, activo, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: activo ? colors.primary : colors.card, borderColor: activo ? colors.primary : colors.border }]}
    >
      <Text style={{ color: activo ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 14 }}>{texto}</Text>
    </Pressable>
  );
}

export default function SelectorVisita({ tipo = 'retiro', value, onChange, error, permitirAhora = false, titulo = '¿Cuándo vas a ir a la biblioteca?' }) {
  const { colors } = useTheme();
  const [dias, setDias] = useState(null);
  const [fallo, setFallo] = useState(false);
  const [dia, setDia] = useState(null);
  const [mes, setMes] = useState(null); // { y, m } (m: 0-11)

  useEffect(() => {
    let activo = true;
    setDias(null); setFallo(false);
    api.reservas.horarios({ tipo })
      .then((r) => {
        if (!activo) return;
        setDias(r.dias);
        const actual = r.dias.find((d) => d.horas.some((h) => h.iso === value));
        const f = (actual || r.dias[0])?.fecha;
        setDia(actual ? actual.fecha : null);
        if (f) { const [y, m] = f.split('-').map(Number); setMes({ y, m: m - 1 }); }
      })
      .catch(() => { if (activo) setFallo(true); });
    return () => { activo = false; };
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const disponibles = useMemo(() => new Set((dias || []).map((d) => d.fecha)), [dias]);
  const meses = useMemo(() => [...new Set((dias || []).map((d) => d.fecha.slice(0, 7)))], [dias]);
  const idxMes = mes ? meses.indexOf(`${mes.y}-${pad(mes.m + 1)}`) : -1;
  const irMes = (delta) => {
    const k = meses[idxMes + delta];
    if (k) { const [y, m] = k.split('-').map(Number); setMes({ y, m: m - 1 }); }
  };

  const diaActual = dias?.find((d) => d.fecha === dia);
  let celdas = [];
  if (mes) {
    const primero = `${mes.y}-${pad(mes.m + 1)}-01`;
    celdas = [...Array((diaSemana(primero) + 6) % 7).fill(null), ...Array.from({ length: new Date(mes.y, mes.m + 1, 0).getDate() }, (_, i) => i + 1)];
  }

  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
      <HorarioAtencion compacto />
      {dias === null && !fallo ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
      {fallo ? <Text style={{ color: colors.danger, fontSize: 14 }}>No pudimos cargar los horarios. Cerrá esta ventana y probá de nuevo.</Text> : null}
      {dias && !dias.length ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Por ahora no hay horarios disponibles.</Text> : null}

      {permitirAhora ? (
        <View style={[styles.fila, { marginBottom: spacing.sm }]}>
          <Opcion texto="Ahora" activo={value === AHORA} onPress={() => onChange(AHORA)} />
        </View>
      ) : null}

      {dias && dias.length && mes ? (
        <>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Día</Text>
          <View style={[styles.cal, { backgroundColor: colors.card, borderColor: error && !dia ? colors.danger : colors.border }]}>
            <View style={styles.nav}>
              <Pressable onPress={() => irMes(-1)} disabled={idxMes <= 0} accessibilityRole="button" accessibilityLabel="Mes anterior" style={[styles.flecha, idxMes <= 0 && { opacity: 0.3 }]}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{MESES_LARGO[mes.m][0].toUpperCase() + MESES_LARGO[mes.m].slice(1)} {mes.y}</Text>
              <Pressable onPress={() => irMes(1)} disabled={idxMes >= meses.length - 1} accessibilityRole="button" accessibilityLabel="Mes siguiente" style={[styles.flecha, idxMes >= meses.length - 1 && { opacity: 0.3 }]}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.grilla}>
              {SEMANA.map((s, i) => <Text key={`s${i}`} style={[styles.celda, { color: colors.textMuted, fontSize: 12, fontWeight: '700' }]}>{s}</Text>)}
              {celdas.map((d, i) => {
                if (!d) return <View key={`v${i}`} style={styles.celda} />;
                const f = `${mes.y}-${pad(mes.m + 1)}-${pad(d)}`;
                const libre = disponibles.has(f);
                const sel = f === dia && value !== AHORA;
                return (
                  <Pressable
                    key={f}
                    disabled={!libre}
                    onPress={() => { setDia(f); onChange(null); }}
                    accessibilityRole="button"
                    accessibilityLabel={libre ? diaLargo(f) : `${diaLargo(f)}, no disponible`}
                    accessibilityState={{ selected: sel, disabled: !libre }}
                    style={[styles.celda, styles.dia, libre && !sel && { backgroundColor: colors.primarySoft }, sel && { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: sel ? colors.onPrimary : libre ? colors.text : colors.textMuted, opacity: libre ? 1 : 0.4, fontWeight: libre ? '700' : '400' }}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {dia && value !== AHORA ? (
            <>
              <Text style={[styles.sub, { color: colors.textMuted, marginTop: spacing.sm }]}>Hora · {diaLargo(dia)}</Text>
              <View style={styles.fila}>
                {(diaActual?.horas || []).map((h) => <Opcion key={h.iso} texto={h.hora} activo={value === h.iso} onPress={() => onChange(h.iso)} />)}
              </View>
            </>
          ) : value !== AHORA ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.sm }}>Tocá un día marcado para ver los horarios.</Text> : null}
        </>
      ) : null}
      {error ? <Text style={{ color: colors.danger, fontSize: 13, marginTop: spacing.sm }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  sub: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { minHeight: MIN_TAP - 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
  cal: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  flecha: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  dia: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm || 8 },
});
