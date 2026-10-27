// Editar datos personales y foto de perfil (se elige de la galería y se reduce antes de enviarla).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme/tokens';
import * as v from '../../utils/validators';
import { elegirFotoDePerfil } from '../../utils/foto';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

export default function EditarPerfilScreen({ navigation }) {
  const toast = useToast();
  const { usuario, actualizarUsuario } = useAuth();
  const [form, setForm] = useState({ nombre: usuario.nombre || '', apellido: usuario.apellido || '', telefono: usuario.telefono || '', dni: usuario.dni || '' });
  const [foto, setFoto] = useState(usuario.foto_url || null); // null = sin foto; texto = URL o data URI
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const elegirFoto = async () => {
    setProcesando(true);
    const r = await elegirFotoDePerfil();
    setProcesando(false);
    if (r.error) toast.error(r.error);
    else if (r.foto) setFoto(r.foto);
  };

  const guardar = async () => {
    const e = {
      nombre: v.requerido(form.nombre, 'El nombre'),
      dni: form.dni && !/^\d{6,9}$/.test(form.dni.replace(/\D/g, '')) ? 'El DNI debe tener entre 6 y 9 números' : '',
    };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setCargando(true);
    try {
      const data = await api.usuarios.actualizarPerfil({
        nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono: form.telefono.trim(), foto_url: foto || '',
        ...(form.dni.trim() ? { dni: form.dni.replace(/\D/g, '') } : {}),
      });
      await actualizarUsuario(data.usuario);
      toast.success('Perfil actualizado.');
      navigation.goBack();
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScreenContainer title="Editar perfil" back>
      <View style={styles.foto}>
        <Avatar usuario={usuario} uri={foto} nombre={form.nombre} apellido={form.apellido} size={120} />
        <View style={styles.botonesFoto}>
          <Button title="Elegir foto" icon="image-outline" small variant="soft" fullWidth={false} loading={procesando} onPress={elegirFoto} />
          {foto ? <Button title="Quitar foto" icon="trash-can-outline" small variant="ghost" fullWidth={false} onPress={() => setFoto(null)} /> : null}
        </View>
      </View>
      <Input label="Nombre" icon="account-outline" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} autoCapitalize="words" maxLength={60} />
      <Input label="Apellido" icon="account-outline" value={form.apellido} onChangeText={set('apellido')} error={errores.apellido} autoCapitalize="words" maxLength={60} />
      <Input label="Teléfono" icon="phone-outline" value={form.telefono} onChangeText={set('telefono')} error={errores.telefono} keyboardType="phone-pad" maxLength={30} placeholder="Opcional" />
      <Input label="DNI" icon="card-account-details-outline" value={form.dni} onChangeText={(t) => set('dni')(t.replace(/\D/g, ''))} error={errores.dni} keyboardType="number-pad" maxLength={9} placeholder="Opcional" />
      <Input label="Email" icon="email-outline" value={usuario.email} editable={false} hint="El email no se puede cambiar." onChangeText={() => {}} />
      <Button title="Guardar cambios" onPress={guardar} loading={cargando} style={{ marginTop: spacing.sm }} />
      <Button title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xs }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  foto: { alignItems: 'center', marginBottom: spacing.lg },
  botonesFoto: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
});
