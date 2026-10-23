// Nuevo préstamo (personal): 1) elegir usuario, 2) datos del lector, 3) libros, 4) plazo. Genera el código de retiro.
// También exporta LibroPicker, el selector de libros que reutiliza PrestamoDetalleScreen.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { useTheme } from '../../theme/ThemeContext';
import { MIN_TAP, font, radius, spacing } from '../../theme/tokens';
import { nombreCompleto } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chips from '../../components/Chips';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import ScreenContainer from '../../components/ScreenContainer';
import SearchBar from '../../components/SearchBar';
import { SkeletonList } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import SelectorVisita, { AHORA } from '../../components/SelectorVisita';
import { CamposDatosLector, formDesde, limpiarDni, validarDatosLector } from '../../components/DatosLector';

const MAX_LIBROS = 5;
const PLAZOS = [
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 21, label: '21 días' },
];

// Buscador + lista de libros disponibles con selección múltiple.
// seleccion: array de ids · onToggle(libro) · max: cuántos se pueden elegir · excluir: ids que no se muestran
export function LibroPicker({ seleccion, onToggle, max = MAX_LIBROS, excluir = [] }) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const libros = useAsync(() => api.libros.listar({ solo_disponibles: true, ...(busqueda ? { q: busqueda } : {}) }), [busqueda]);
  const lista = (libros.data?.libros || []).filter((l) => !excluir.includes(l.id)).slice(0, 40);
  const lleno = seleccion.length >= max;

  return (
    <View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar libro por título o autor" />
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
        Elegidos: {seleccion.length} de {max}
      </Text>
      {libros.loading ? <SkeletonList count={3} height={60} /> :
        libros.error ? <ErrorState error={libros.error} onRetry={libros.reload} /> :
        lista.length === 0 ? <EmptyState icon="book-search-outline" title="No encontramos libros disponibles" text="Probá con otra búsqueda." /> :
        lista.map((l) => {
          const activo = seleccion.includes(l.id);
          const bloqueado = !activo && lleno;
          return (
            <Pressable
              key={l.id}
              onPress={() => (bloqueado ? null : onToggle(l))}
              accessibilityRole="button"
              accessibilityState={{ selected: activo, disabled: bloqueado }}
              accessibilityLabel={`${l.titulo}, ${l.autor}, ${l.disponibles} disponibles`}
              style={[styles.libro, { backgroundColor: activo ? colors.primarySoft : colors.card, borderColor: activo ? colors.primary : colors.border, opacity: bloqueado ? 0.5 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{l.titulo}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>{l.autor} · {l.disponibles} disponible{l.disponibles === 1 ? '' : 's'}</Text>
              </View>
              <MaterialCommunityIcons name={activo ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={activo ? colors.primary : colors.textMuted} />
            </Pressable>
          );
        })}
    </View>
  );
}

export default function PrestamoNuevoScreen({ navigation, route }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [usuario, setUsuario] = useState(route.params?.usuario || null);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [libroIds, setLibroIds] = useState([]);
  const [dias, setDias] = useState(14);
  const [enviando, setEnviando] = useState(false);
  const [visita, setVisita] = useState(AHORA);
  const [datos, setDatos] = useState(formDesde(null));
  const [erroresDatos, setErroresDatos] = useState({});
  const setCampo = (k) => (t) => { setDatos((d) => ({ ...d, [k]: t })); setErroresDatos((e) => ({ ...e, [k]: '' })); };

  // Al elegir al lector se cargan sus datos guardados (nombre, apellido, curso y DNI) para completarlos si hace falta
  useEffect(() => {
    if (!usuario) { setDatos(formDesde(null)); return undefined; }
    let activo = true;
    api.usuarios.detalle({ id: usuario.id })
      .then((r) => { if (activo) setDatos(formDesde(r.usuario)); })
      .catch(() => {});
    return () => { activo = false; };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(() => setBusqueda(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const usuarios = useAsync(
    () => (usuario ? Promise.resolve(null) : api.usuarios.listar({ rol: 'usuario', limite: 30, ...(busqueda ? { q: busqueda } : {}) })),
    [busqueda, usuario],
  );

  const elegirUsuario = (u) => {
    if (u.estado === 'bloqueado') {
      toast.error(`${nombreCompleto(u)} está bloqueado: ${u.motivo_bloqueo || 'tiene libros sin devolver'}. No se le pueden prestar libros.`);
      return;
    }
    setUsuario({ id: u.id, nombre: nombreCompleto(u), email: u.email });
  };

  const toggleLibro = (libro) => setLibroIds((ids) => (ids.includes(libro.id) ? ids.filter((i) => i !== libro.id) : [...ids, libro.id]));

  const confirmar = async () => {
    const e = validarDatosLector(datos);
    setErroresDatos(e);
    if (Object.values(e).some(Boolean)) { toast.error('Completá los datos del lector para registrar el préstamo.'); return; }
    setEnviando(true);
    try {
      const { prestamo } = await api.prestamos.crear({
        usuario_id: usuario.id, libro_ids: libroIds, dias,
        ...(visita && visita !== AHORA ? { visita } : {}),
        nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), curso: datos.curso.trim(), dni: limpiarDni(datos.dni),
      });
      toast.success(`Préstamo registrado. Código de retiro: ${prestamo.codigo_retiro}`);
      navigation.replace('PrestamoDetalle', { id: prestamo.id });
    } catch (e) {
      toast.fromError(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScreenContainer title="Nuevo préstamo" back showBell={false}>
      {!usuario ? (
        <View>
          <Text style={[styles.paso, { color: colors.text, fontFamily: font.title }]}>1. ¿A quién le prestás?</Text>
          <SearchBar value={q} onChangeText={setQ} placeholder="Buscar usuario por nombre o email" />
          {usuarios.loading ? <SkeletonList count={3} height={60} /> :
            usuarios.error ? <ErrorState error={usuarios.error} onRetry={usuarios.reload} /> :
            (usuarios.data?.usuarios || []).length === 0 ? <EmptyState icon="account-search-outline" title="No encontramos usuarios" text="Probá con otro nombre o email." /> :
            (usuarios.data.usuarios).map((u) => (
              <Card key={u.id} onPress={() => elegirUsuario(u)} accessibilityLabel={`Elegir a ${nombreCompleto(u)}`}>
                <View style={styles.fila}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{nombreCompleto(u)}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{u.email}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Libros en su poder: {u.prestamos_activos}</Text>
                  </View>
                  {u.estado === 'bloqueado' ? <Badge text="Bloqueado" tone="danger" icon="lock-outline" /> : <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />}
                </View>
              </Card>
            ))}
        </View>
      ) : (
        <View>
          <Card>
            <View style={styles.fila}>
              <MaterialCommunityIcons name="account-circle-outline" size={36} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Préstamo para</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{usuario.nombre}</Text>
                {usuario.email ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>{usuario.email}</Text> : null}
              </View>
              {!route.params?.usuario ? <Button title="Cambiar" variant="ghost" small fullWidth={false} onPress={() => setUsuario(null)} /> : null}
            </View>
          </Card>

          <Text style={[styles.paso, { color: colors.text, fontFamily: font.title }]}>2. Datos del lector</Text>
          <CamposDatosLector form={datos} setCampo={setCampo} errores={erroresDatos} />

          <Text style={[styles.paso, { color: colors.text, fontFamily: font.title }]}>3. Elegí los libros</Text>
          <LibroPicker seleccion={libroIds} onToggle={toggleLibro} />

          <Text style={[styles.paso, { color: colors.text, fontFamily: font.title }]}>4. Plazo de devolución</Text>
          <Chips options={PLAZOS} value={dias} onChange={setDias} />

          <Text style={[styles.paso, { color: colors.text, fontFamily: font.title }]}>5. Fecha y hora de la visita</Text>
          <SelectorVisita tipo="retiro" value={visita} onChange={(v) => setVisita(v || AHORA)} permitirAhora titulo="¿Cuándo retira los libros?" />

          <Button
            title={libroIds.length ? `Confirmar préstamo (${libroIds.length} libro${libroIds.length === 1 ? '' : 's'})` : 'Elegí al menos un libro'}
            icon="check"
            disabled={!libroIds.length}
            loading={enviando}
            onPress={confirmar}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  paso: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center' },
  libro: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TAP + 12, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
});
