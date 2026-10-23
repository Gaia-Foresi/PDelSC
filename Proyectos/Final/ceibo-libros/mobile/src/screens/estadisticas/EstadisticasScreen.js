// Estadísticas (solo dueño): resumen en tarjetas explicadas y gráficos de barras dibujados con Views.
// Cada bloque dice qué mide, qué representa cada barra y cómo leerlo.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, spacing } from '../../theme/tokens';
import { mesCorto } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import { useResponsive } from '../../utils/useResponsive';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer from '../../components/ScreenContainer';
import { SkeletonList } from '../../components/Skeleton';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Tarjeta con número grande, nombre y una línea que explica qué cuenta
function Tarjeta({ icon, label, valor, detalle, tono, ancho }) {
  const { colors } = useTheme();
  const color = tono === 'danger' ? colors.danger : tono === 'warning' ? colors.warning : colors.primary;
  return (
    <View
      style={[styles.tarjeta, { width: ancho, backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${valor}. ${detalle}`}
    >
      <View style={styles.tarjetaTop}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
        <Text style={{ color, fontSize: 28, fontWeight: '800', marginLeft: 'auto', fontFamily: font.title }}>{valor}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{label}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 }}>{detalle}</Text>
    </View>
  );
}

// Título de sección + explicación de qué muestra el gráfico
function Seccion({ titulo, explicacion }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text style={[styles.titulo, { color: colors.text, fontFamily: font.title }]} accessibilityRole="header">{titulo}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{explicacion}</Text>
    </View>
  );
}

function Leyenda({ color, texto }) {
  const { colors } = useTheme();
  return (
    <View style={styles.leyenda}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 6 }}>{texto}</Text>
    </View>
  );
}

// Barras verticales: una por mes, con eje de valores y líneas guía
function BarrasVerticales({ datos }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...datos.map((d) => d.total));
  const tope = max <= 4 ? max : Math.ceil(max / 2) * 2; // número "redondo" para el eje
  const marcas = tope <= 4 ? Array.from({ length: tope + 1 }, (_, i) => i) : [0, tope / 2, tope];
  const ALTO = 178;
  const PLOT = ALTO - 18; // alto útil para barras y líneas guía (arriba queda lugar para el número de cada barra)
  const total = datos.reduce((s, d) => s + d.total, 0);
  const mejor = datos.reduce((a, b) => (b.total > a.total ? b : a), datos[0]);
  const ultimo = datos.length - 1;

  return (
    <View>
      <View
        accessible
        accessibilityLabel={`Préstamos por mes: ${datos.map((d) => `${mesCorto(d.mes)} ${d.total}`).join(', ')}`}
        style={{ flexDirection: 'row', marginLeft: 12 }}
      >
        <Text style={[styles.ejeTitulo, { color: colors.textMuted }]}>Préstamos</Text>
        <View style={{ width: 28, height: ALTO, marginRight: 6 }}>
          {marcas.map((m) => (
            <Text key={m} style={{ position: 'absolute', right: 0, bottom: (m / tope) * PLOT - 7, color: colors.textMuted, fontSize: 11 }}>{m}</Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: ALTO }}>
            {marcas.map((m) => (
              <View key={m} style={{ position: 'absolute', left: 0, right: 0, bottom: (m / tope) * PLOT, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            ))}
            <View style={styles.barras}>
              {datos.map((d, i) => (
                <View key={d.mes} style={styles.colBarra}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800', marginBottom: 2 }}>{d.total}</Text>
                  <View
                    style={{
                      width: '62%', maxWidth: 38, height: d.total ? Math.max(3, (d.total / tope) * PLOT) : 3, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
                      backgroundColor: i === ultimo ? colors.secondary : colors.primary, opacity: d.total ? 1 : 0.35,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.meses}>
            {datos.map((d) => <Text key={d.mes} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{mesCorto(d.mes)}</Text>)}
          </View>
          <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 }}>Mes</Text>
        </View>
      </View>

      <View style={styles.leyendas}>
        <Leyenda color={colors.primary} texto="Meses anteriores" />
        <Leyenda color={colors.secondary} texto="Mes actual (en curso)" />
      </View>
      <View style={[styles.resumenGrafico, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
          En los últimos 6 meses se registraron <Text style={styles.negrita}>{plural(total, 'préstamo', 'préstamos')}</Text>
          {total ? <> (promedio de <Text style={styles.negrita}>{(total / datos.length).toFixed(1).replace('.0', '')}</Text> por mes). El mes con más movimiento fue <Text style={styles.negrita}>{mesCorto(mejor.mes)}</Text> con {mejor.total}.</> : '.'}
        </Text>
      </View>
    </View>
  );
}

// Ranking en barras horizontales: etiqueta, cantidad y (opcional) porcentaje del total
function Ranking({ datos, etiqueta, vacio, conPorcentaje }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...datos.map((d) => d.total));
  const suma = datos.reduce((s, d) => s + d.total, 0);
  if (!datos.length || suma === 0) return <Text style={{ color: colors.textMuted }}>{vacio}</Text>;
  return (
    <View>
      {datos.map((d, i) => (
        <View key={etiqueta(d)} style={{ marginBottom: spacing.md }} accessible accessibilityLabel={`${i + 1}. ${etiqueta(d)}: ${plural(d.total, 'préstamo', 'préstamos')}`}>
          <View style={styles.filaEntre}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '800', width: 22 }}>{i + 1}.</Text>
            <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1}>{etiqueta(d)}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginLeft: spacing.sm }}>
              {plural(d.total, 'préstamo', 'préstamos')}{conPorcentaje ? ` · ${Math.round((d.total / suma) * 100)}%` : ''}
            </Text>
          </View>
          <View style={[styles.pista, { backgroundColor: colors.surfaceAlt }]}>
            <View style={{ height: '100%', width: `${(d.total / max) * 100}%`, borderRadius: radius.pill, backgroundColor: colors.primary }} />
          </View>
        </View>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
        La barra más larga es la más pedida; las demás se comparan con ella.
      </Text>
    </View>
  );
}

export default function EstadisticasScreen() {
  const { colors } = useTheme();
  const { esDueno } = useAuth();
  const { width, maxWidth, columns } = useResponsive();
  const stats = useAsync(() => (esDueno ? api.estadisticas.resumen() : Promise.resolve(null)), [esDueno]);
  useRefreshOnFocus(stats.refresh);

  if (!esDueno) return <ScreenContainer title="Estadísticas" back><EmptyState icon="lock-outline" title="Solo para el dueño" /></ScreenContainer>;

  const area = Math.min(width, maxWidth || width) - spacing.lg * 2;
  const cols = columns >= 3 ? 3 : 2;
  const gap = spacing.md;
  const ancho = Math.floor((area - gap * (cols - 1)) / cols);
  const d = stats.data;
  const t = d?.totales;

  return (
    <ScreenContainer title="Estadísticas" back refreshing={stats.loading && !!d} onRefresh={stats.refresh}>
      {stats.loading && !d ? <SkeletonList count={3} height={120} /> :
        stats.error && !d ? <ErrorState error={stats.error} onRetry={stats.reload} /> : d ? (
          <View>
            <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MaterialCommunityIcons name="information-outline" size={22} color={colors.primary} />
                <Text style={{ flex: 1, marginLeft: spacing.sm, color: colors.text, fontSize: 13, lineHeight: 19 }}>
                  <Text style={styles.negrita}>Cómo leer esta pantalla. </Text>
                  Las tarjetas muestran cómo está la biblioteca <Text style={styles.negrita}>hoy</Text>. Los gráficos de abajo muestran el <Text style={styles.negrita}>historial de préstamos</Text>: cuánto se prestó, qué libros y qué categorías se piden más. Deslizá hacia abajo para actualizar.
                </Text>
              </View>
            </Card>

            <Seccion titulo="Resumen de hoy" explicacion="Cantidades actuales. Se actualizan cada vez que entrás o deslizás para recargar." />
            <View style={[styles.grilla, { gap }]}>
              <Tarjeta ancho={ancho} icon="book-open-page-variant-outline" label="Títulos" valor={t.libros} detalle="Libros distintos que hay en el catálogo." />
              <Tarjeta ancho={ancho} icon="bookshelf" label="Ejemplares" valor={t.ejemplares} detalle="Copias físicas en total (un título puede tener varias)." />
              <Tarjeta ancho={ancho} icon="account-group-outline" label="Usuarios" valor={t.usuarios} detalle="Lectores registrados en la app." />
              <Tarjeta ancho={ancho} icon="account-tie-outline" label="Bibliotecarios" valor={t.bibliotecarios} detalle="Personas que atienden la biblioteca." />
              <Tarjeta ancho={ancho} icon="book-clock-outline" label="Préstamos activos" valor={t.prestamos_activos} detalle="Préstamos abiertos: todavía no se devolvió todo." />
              <Tarjeta ancho={ancho} icon="clock-alert-outline" label="Préstamos vencidos" valor={t.prestamos_vencidos} tono={t.prestamos_vencidos ? 'danger' : undefined} detalle="Activos cuyo plazo ya pasó. Sus lectores quedan bloqueados." />
              <Tarjeta ancho={ancho} icon="bookmark-outline" label="Reservas activas" valor={t.reservas_activas} detalle="Libros guardados esperando que el lector pase." />
              <Tarjeta ancho={ancho} icon="lock-outline" label="Usuarios bloqueados" valor={t.bloqueados} tono={t.bloqueados ? 'warning' : undefined} detalle="No pueden reservar ni pedir libros hasta devolver." />
            </View>

            <Seccion
              titulo="Préstamos por mes"
              explicacion="Cada barra es un mes y su altura es la cantidad de préstamos que se registraron en ese mes. El número sobre la barra es ese total."
            />
            <Card><BarrasVerticales datos={d.prestamos_por_mes} /></Card>

            <Seccion
              titulo="Libros más prestados"
              explicacion="Los títulos que más veces se prestaron en total. Cada barra es un libro: cuanto más larga, más veces se prestó. El número indica cuántos préstamos tuvo."
            />
            <Card><Ranking datos={d.libros_mas_prestados} etiqueta={(x) => x.titulo} vacio="Todavía no hay préstamos." /></Card>

            <Seccion
              titulo="Préstamos por categoría"
              explicacion="Qué temas se piden más. Cada barra es una categoría; el porcentaje es la parte del total de préstamos que le corresponde."
            />
            <Card><Ranking datos={d.por_categoria} etiqueta={(x) => x.categoria} vacio="Todavía no hay préstamos." conPorcentaje /></Card>
          </View>
        ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  tarjeta: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, minHeight: 118 },
  tarjetaTop: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: '700' },
  negrita: { fontWeight: '800' },
  barras: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end' },
  colBarra: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  meses: { flexDirection: 'row' },
  ejeTitulo: { position: 'absolute', left: -34, top: 78, fontSize: 11, fontWeight: '700', transform: [{ rotate: '-90deg' }], width: 70, textAlign: 'center' },
  leyendas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md, justifyContent: 'center' },
  leyenda: { flexDirection: 'row', alignItems: 'center' },
  resumenGrafico: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  filaEntre: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pista: { height: 12, borderRadius: radius.pill, overflow: 'hidden' },
});
