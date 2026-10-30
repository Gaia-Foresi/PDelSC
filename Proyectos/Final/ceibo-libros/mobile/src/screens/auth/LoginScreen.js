import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useToast } from '../../components/Toast';
import SocialButtons from '../../auth/SocialButtons';
import * as v from '../../utils/validators';
import AuthLayout from './AuthLayout';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { iniciarSesion } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const enviar = async () => {
    const e = { email: v.email(form.email), password: v.requerido(form.password, 'La contraseña') };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setCargando(true);
    try {
      const email = form.email.trim().toLowerCase();
      const data = await api.auth.login({ email, password: form.password });
      if (data.requiere_verificacion) navigation.navigate('Codigo', { email, proposito: 'verificar_email' });
      else if (data.requiere_2fa) navigation.navigate('Codigo', { email, proposito: 'login_2fa' });
      else await iniciarSesion(data);
    } catch (err) {
      if (err.detalles) setErrores(err.detalles);
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout title="Ingresar" subtitle="Bienvenido a la biblioteca. Entrá para reservar y pedir libros.">
      <Input label="Email" icon="email-outline" value={form.email} onChangeText={set('email')} error={errores.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@email.com" />
      <Input label="Contraseña" icon="lock-outline" value={form.password} onChangeText={set('password')} error={errores.password} secure autoCapitalize="none" autoComplete="password" placeholder="Tu contraseña" onSubmitEditing={enviar} />
      <Button title="Ingresar" onPress={enviar} loading={cargando} />
      <Button title="Olvidé mi contraseña" variant="ghost" small onPress={() => navigation.navigate('Olvide')} style={{ marginTop: spacing.xs }} />

      <View style={styles.sep}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.sepText, { color: colors.textMuted }]}>o continuá con (si ya tenés cuenta)</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
      <SocialButtons modo="ingreso" />

      <View style={{ marginTop: spacing.xl }}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm }}>¿Todavía no tenés cuenta?</Text>
        <Button title="Crear cuenta" variant="secondary" onPress={() => navigation.navigate('Registro')} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  sep: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1 },
  sepText: { marginHorizontal: spacing.md, fontSize: 13 },
});
