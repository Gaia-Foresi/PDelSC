// Selector de meses agrupado por año: cada año es una pestaña que se despliega con sus 12 meses.
// Se puede tildar un mes suelto o el año entero (con la casilla del año) y combinar varios años.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { plural } from '../../utils/format';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const clave = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

interface Props {
  datos: { mes: string; prestamos: number; libros: number }[]; // meses con préstamos
  seleccion: string[]; // ["2026-10", ...]
  onChange: (meses: string[]) => void;
}

export default function SelectorMeses({ datos, seleccion, onChange }: Props) {
  const { colors } = useTheme();
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = clave(anioActual, hoy.getMonth() + 1);
  const porMes = useMemo(() => new Map(datos.map((d) => [d.mes, d])), [datos]);
  const elegidos = useMemo(() => new Set(seleccion), [seleccion]);

  // Años: del actual hacia atrás, hasta el primero con datos (mínimo 3 años, máximo 10)
  const anios = useMemo(() => {
    const primero = datos.length ? Math.min(...datos.map((d) => Number(d.mes.slice(0, 4)))) : anioActual;
    const desde = Math.max(anioActual - 9, Math.min(primero, anioActual - 2));
    const sal: number[] = [];
    for (let y = anioActual; y >= desde; y -= 1) sal.push(y);
    return sal;
  }, [datos, anioActual]);

  const [abiertos, setAbiertos] = useState<Set<number>>(() => new Set([anioActual]));
  const alternarAbierto = (y: number) => setAbiertos((p) => { const n = new Set(p); if (n.has(y)) n.delete(y); else n.add(y); return n; });

  // meses de un año que se pueden elegir (los futuros todavía no tienen préstamos)
  const elegibles = (y: number) => Array.from({ length: 12 }, (_, i) => clave(y, i + 1)).filter((k) => k <= mesActual);
  const alternarMes = (k: string) => {
    const n = new Set(elegidos);
    if (n.has(k)) n.delete(k); else n.add(k);
    onChange([...n].sort());
  };
  const alternarAnio = (y: number) => {
    const meses = elegibles(y);
    const todos = meses.every((k) => elegidos.has(k));
    const n = new Set(elegidos);
    meses.forEach((k) => (todos ? n.delete(k) : n.add(k)));
    onChange([...n].sort());
  };

  const Casilla = ({ estado, size = 24 }: { estado: 'todo' | 'algo' | 'nada'; size?: number }) => (
    <MaterialCommunityIcons
      name={estado === 'todo' ? 'checkbox-marked' : estado === 'algo' ? 'minus-box' : 'checkbox-blank-outline'}
      size={size}
      color={estado === 'nada' ? colors.textMuted : colors.primary}
    />
  );

  return (
    <View style={{ marginBottom: spacing.md }}>
      {anios.map((y) => {
        const meses = elegibles(y);
        const cant = meses.filter((k) => elegidos.has(k)).length;
        const estado = !meses.length ? 'nada' : cant === meses.length ? 'todo' : cant ? 'algo' : 'nada';
        const prestamosAnio = datos.filter((d) => d.mes.startsWith(`${y}-`)).reduce((t, d) => t + d.prestamos, 0);
        const abierto = abiertos.has(y);
        return (
          <View key={y} style={[styles.anio, { backgroundColor: colors.card, borderColor: estado === 'nada' ? colors.border : colors.primary }]}>
            <View style={styles.cabecera}>
              <Pressable
                onPress={() => alternarAnio(y)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: estado === 'todo' ? true : estado === 'algo' ? 'mixed' : false }}
                accessibilityLabel={`Elegir el año ${y} entero`}
                hitSlop={8}
                style={styles.casilla}
              >
                <Casilla estado={estado} size={28} />
              </Pressable>
              <Pressable onPress={() => alternarAbierto(y)} accessibilityRole="button" accessibilityState={{ expanded: abierto }} accessibilityLabel={`Año ${y}, ${abierto ? 'cerrar' : 'ver'} los meses`} style={styles.titulo}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{y}</Text>
                  <Text style={{ color: prestamosAnio ? colors.success : colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                    {prestamosAnio ? plural(prestamosAnio, 'préstamo', 'préstamos') : 'sin datos'}
                    {cant ? ` · ${estado === 'todo' ? 'año entero' : `${cant} ${cant === 1 ? 'mes elegido' : 'meses elegidos'}`}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons name={abierto ? 'chevron-up' : 'chevron-down'} size={26} color={colors.textMuted} />
              </Pressable>
            </View>
            {abierto ? (
              <View style={[styles.meses, { borderTopColor: colors.border }]}>
                {MESES.map((nombre, i) => {
                  const k = clave(y, i + 1);
                  const futuro = k > mesActual;
                  const d = porMes.get(k);
                  const activo = elegidos.has(k);
                  return (
                    <Pressable
                      key={k}
                      disabled={futuro}
                      onPress={() => alternarMes(k)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: activo, disabled: futuro }}
                      accessibilityLabel={`${nombre} de ${y}, ${d ? plural(d.prestamos, 'préstamo', 'préstamos') : 'sin datos'}`}
                      style={[styles.mes, { backgroundColor: activo ? colors.primarySoft : 'transparent', opacity: futuro ? 0.4 : 1 }]}
                    >
                      <Casilla estado={activo ? 'todo' : 'nada'} size={22} />
                      <Text style={{ flex: 1, marginLeft: spacing.sm, color: colors.text, fontSize: 15, fontWeight: activo ? '700' : '500' }}>{nombre}</Text>
                      <Text style={{ color: d ? colors.success : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{d ? plural(d.prestamos, 'préstamo', 'préstamos') : futuro ? '' : 'sin datos'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  anio: { borderWidth: 1.5, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  casilla: { paddingLeft: spacing.md, paddingRight: spacing.sm, height: 60, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingRight: spacing.md },
  meses: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  mes: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm },
});
