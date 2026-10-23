// Perfil (boceto 3): foto grande arriba y debajo la información. Dueño/bibliotecario ven además su rol.
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { font, spacing } from '../../theme/tokens';
import { fecha, nombreCompleto, ROL_TEXTO } from '../../utils/format';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useFocus';
import { api } from '../../api';
import { elegirFotoDePerfil } from '../../utils/foto';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import BloqueoBanner from '../../components/BloqueoBanner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

function Linea({ icon, label, value }) {
  const { colors } = useTheme();
  return (
    <View style={styles.linea} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{value}</Text>
      </View>
    </View>
  );
}

export default function PerfilScreen({ navigation }) {
  const { colors } = useTheme();
  const { usuario, esStaff, cerrarSesion, recargarPerfil, resumen, actualizarUsuario } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [subiendo, setSubiendo] = useState(false);

  // Tocar la foto abre la galería y la guarda en el momento
  const cambiarFoto = async () => {
    setSubiendo(true);
    try {
      const r = await elegirFotoDePerfil();
      if (r.error) { toast.error(r.error); return; }
      if (!r.foto) return;
      const data = await api.usuarios.actualizarPerfil({ foto_url: r.foto });
      await actualizarUsuario(data.usuario);
      toast.success('Foto de perfil actualizada.');
    } catch (e) {
      toast.fromError(e);
    } finally {
      setSubiendo(false);
    }
  };

  const perfil = useAsync(() => recargarPerfil(), []);
  useRefreshOnFocus(perfil.refresh);

  const salir = useCallback(async () => {
    const ok = await confirm({ title: '¿Cerrar sesión?', message: 'Vas a tener que ingresar de nuevo para usar la biblioteca.', confirmText: 'Cerrar sesión', destructive: true });
    if (ok) cerrarSesion();
  }, [confirm, cerrarSesion]);

  if (!usuario) return null;
  const datos = perfil.data?.resumen || resumen;

  return (
    <ScreenContainer title="Mi perfil" menu tab refreshing={perfil.loading && !!perfil.data} onRefresh={perfil.refresh}>
      <BloqueoBanner />
      <View style={styles.cabecera}>
        <Pressable onPress={cambiarFoto} disabled={subiendo} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" style={{ opacity: subiendo ? 0.6 : 1 }}>
          <Avatar usuario={usuario} size={132} />
          <View style={[styles.camara, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
            <MaterialCommunityIcons name={subiendo ? 'timer-sand' : 'camera-outline'} size={20} color={colors.onPrimary} />
          </View>
        </Pressable>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.xs }}>Tocá la foto para cambiarla</Text>
        <Text style={[styles.nombre, { color: colors.text, fontFamily: font.title }]}>{nombreCompleto(usuario)}</Text>
        {esStaff ? <Badge text={ROL_TEXTO[usuario.rol]} tone="primary" icon="shield-account-outline" style={{ alignSelf: 'center', marginTop: spacing.sm }} /> : null}
      </View>

      <Card>
        <Linea icon="email-outline" label="Email" value={usuario.email} />
        <Linea icon="phone-outline" label="Teléfono" value={usuario.telefono || 'No cargado'} />
        {!esStaff ? <Linea icon="school-outline" label="Curso" value={usuario.curso || 'No cargado'} /> : null}
        <Linea icon="card-account-details-outline" label="DNI" value={usuario.dni || 'No cargado'} />
        {esStaff ? <Linea icon="shield-account-outline" label="Rol" value={ROL_TEXTO[usuario.rol]} /> : null}
        <Linea icon="calendar-account-outline" label="Miembro desde" value={fecha(usuario.creado_en)} />
        <Linea icon="shield-key-outline" label="Verificación en 2 pasos" value={usuario.dos_pasos_activo ? 'Activada' : 'Desactivada'} />
      </Card>

      {datos ? (
        <View style={styles.resumen}>
          <Card style={styles.dato} onPress={() => navigation.navigate('Prestamos')} accessibilityLabel={`${datos.prestamos_activos} libros prestados`}>
            <Text style={[styles.num, { color: colors.primary }]}>{datos.prestamos_activos}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Libros prestados</Text>
          </Card>
          <Card style={styles.dato} onPress={() => navigation.navigate('ReservasTab')} accessibilityLabel={`${datos.reservas_activas} reservas activas`}>
            <Text style={[styles.num, { color: colors.primary }]}>{datos.reservas_activas}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Reservas activas</Text>
          </Card>
        </View>
      ) : null}

      <Button title="Editar perfil" icon="account-edit-outline" onPress={() => navigation.navigate('EditarPerfil')} />
      <Button title="Seguridad" icon="shield-lock-outline" variant="secondary" onPress={() => navigation.navigate('Seguridad')} style={{ marginTop: spacing.sm }} />
      <Button title="Cerrar sesión" icon="logout" variant="ghost" onPress={salir} style={{ marginTop: spacing.sm }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cabecera: { alignItems: 'center', marginBottom: spacing.lg },
  camara: { position: 'absolute', right: 2, bottom: 2, width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 24, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  linea: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 6 },
  resumen: { flexDirection: 'row', gap: spacing.md },
  dato: { flex: 1, alignItems: 'center' },
  num: { fontSize: 28, fontWeight: '800' },
});
