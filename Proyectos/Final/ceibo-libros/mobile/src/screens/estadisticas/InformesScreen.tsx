// Informes (solo gerente): descarga un Excel con las estadísticas y toda la información de la biblioteca, y analiza
// varios Excel de distintos meses juntos (libros más prestados, no devueltos, dañados, movimiento por mes y categoría).
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, spacing } from '../../theme/tokens';
import { fecha, plural } from '../../utils/format';
import { elegirExcels, guardarArchivo } from '../../utils/archivos';
import type { ArchivoElegido } from '../../utils/archivos';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

const PERIODOS = [
  { value: 'todo', label: 'Todo el historial' },
  { value: 'mes_actual', label: 'Este mes' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: '3_meses', label: 'Últimos 3 meses' },
];

function Titulo({ texto, ayuda }: { texto: string; ayuda?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', fontFamily: font.title }} accessibilityRole="header">{texto}</Text>
      {ayuda ? <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{ayuda}</Text> : null}
    </View>
  );
}

function Numero({ valor, titulo, tono }: { valor: number; titulo: string; tono?: 'danger' | 'warning' }) {
  const { colors } = useTheme();
  const color = tono === 'danger' ? colors.danger : tono === 'warning' ? colors.warning : colors.primary;
  return (
    <View style={[styles.num, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color, fontSize: 26, fontWeight: '800', fontFamily: font.title }}>{valor}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{titulo}</Text>
    </View>
  );
}

function Lista({ filas, vacio }: { filas: { izq: string; der: string; sub?: string }[]; vacio: string }) {
  const { colors } = useTheme();
  if (!filas.length) return <Text style={{ color: colors.textMuted }}>{vacio}</Text>;
  return (
    <View>
      {filas.map((f, i) => (
        <View key={`${f.izq}-${i}`} style={[styles.filaLista, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text style={{ color: colors.textMuted, width: 24, fontWeight: '800' }}>{i + 1}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>{f.izq}</Text>
            {f.sub ? <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{f.sub}</Text> : null}
          </View>
          <Text style={{ color: colors.text, fontWeight: '800', marginLeft: spacing.sm }}>{f.der}</Text>
        </View>
      ))}
    </View>
  );
}

export default function InformesScreen() {
  const { colors } = useTheme();
  const { esGerente } = useAuth();
  const toast = useToast();
  const [periodo, setPeriodo] = useState('todo');
  const [bajando, setBajando] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoElegido[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [res, setRes] = useState<any>(null);

  if (!esGerente) return <ScreenContainer title="Informes" back><EmptyState icon="lock-outline" title="Solo para el gerente" /></ScreenContainer>;

  const descargar = async () => {
    setBajando(true);
    try {
      const r = await api.estadisticas.exportar({ periodo });
      await guardarArchivo(r.nombre, r.base64);
      toast.success('Excel generado.');
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBajando(false);
    }
  };

  const elegir = async () => {
    try {
      const nuevos = await elegirExcels();
      if (!nuevos.length) return;
      setArchivos((prev) => {
        const mapa = new Map(prev.map((a) => [a.nombre, a]));
        nuevos.forEach((a) => mapa.set(a.nombre, a));
        return [...mapa.values()].slice(0, 12);
      });
      setRes(null);
    } catch (e) {
      toast.fromError(e);
    }
  };

  const analizar = async () => {
    setAnalizando(true);
    try {
      const r = await api.estadisticas.analizar({ archivos });
      setRes(r.analisis);
    } catch (e) {
      toast.fromError(e);
    } finally {
      setAnalizando(false);
    }
  };

  const t = res?.totales;
  return (
    <ScreenContainer title="Informes y descargas" back>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <MaterialCommunityIcons name="information-outline" size={22} color={colors.primary} />
          <Text style={{ flex: 1, marginLeft: spacing.sm, color: colors.text, fontSize: 13, lineHeight: 19 }}>
            Descargá un Excel con todo lo que pasó en la biblioteca. Si guardás uno por mes, después podés subirlos todos juntos para ver los libros más prestados, los que no se devolvieron y cuántos se dañaron.
          </Text>
        </View>
      </Card>

      <Titulo texto="1. Descargar estadísticas" ayuda="El Excel trae el resumen, los préstamos, el detalle libro por libro, los usuarios, las reservas, los libros dañados y el stock." />
      <Chips options={PERIODOS} value={periodo} onChange={setPeriodo} />
      <Button title="Descargar Excel" icon="file-excel-outline" onPress={descargar} loading={bajando} />

      <Titulo texto="2. Analizar varios meses" ayuda="Subí los Excel que descargaste en distintos meses (hasta 12). Los libros que aparecen en dos archivos no se cuentan dos veces." />
      <Button title={archivos.length ? 'Agregar más archivos' : 'Elegir archivos Excel'} icon="upload-outline" variant="secondary" onPress={elegir} />
      {archivos.map((a) => (
        <View key={a.nombre} style={[styles.archivo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="file-excel-outline" size={22} color={colors.success} />
          <Text style={{ flex: 1, color: colors.text, marginLeft: spacing.sm }} numberOfLines={1}>{a.nombre}</Text>
          <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} accessibilityLabel={`Quitar ${a.nombre}`} onPress={() => { setArchivos((p) => p.filter((x) => x.nombre !== a.nombre)); setRes(null); }} />
        </View>
      ))}
      {archivos.length ? <Button title={`Analizar ${plural(archivos.length, 'archivo', 'archivos')}`} icon="chart-box-outline" onPress={analizar} loading={analizando} style={{ marginTop: spacing.md }} /> : null}

      {res ? (
        <View>
          {res.archivos.invalidos.length ? (
            <Card style={{ borderColor: colors.warning }}>
              <Text style={{ color: colors.warning, fontWeight: '700' }}>No se pudieron leer:</Text>
              {res.archivos.invalidos.map((x) => <Text key={x.nombre} style={{ color: colors.text, fontSize: 13 }}>{x.nombre}: {x.motivo}</Text>)}
            </Card>
          ) : null}
          <Titulo
            texto="Resultado"
            ayuda={res.periodo.desde ? `Del ${fecha(res.periodo.desde)} al ${fecha(res.periodo.hasta)} · ${plural(res.archivos.leidos.length, 'archivo leído', 'archivos leídos')}` : undefined}
          />
          <View style={styles.numeros}>
            <Numero valor={t.libros_prestados} titulo="Libros prestados" />
            <Numero valor={t.devueltos} titulo="Devueltos" />
            <Numero valor={t.no_devueltos} titulo="Sin devolver" tono={t.no_devueltos ? 'warning' : undefined} />
            <Numero valor={t.vencidos_sin_devolver} titulo="Vencidos sin devolver" tono={t.vencidos_sin_devolver ? 'danger' : undefined} />
            <Numero valor={t.en_espera} titulo="En espera de revisión" />
            <Numero valor={t.danados} titulo="Dañados" tono={t.danados ? 'danger' : undefined} />
          </View>

          <Titulo texto="Libros más prestados" />
          <Card><Lista vacio="Sin datos." filas={res.mas_prestados.map((x) => ({ izq: x.titulo, sub: x.autor, der: plural(x.total, 'vez', 'veces') }))} /></Card>

          <Titulo texto="Libros sin devolver" ayuda="Los más atrasados primero." />
          <Card><Lista vacio="No hay libros sin devolver." filas={res.no_devueltos.map((x) => ({ izq: x.titulo, sub: x.lector, der: x.dias_atraso ? `${plural(x.dias_atraso, 'día', 'días')} de atraso` : 'En plazo' }))} /></Card>

          <Titulo texto="Libros dañados" />
          <Card><Lista vacio="No se registraron libros dañados." filas={res.danados_por_libro.map((x) => ({ izq: x.titulo, der: String(x.total) }))} /></Card>

          <Titulo texto="Préstamos por mes" />
          <Card><Lista vacio="Sin datos." filas={res.por_mes.map((x) => ({ izq: x.mes, der: String(x.total) }))} /></Card>

          <Titulo texto="Por categoría" />
          <Card><Lista vacio="Sin datos." filas={res.por_categoria.map((x) => ({ izq: x.categoria, der: String(x.total) }))} /></Card>

          {res.lectores_con_mas_atrasos.length ? (
            <View>
              <Titulo texto="Lectores con más atrasos" />
              <Card><Lista vacio="" filas={res.lectores_con_mas_atrasos.map((x) => ({ izq: x.lector, der: String(x.total) }))} /></Card>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  num: { flexGrow: 1, flexBasis: '30%', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minWidth: 100 },
  archivo: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  filaLista: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
});
