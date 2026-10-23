// Código de 6 dígitos: sirve para verificar el email y para el segundo paso del login.
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useToast } from '../../components/Toast';
import * as v from '../../utils/validators';
import AuthLayout from './AuthLayout';

const ESPERA = 30; // segundos entre reenvíos

export default function CodeScreen({ route, navigation }) {
  const { email, proposito } = route.params;
  const { colors } = useTheme();
  const { iniciarSesion } = useAuth();
  const toast = useToast();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(ESPERA);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const es2fa = proposito === 'login_2fa';

  const verificar = async () => {
    const e = v.codigo(codigo);
    setError(e);
    if (e) return;
    setCargando(true);
    try {
      const body = { email, codigo: codigo.trim() };
      const data = es2fa ? await api.auth.login2fa(body) : await api.auth.verificarEmail(body);
      await iniciarSesion(data);
    } catch (err) {
      setError(err.codigo === 'CODIGO_INVALIDO' ? err.message : '');
      toast.fromError(err);
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    try {
      await api.auth.reenviarCodigo({ email, proposito });
      setEspera(ESPERA);
      toast.success('Te enviamos un código nuevo.');
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <AuthLayout
      title={es2fa ? 'Verificación en 2 pasos' : 'Verificá tu email'}
      subtitle={`Ingresá el código de 6 números que enviamos a ${email}.`}
      compactLogo
    >
      <Input
        label="Código"
        icon="shield-key-outline"
        value={codigo}
        onChangeText={(t) => { setCodigo(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        error={error}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        inputStyle={{ letterSpacing: 6, fontSize: 20, fontWeight: '700' }}
        onSubmitEditing={verificar}
        autoComplete="one-time-code"
      />
      <Button title="Confirmar" onPress={verificar} loading={cargando} />
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 13 }}>
        ¿No te llegó? Revisá la carpeta de spam.
      </Text>
      <Button title={espera > 0 ? `Reenviar código (${espera}s)` : 'Reenviar código'} variant="secondary" disabled={espera > 0} onPress={reenviar} />
      <Button title="Volver" variant="ghost" small onPress={() => navigation.goBack()} style={{ marginTop: spacing.xs }} />
    </AuthLayout>
  );
}
