// Seguridad de la cuenta: verificación en 2 pasos por email y cambio de contraseña.
import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import * as v from '../../utils/validators';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useConfirm } from '../../components/Confirm';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';

export default function SeguridadScreen() {
  const { colors } = useTheme();
  const { usuario, actualizarUsuario } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [cambiando2fa, setCambiando2fa] = useState(false);
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const cambiar2fa = async (activar) => {
    if (!activar) {
      const ok = await confirm({
        title: '¿Desactivar la verificación en 2 pasos?',
        message: 'Tu cuenta va a quedar protegida solo con la contraseña.',
        confirmText: 'Desactivar', destructive: true,
      });
      if (!ok) return;
    }
    setCambiando2fa(true);
    try {
      const data = await api.usuarios.dosPasos({ activar });
      await actualizarUsuario(data.usuario);
      toast.success(activar ? 'Verificación en 2 pasos activada.' : 'Verificación en 2 pasos desactivada.');
    } catch (err) {
      toast.fromError(err);
    } finally {
      setCambiando2fa(false);
    }
  };

  const cambiarPassword = async () => {
    const e = {
      nueva: v.password(form.nueva),
      repetir: form.repetir === form.nueva ? '' : 'Las contraseñas no coinciden',
    };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setGuardando(true);
    try {
      await api.usuarios.cambiarPassword({ ...(form.actual ? { password_actual: form.actual } : {}), password_nueva: form.nueva });
      setForm({ actual: '', nueva: '', repetir: '' });
      toast.success('Contraseña actualizada.');
    } catch (err) {
      if (err.detalles) setErrores({ actual: err.detalles.password_actual, nueva: err.detalles.password_nueva });
      toast.fromError(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScreenContainer title="Seguridad" back>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Verificación en 2 pasos</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
              Cada vez que ingreses con tu contraseña te vamos a enviar un código de 6 números a {usuario.email}.
            </Text>
          </View>
          <Switch
            value={!!usuario.dos_pasos_activo}
            onValueChange={cambiar2fa}
            disabled={cambiando2fa}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Verificación en 2 pasos"
          />
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md }}>Cambiar contraseña</Text>
        <Input label="Contraseña actual" icon="lock-outline" secure value={form.actual} onChangeText={set('actual')} error={errores.actual} autoCapitalize="none"
          hint="Si te registraste con Google o GitHub y nunca creaste una contraseña, dejala vacía." />
        <Input label="Contraseña nueva" icon="lock-plus-outline" secure value={form.nueva} onChangeText={set('nueva')} error={errores.nueva} autoCapitalize="none" hint="Mínimo 8 caracteres, con letras y números." />
        <Input label="Repetir contraseña nueva" icon="lock-check-outline" secure value={form.repetir} onChangeText={set('repetir')} error={errores.repetir} autoCapitalize="none" onSubmitEditing={cambiarPassword} />
        <Button title="Guardar contraseña" onPress={cambiarPassword} loading={guardando} />
      </Card>
    </ScreenContainer>
  );
}
