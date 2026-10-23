// Recuperar contraseña en 2 pasos: 1) pedir el código por email  2) código + contraseña nueva
import React, { useState } from 'react';
import { api } from '../../api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useToast } from '../../components/Toast';
import { spacing } from '../../theme/tokens';
import * as v from '../../utils/validators';
import AuthLayout from './AuthLayout';

export default function ForgotPasswordScreen({ navigation }) {
  const toast = useToast();
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({ email: '', codigo: '', password: '' });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const pedirCodigo = async () => {
    const e = { email: v.email(form.email) };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setCargando(true);
    try {
      await api.auth.olvidePassword({ email: form.email.trim().toLowerCase() });
      toast.success('Si el email existe, te enviamos un código.');
      setPaso(2);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  const cambiar = async () => {
    const e = { codigo: v.codigo(form.codigo), password: v.password(form.password) };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setCargando(true);
    try {
      await api.auth.resetPassword({ email: form.email.trim().toLowerCase(), codigo: form.codigo.trim(), password: form.password });
      toast.success('Contraseña actualizada. Ya podés ingresar.');
      navigation.navigate('Login');
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle={paso === 1 ? 'Te enviamos un código a tu email para que elijas una contraseña nueva.' : 'Ingresá el código que te llegó y tu contraseña nueva.'}
      compactLogo
    >
      {paso === 1 ? (
        <>
          <Input label="Email" icon="email-outline" value={form.email} onChangeText={set('email')} error={errores.email} keyboardType="email-address" autoCapitalize="none" onSubmitEditing={pedirCodigo} />
          <Button title="Enviar código" onPress={pedirCodigo} loading={cargando} />
        </>
      ) : (
        <>
          <Input label="Código" icon="shield-key-outline" value={form.codigo} onChangeText={(t) => set('codigo')(t.replace(/\D/g, '').slice(0, 6))} error={errores.codigo} keyboardType="number-pad" maxLength={6} />
          <Input label="Contraseña nueva" icon="lock-outline" value={form.password} onChangeText={set('password')} error={errores.password} hint="Mínimo 8 caracteres, con letras y números" secure autoCapitalize="none" />
          <Button title="Cambiar contraseña" onPress={cambiar} loading={cargando} />
          <Button title="Reenviar código" variant="ghost" small onPress={pedirCodigo} style={{ marginTop: spacing.sm }} />
        </>
      )}
      <Button title="Volver al ingreso" variant="ghost" small onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xs }} />
    </AuthLayout>
  );
}
