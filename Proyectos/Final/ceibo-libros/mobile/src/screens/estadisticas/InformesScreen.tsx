// Informes (solo gerente): descarga un Excel con las estadísticas y toda la información de la biblioteca, y analiza
// varios Excel de distintos meses juntos (libros más prestados, no devueltos, dañados, movimiento por mes y categoría).
import React, { useEffect, useMemo, useState } from 'react';
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
import SelectField from '../../components/SelectField';
import EmptyState from '../../components/EmptyState';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

const PERIODOS = [
  { value: 'todo', label: 'Todo el historial' },
  { value: 'mes_actual', label: 'Este mes' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: '3_meses', label: 'Últimos 3 meses' },
  { value: 'rango', label: 'Elegir desde - hasta' },
];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const claveMes = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const nombreDeMes = (k: string) => { const [y, m] = k.split('-').map(Number); return `${MESES[m - 1]} de ${y}`; };
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// Meses para elegir: del actual hacia atrás, hasta el primer mes con datos (mínimo 12 meses, máximo 10 años)
function listaMeses(conDatos: string[]): string[] {
  const hoy = new Date();
  const viejo = conDatos.length ? [...conDatos].sort()[0] : '';
  const sal: string[] = [];
  for (let i = 0; i < 120; i += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const k = claveMes(d.getFullYear(), d.getMonth() + 1);
    if (i >= 12 && k < viejo) break;
    sal.push(k);
  }
  return sal;
}

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
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [mesesDatos, setMesesDatos] = useState<{ mes: string; prestamos: number; libros: number }[] | null>(null);
  const [bajando, setBajando] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoElegido[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    if (!esGerente) return;
    api.estadisticas.meses({}).then((r) => setMesesDatos(r.meses)).catch(() => setMesesDatos([]));
  }, [esGerente]);
  const meses = useMemo(() => listaMeses((mesesDatos || []).map((m) => m.mes)), [mesesDatos]);
  const datosDelMes = (mes: string) => (mesesDatos || []).find((m) => m.mes === mes);
  const opciones = useMemo(() => meses.map((k) => {
    const d = (mesesDatos || []).find((m) => m.mes === k);
    return { value: k, label: mayus(nombreDeMes(k)), description: d ? `${d.prestamos} ${d.prestamos === 1 ? 'préstamo' : 'préstamos'}` : 'sin datos' };
  }), [meses, mesesDatos]);
  // lo que hay dentro del rango elegido (para avisar antes de descargar)
  const enRango = useMemo(() => {
    if (!desde || !hasta || !mesesDatos) return null;
    const dentro = mesesDatos.filter((m) => m.mes >= desde && m.mes <= hasta);
    return { prestamos: dentro.reduce((t, m) => t + m.prestamos, 0), libros: dentro.reduce((t, m) => t + m.libros, 0), meses: dentro.length };
  }, [desde, hasta, mesesDatos]);
  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  const elegirPeriodo = (v: string) => {
    setPeriodo(v);
    if (v === 'rango' && !desde) { setDesde(meses[Math.min(meses.length - 1, 2)] ?? meses[0]); setHasta(meses[0]); } // por defecto: últimos 3 meses
  };

  if (!esGerente) return <ScreenContainer title="Informes" back><EmptyState icon="lock-outline" title="Solo para el gerente" /></ScreenContainer>;

  const descargar = async () => {
    if (periodo === 'rango') {
      if (!desde || !hasta) { toast.error('Elegí desde qué mes y hasta qué mes querés el Excel.'); return; }
      if (rangoInvalido) { toast.error('El mes de inicio no puede ser posterior al mes final.'); return; }
      if (enRango && !enRango.prestamos) { toast.error('En ese período no hubo préstamos, así que no hay Excel para descargar.'); return; }
    }
    setBajando(true);
    try {
      const r = await api.estadisticas.exportar(periodo === 'rango' ? { periodo, mes: desde, hasta } : { periodo });
      const donde = await guardarArchivo(r.nombre, r.base64);
      toast.success(
        donde === 'descargas' ? `Excel descargado. Lo encontrás en la carpeta Descargas: ${r.nombre}`
          : donde === 'carpeta' ? `Excel guardado en la carpeta que elegiste: ${r.nombre}`
            : 'Excel generado. Elegí dónde guardarlo (Archivos, Drive, etc.).',
      );
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBajando(false);
    }
  };

  const elegir = async () => {
    try {
      const { validos: nuevos = [], rechazados = [] } = (await elegirExcels()) || ({} as any);
      if (rechazados.length) toast.error(`No se pudo agregar: ${rechazados.join(', ')}. Tiene que ser un Excel (.xlsx) descargado desde esta pantalla.`);
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

  const [bajandoAnalisis, setBajandoAnalisis] = useState(false);
  const descargarAnalisis = async () => {
    setBajandoAnalisis(true);
    try {
      const r = await api.estadisticas.analizarExcel({ archivos });
      const donde = await guardarArchivo(r.nombre, r.base64);
      toast.success(
        donde === 'descargas' ? `Análisis descargado. Lo encontrás en la carpeta Descargas: ${r.nombre}`
          : donde === 'carpeta' ? `Análisis guardado en la carpeta que elegiste: ${r.nombre}`
            : 'Análisis generado. Elegí dónde guardarlo (Archivos, Drive, etc.).',
      );
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBajandoAnalisis(false);
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
      <Chips options={PERIODOS} value={periodo} onChange={elegirPeriodo} />
      {periodo === 'rango' ? (
        <View style={{ marginBottom: spacing.md }}>
          <SelectField label="Desde (mes)" title="Desde qué mes" value={desde} options={opciones} onChange={setDesde} placeholder="Elegí el mes de inicio" />
          <SelectField label="Hasta (mes)" title="Hasta qué mes" value={hasta} options={opciones} onChange={setHasta} placeholder="Elegí el mes final" error={rangoInvalido ? 'El mes final tiene que ser igual o posterior al de inicio.' : undefined} />
          {desde && hasta && !rangoInvalido && enRango ? (
            <View style={[styles.aviso, { backgroundColor: enRango.prestamos ? colors.primarySoft : colors.card, borderColor: enRango.prestamos ? colors.primary : colors.border }]}>
              <MaterialCommunityIcons name={enRango.prestamos ? 'check-circle-outline' : 'information-outline'} size={20} color={enRango.prestamos ? colors.primary : colors.textMuted} />
              <Text style={{ flex: 1, marginLeft: spacing.sm, color: colors.text, fontSize: 13, lineHeight: 18 }}>
                {enRango.prestamos
                  ? `${desde === hasta ? `Hay Excel de ${nombreDeMes(desde)}` : `Hay Excel desde ${nombreDeMes(desde)} hasta ${nombreDeMes(hasta)}`}: ${plural(enRango.prestamos, 'préstamo', 'préstamos')} y ${plural(enRango.libros, 'libro prestado', 'libros prestados')}.`
                  : 'En ese período no hubo préstamos, así que no hay Excel para descargar.'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
          <Button title="Descargar este análisis en Excel" icon="file-excel-outline" variant="secondary" onPress={descargarAnalisis} loading={bajandoAnalisis} style={{ marginBottom: spacing.md }} />
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
  aviso: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  filaLista: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
});
