// Alta y edición de un libro (si llega params.libro es edición). Eliminar es solo del dueño.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { useAsync } from '../../hooks/useAsync';
import * as v from '../../utils/validators';
import { Portada } from '../../components/BookCard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { fecha } from '../../utils/format';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';

export default function LibroFormScreen({ navigation, route }) {
  const libro = route.params?.libro;
  const editando = !!libro;
  const { esDueno } = useAuth();
  const { colors } = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const cats = useAsync(() => api.categorias.listar(), []);

  const [form, setForm] = useState({
    titulo: libro?.titulo || '',
    autor: libro?.autor || '',
    categoria_ids: libro?.categorias?.length ? libro.categorias.map((c) => c.id) : [libro?.categoria_id ?? route.params?.categoria_id].filter(Boolean),
    descripcion: libro?.descripcion || '',
    stock_total: String(libro?.stock_total ?? 1),
    portada_url: libro?.portada_url || '',
  });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  // Portada automática: al escribir título y autor se busca en internet y se completa el link solo.
  const [buscandoPortada, setBuscandoPortada] = useState(false);
  const [estadoPortada, setEstadoPortada] = useState(''); // '' | 'encontrada' | 'no-encontrada'
  const portadaManual = useRef(!!libro?.portada_url); // si el usuario escribió un link, no se pisa
  const buscarPortada = async (forzar = false) => {
    const titulo = form.titulo.trim();
    if (titulo.length < 3 || (!forzar && portadaManual.current)) return;
    setBuscandoPortada(true);
    try {
      const r = await api.libros.buscarPortada({ titulo, autor: form.autor.trim() });
      if (r.portada_url) { setForm((f) => ({ ...f, portada_url: r.portada_url })); setEstadoPortada('encontrada'); portadaManual.current = false; }
      else setEstadoPortada('no-encontrada');
    } catch (e) {
      setEstadoPortada('no-encontrada');
    } finally {
      setBuscandoPortada(false);
    }
  };
  useEffect(() => {
    if (portadaManual.current) return undefined;
    const id = setTimeout(() => buscarPortada(false), 900);
    return () => clearTimeout(id);
  }, [form.titulo, form.autor]); // eslint-disable-line react-hooks/exhaustive-deps

  const validar = () => {
    const e = {
      titulo: v.requerido(form.titulo, 'El título'),
      autor: v.requerido(form.autor, 'El autor'),
      categoria_ids: form.categoria_ids.length ? '' : 'Elegí al menos una categoría',
      stock_total: v.numeroMin(form.stock_total, 0, 'El stock'),
      portada_url: form.portada_url.trim() && !/^https?:\/\//i.test(form.portada_url.trim()) ? 'Tiene que empezar con http:// o https://' : '',
    };
    if (!e.stock_total && !Number.isInteger(Number(form.stock_total))) e.stock_total = 'El stock debe ser un número entero';
    setErrores(e);
    return v.sinErrores(e);
  };

  const guardar = async () => {
    if (!validar()) return;
    setCargando(true);
    const datos = {
      titulo: form.titulo.trim(),
      autor: form.autor.trim(),
      categoria_ids: form.categoria_ids,
      descripcion: form.descripcion.trim(),
      stock_total: Number(form.stock_total),
      portada_url: form.portada_url.trim(),
    };
    try {
      if (editando) await api.libros.actualizar({ id: libro.id, ...datos });
      else await api.libros.crear(datos);
      toast.success(editando ? 'Libro actualizado.' : 'Libro agregado al catálogo.');
      navigation.goBack();
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async () => {
    const ok = await confirm({
      title: '¿Eliminar este libro?',
      message: `"${libro.titulo}" va a dejar de aparecer en el catálogo. Si está prestado o reservado no se puede eliminar.`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.libros.eliminar({ id: libro.id });
      toast.success('Libro eliminado.');
      navigation.goBack();
    } catch (err) {
      toast.fromError(err);
    }
  };

  const alternarCategoria = (cid) => {
    setForm((f) => {
      const esta = f.categoria_ids.includes(cid);
      if (esta && f.categoria_ids.length === 1) return f; // tiene que quedar al menos una
      return { ...f, categoria_ids: esta ? f.categoria_ids.filter((c) => c !== cid) : [...f.categoria_ids, cid] };
    });
    setErrores((e) => ({ ...e, categoria_ids: '' }));
  };

  // Últimas 10 personas que usaron el libro (solo al editar)
  const historial = useAsync(() => (editando ? api.libros.historial({ id: libro.id }) : Promise.resolve({ historial: [] })), []);

  return (
    <ScreenContainer title={editando ? 'Editar libro' : 'Nuevo libro'} back showBell={false}>
      <Input label="Título" value={form.titulo} onChangeText={set('titulo')} error={errores.titulo} placeholder="Ej.: Rayuela" maxLength={160} />
      <Input label="Autor" value={form.autor} onChangeText={set('autor')} error={errores.autor} placeholder="Ej.: Julio Cortázar" maxLength={120} />
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>Categorías</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>Tocá las que correspondan: un libro puede estar en más de una. La primera que elegiste es la principal.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(cats.data?.categorias || []).map((c) => {
            const activa = form.categoria_ids.includes(c.id);
            return (
              <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: activa }} onPress={() => alternarCategoria(c.id)}
                style={{ minHeight: 40, paddingHorizontal: spacing.md, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: activa ? colors.primary : colors.card, borderColor: activa ? colors.primary : colors.border }}>
                {activa ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}
                <Text style={{ color: activa ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 14 }}>{c.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
        {cats.loading && !cats.data ? <Text style={{ color: colors.textMuted, marginTop: 6 }}>Cargando categorías…</Text> : null}
        {errores.categoria_ids ? <Text style={{ color: colors.danger, fontSize: 13, marginTop: 6 }}>{errores.categoria_ids}</Text> : null}
      </View>
      <Input label="Descripción" value={form.descripcion} onChangeText={set('descripcion')} error={errores.descripcion} multiline placeholder="De qué trata el libro" maxLength={2000} />
      <Input
        label="Ejemplares en stock"
        value={form.stock_total}
        onChangeText={(t) => set('stock_total')(t.replace(/\D/g, ''))}
        error={errores.stock_total}
        keyboardType="number-pad"
        hint="Cantidad total de ejemplares que tiene la biblioteca."
      />
      <Input
        label="Portada (link de la imagen)"
        value={form.portada_url}
        onChangeText={(t) => { portadaManual.current = !!t.trim(); setEstadoPortada(''); set('portada_url')(t); }}
        error={errores.portada_url}
        keyboardType="url"
        autoCapitalize="none"
        placeholder="https://…/portada.jpg"
        icon="image-outline"
        hint="Se busca sola cuando escribís el título y el autor. Si querés, pegá otro link."
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Portada libro={{ titulo: form.titulo || '?', portada_url: form.portada_url.trim() }} width={64} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ color: estadoPortada === 'no-encontrada' ? colors.warning : colors.textMuted, fontSize: 13 }}>
            {buscandoPortada ? 'Buscando la portada en internet…'
              : estadoPortada === 'encontrada' ? 'Portada encontrada automáticamente.'
              : estadoPortada === 'no-encontrada' ? 'No encontramos la portada. Probá con el autor completo o pegá un link.'
              : form.portada_url.trim() ? 'Así se va a ver la portada.' : 'Todavía no hay portada.'}
          </Text>
          <Button title="Buscar portada" icon="image-search-outline" variant="soft" small fullWidth={false} loading={buscandoPortada} disabled={form.titulo.trim().length < 3} onPress={() => buscarPortada(true)} style={{ marginTop: spacing.xs }} />
        </View>
      </View>

      {editando ? (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>Últimas 10 personas que usaron este libro</Text>
          {historial.loading && !historial.data ? <Text style={{ color: colors.textMuted }}>Cargando…</Text> : null}
          {historial.data && !historial.data.historial.length ? <Text style={{ color: colors.textMuted }}>Todavía nadie se lo llevó.</Text> : null}
          {(historial.data?.historial || []).map((h) => (
            <Card key={h.id}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{h.persona}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Retiro: {fecha(h.retirado)}</Text>
              <Text style={{ color: h.devuelto ? colors.success : colors.warning, fontSize: 13 }}>
                {h.devuelto ? `Devolución: ${fecha(h.devuelto)}` : 'Todavía no lo devolvió'}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: spacing.sm }}>
        <Button title={editando ? 'Guardar cambios' : 'Agregar libro'} icon="content-save-outline" onPress={guardar} loading={cargando} />
        {editando && esDueno ? <Button title="Eliminar libro" icon="trash-can-outline" variant="danger" onPress={eliminar} style={{ marginTop: spacing.md }} /> : null}
        <Button title="Cancelar" variant="ghost" small onPress={() => navigation.goBack()} style={{ marginTop: spacing.xs }} />
      </View>
    </ScreenContainer>
  );
}
