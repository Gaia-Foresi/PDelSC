// Pedir libros a la distribuidora (solo dueño): arma el pedido y lo envía por email.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { MIN_TAP, spacing } from '../../theme/tokens';
import { fechaHora } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import SelectField from '../../components/SelectField';
import { SkeletonList } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

function Cantidad({ valor, onChange, nombre }) {
  const { colors } = useTheme();
  const boton = (icon, delta, label) => (
    <Pressable
      onPress={() => onChange(Math.min(500, Math.max(1, valor + delta)))}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${nombre}`}
      style={[styles.mas, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.cantidad}>
      {boton('minus', -1, 'Menos de')}
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', minWidth: 34, textAlign: 'center' }} accessibilityLabel={`${valor} unidades`}>{valor}</Text>
      {boton('plus', 1, 'Más de')}
    </View>
  );
}

export default function PedirLibrosScreen({ navigation }) {
  const { colors } = useTheme();
  const { esDueno } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [distribuidora, setDistribuidora] = useState(null);
  const [items, setItems] = useState([]); // { clave, libro_id?, titulo, cantidad }
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const dists = useAsync(() => (esDueno ? api.distribuidoras.listar() : Promise.resolve(null)), [esDueno]);
  const historial = useAsync(() => (esDueno ? api.reposicion.listar() : Promise.resolve(null)), [esDueno]);
  useRefreshOnFocus(() => { dists.refresh(); historial.refresh(); });

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);
  const libros = useAsync(() => (busqueda ? api.libros.listar({ q: busqueda }) : Promise.resolve(null)), [busqueda]);

  // Si hay una sola distribuidora, queda elegida
  const lista = dists.data?.distribuidoras || [];
  useEffect(() => {
    if (!distribuidora && lista.length === 1) setDistribuidora(lista[0].id);
  }, [lista, distribuidora]);

  if (!esDueno) {
    return <ScreenContainer title="Pedir libros" back><EmptyState icon="lock-outline" title="Solo para el dueño" text="Los pedidos a la distribuidora los hace el dueño de la biblioteca." /></ScreenContainer>;
  }

  const agregarLibro = (l) => {
    setItems((prev) => (prev.some((i) => i.libro_id === l.id) ? prev : [...prev, { clave: `l${l.id}`, libro_id: l.id, titulo: l.titulo, cantidad: 1 }]));
    setErrores((e) => ({ ...e, items: '' }));
    setQ('');
  };
  const agregarTitulo = () => {
    const titulo = nuevoTitulo.trim();
    if (!titulo) return;
    setItems((prev) => [...prev, { clave: `t${Date.now()}`, titulo, cantidad: 1 }]);
    setNuevoTitulo('');
    setErrores((e) => ({ ...e, items: '' }));
  };
  const cambiarCantidad = (clave, cantidad) => setItems((prev) => prev.map((i) => (i.clave === clave ? { ...i, cantidad } : i)));
  const quitar = (clave) => setItems((prev) => prev.filter((i) => i.clave !== clave));

  const enviar = async () => {
    const e = {
      distribuidora: distribuidora ? '' : 'Elegí una distribuidora',
      items: items.length ? '' : 'Agregá al menos un libro al pedido',
    };
    setErrores(e);
    if (e.distribuidora || e.items) return;
    const d = lista.find((x) => x.id === distribuidora);
    const ok = await confirm({
      title: '¿Enviar el pedido?',
      message: `Le vamos a mandar un email a ${d.nombre} (${d.email}) con ${items.length} ${items.length === 1 ? 'renglón' : 'renglones'}.`,
      confirmText: 'Enviar pedido',
    });
    if (!ok) return;
    setEnviando(true);
    try {
      const data = await api.reposicion.crear({
        distribuidora_id: distribuidora,
        ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
        items: items.map((i) => (i.libro_id ? { libro_id: i.libro_id, cantidad: i.cantidad } : { titulo: i.titulo, cantidad: i.cantidad })),
      });
      setResultado(data.pedido);
      if (data.pedido.estado_envio === 'enviado') {
        toast.success('Pedido enviado a la distribuidora.');
        setItems([]);
        setMensaje('');
      } else {
        toast.error('El pedido quedó guardado pero no pudimos enviar el email.');
      }
      historial.refresh();
    } catch (err) {
      if (err.detalles) setErrores({ items: 'Revisá los renglones del pedido' });
      toast.fromError(err);
    } finally {
      setEnviando(false);
    }
  };

  const sinDistribuidoras = !dists.loading && !dists.error && lista.length === 0;

  return (
    <ScreenContainer title="Pedir libros" back>
      <Text style={{ color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg }}>
        Armá el pedido para reponer stock. Se envía por email a la distribuidora y queda guardado en el historial.
      </Text>

      {sinDistribuidoras ? (
        <Card>
          <Text style={{ color: colors.text, marginBottom: spacing.md }}>Primero cargá una distribuidora para poder enviarle pedidos.</Text>
          <Button title="Agregar distribuidora" icon="truck-outline" onPress={() => navigation.navigate('Distribuidoras')} />
        </Card>
      ) : (
        <View>
          <SelectField
            label="Distribuidora"
            title="Elegí la distribuidora"
            value={distribuidora}
            onChange={(v) => { setDistribuidora(v); setErrores((e) => ({ ...e, distribuidora: '' })); }}
            options={lista.map((d) => ({ value: d.id, label: d.nombre, description: d.email }))}
            placeholder={dists.loading ? 'Cargando…' : 'Elegí una distribuidora'}
            error={errores.distribuidora}
          />
          <Button title="Administrar distribuidoras" icon="cog-outline" variant="ghost" small fullWidth={false} onPress={() => navigation.navigate('Distribuidoras')} style={{ marginBottom: spacing.md }} />

          <Text style={[styles.seccion, { color: colors.text }]}>Libros del pedido</Text>
          <SearchBar value={q} onChangeText={setQ} placeholder="Buscar un libro del catálogo" />
          {busqueda ? (
            <Card style={{ padding: spacing.sm }}>
              {libros.loading ? <Text style={{ color: colors.textMuted, padding: spacing.sm }}>Buscando…</Text> :
                (libros.data?.libros || []).slice(0, 6).map((l) => (
                  <Pressable key={l.id} onPress={() => agregarLibro(l)} accessibilityRole="button" accessibilityLabel={`Agregar ${l.titulo}`} style={[styles.resultado, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{l.titulo}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{l.autor} · {l.disponibles} de {l.stock_total} disponibles</Text>
                    </View>
                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.primary} />
                  </Pressable>
                ))}
              {!libros.loading && !(libros.data?.libros || []).length ? <Text style={{ color: colors.textMuted, padding: spacing.sm }}>No hay libros con ese nombre. Podés agregarlo como título nuevo.</Text> : null}
            </Card>
          ) : null}

          <View style={styles.nuevo}>
            <Input style={{ flex: 1, marginBottom: 0 }} placeholder="O escribí un título nuevo" value={nuevoTitulo} onChangeText={setNuevoTitulo} maxLength={160} onSubmitEditing={agregarTitulo} />
            <Button title="Agregar" small fullWidth={false} variant="soft" onPress={agregarTitulo} disabled={!nuevoTitulo.trim()} style={{ marginLeft: spacing.sm, minHeight: MIN_TAP + 4 }} />
          </View>

          {errores.items ? <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{errores.items}</Text> : null}
          {items.map((i) => (
            <Card key={i.clave}>
              <View style={styles.fila}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>{i.titulo}</Text>
                  <Badge text={i.libro_id ? 'Reposición' : 'Título nuevo'} tone={i.libro_id ? 'primary' : 'warning'} style={{ marginTop: 4 }} />
                </View>
                <Cantidad valor={i.cantidad} nombre={i.titulo} onChange={(c) => cambiarCantidad(i.clave, c)} />
                <Pressable onPress={() => quitar(i.clave)} accessibilityRole="button" accessibilityLabel={`Quitar ${i.titulo} del pedido`} style={styles.quitar}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          ))}

          <Input label="Mensaje para la distribuidora (opcional)" value={mensaje} onChangeText={setMensaje} multiline maxLength={1000} placeholder="Ej.: Necesitamos los ejemplares antes de fin de mes." />
          <Button title="Enviar pedido" icon="send" onPress={enviar} loading={enviando} />

          {resultado ? (
            <Card style={{ marginTop: spacing.md, borderColor: resultado.estado_envio === 'enviado' ? colors.success : colors.danger }}>
              <Text style={{ color: resultado.estado_envio === 'enviado' ? colors.success : colors.danger, fontWeight: '800' }}>
                {resultado.estado_envio === 'enviado' ? `Pedido #${resultado.id} enviado` : `Pedido #${resultado.id} guardado, pero el email falló`}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
                {resultado.estado_envio === 'enviado'
                  ? (resultado.simulado ? 'Modo de prueba: el servidor todavía no tiene el email configurado, así que el mensaje no salió realmente.' : 'La distribuidora ya tiene tu pedido en su casilla.')
                  : 'Revisá la configuración de email del servidor y volvé a hacer el pedido.'}
              </Text>
            </Card>
          ) : null}
        </View>
      )}

      <Text style={[styles.seccion, { color: colors.text, marginTop: spacing.xl }]}>Historial de pedidos</Text>
      {historial.loading && !historial.data ? <SkeletonList count={2} /> :
        historial.error ? <ErrorState error={historial.error} onRetry={historial.reload} /> :
        (historial.data?.pedidos || []).length === 0 ? <Text style={{ color: colors.textMuted }}>Todavía no hiciste pedidos.</Text> :
        historial.data.pedidos.map((p) => (
          <Card key={p.id}>
            <View style={styles.fila}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>#{p.id} · {p.distribuidora}</Text>
              <Badge text={p.estado_envio === 'enviado' ? 'Enviado' : 'Error de envío'} tone={p.estado_envio === 'enviado' ? 'success' : 'danger'} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{fechaHora(p.creado_en)}</Text>
            {p.items.map((i, n) => <Text key={n} style={{ color: colors.text, marginTop: 4 }}>• {i.cantidad} × {i.titulo}</Text>)}
            {p.mensaje ? <Text style={{ color: colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>"{p.mensaje}"</Text> : null}
          </Card>
        ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  seccion: { fontSize: 17, fontWeight: '700', marginBottom: spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center' },
  nuevo: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  resultado: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 6, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  cantidad: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mas: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quitar: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
});
