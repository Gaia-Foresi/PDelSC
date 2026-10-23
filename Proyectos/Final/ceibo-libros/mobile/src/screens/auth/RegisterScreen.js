import React, { useState } from 'react';
import { api } from '../../api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme/tokens';
import * as v from '../../utils/validators';
import AuthLayout from './AuthLayout';

export default function RegisterScreen({ navigation }) {
  const toast = useToast();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', repetir: '' });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const enviar = async () => {
    const e = {
      nombre: v.requerido(form.nombre, 'El nombre'),
      apellido: v.requerido(form.apellido, 'El apellido'),
      email: v.email(form.email),
      password: v.password(form.password),
      repetir: form.repetir === form.password ? '' : 'Las contraseñas no coinciden',
    };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setCargando(true);
    try {
      const email = form.email.trim().toLowerCase();
      await api.auth.registro({ nombre: form.nombre.trim(), apellido: form.apellido.trim(), email, password: form.password });
      toast.success('Te enviamos un código por email.');
      navigation.navigate('Codigo', { email, proposito: 'verificar_email' });
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout title="Crear cuenta" subtitle="Registrate para reservar libros. Vamos a verificar tu email." compactLogo>
      <Input label="Nombre" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} autoComplete="given-name" />
      <Input label="Apellido" value={form.apellido} onChangeText={set('apellido')} error={errores.apellido} autoComplete="family-name" />
      <Input label="Email" icon="email-outline" value={form.email} onChangeText={set('email')} error={errores.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Input label="Contraseña" icon="lock-outline" value={form.password} onChangeText={set('password')} error={errores.password} hint="Mínimo 8 caracteres, con letras y números" secure autoCapitalize="none" />
      <Input label="Repetir contraseña" icon="lock-check-outline" value={form.repetir} onChangeText={set('repetir')} error={errores.repetir} secure autoCapitalize="none" onSubmitEditing={enviar} />
      <Button title="Crear cuenta" onPress={enviar} loading={cargando} />
      <Button title="Ya tengo cuenta" variant="ghost" small onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm }} />
    </AuthLayout>
  );
}
