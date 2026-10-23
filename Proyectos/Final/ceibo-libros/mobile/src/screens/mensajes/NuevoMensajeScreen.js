// Nueva conversación. Usuario: consulta a la biblioteca. Staff: mensaje interno dueño ↔ bibliotecario.
import React, { useState } from 'react';
import { Text } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { useAsync } from '../../hooks/useAsync';
import * as v from '../../utils/validators';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScreenContainer from '../../components/ScreenContainer';
import SelectField from '../../components/SelectField';
import { useToast } from '../../components/Toast';
import { ROL_TEXTO } from '../../utils/format';

export default function NuevoMensajeScreen({ navigation }) {
  const { colors } = useTheme();
  const { esStaff, usuario } = useAuth();
  const toast = useToast();
  const tipo = esStaff ? 'interno' : 'consulta';
  const [form, setForm] = useState({ destinatario: null, asunto: '', cuerpo: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };

  const contactos = useAsync(() => (esStaff ? api.mensajes.contactos() : Promise.resolve(null)), [esStaff]);
  const opciones = (contactos.data?.contactos || []).map((c) => ({ value: c.id, label: c.nombre, description: ROL_TEXTO[c.rol] }));

  const enviar = async () => {
    const e = {
      asunto: v.requerido(form.asunto, 'El asunto'),
      cuerpo: v.requerido(form.cuerpo, 'El mensaje'),
      destinatario: esStaff && !form.destinatario ? 'Elegí a quién le escribís' : '',
    };
    setErrores(e);
    if (!v.sinErrores(e)) return;
    setEnviando(true);
    try {
      const asunto = form.asunto.trim();
      const data = await api.mensajes.crear({
        tipo, asunto, cuerpo: form.cuerpo.trim(), ...(esStaff ? { destinatario_id: form.destinatario } : {}),
      });
      toast.success('Mensaje enviado.');
      navigation.replace('Hilo', { id: data.hilo.id, asunto });
    } catch (err) {
      if (err.detalles) setErrores({ asunto: err.detalles.asunto, cuerpo: err.detalles.cuerpo, destinatario: err.detalles.destinatario_id });
      toast.fromError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScreenContainer title={esStaff ? 'Mensaje al equipo' : 'Nueva consulta'} back showBell={false}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 }}>
        {esStaff
          ? `Escribile ${usuario.rol === 'dueno' ? 'a un bibliotecario' : 'al dueño'} para mantenerse informados. El resto del equipo no ve este mensaje.`
          : 'Tu consulta le llega al bibliotecario y al dueño de la biblioteca. Te respondemos acá mismo.'}
      </Text>
      {esStaff ? (
        <SelectField
          label="Para"
          title="¿A quién le escribís?"
          value={form.destinatario}
          options={opciones}
          onChange={set('destinatario')}
          placeholder={contactos.loading ? 'Cargando…' : opciones.length ? 'Elegí una persona' : 'No hay contactos disponibles'}
          error={errores.destinatario}
        />
      ) : null}
      <Input label="Asunto" icon="format-title" value={form.asunto} onChangeText={set('asunto')} error={errores.asunto} maxLength={140} placeholder={esStaff ? 'Ej.: Reposición de stock' : 'Ej.: ¿Hasta qué hora atienden?'} />
      <Input label="Mensaje" value={form.cuerpo} onChangeText={set('cuerpo')} error={errores.cuerpo} multiline maxLength={2000} placeholder="Escribí tu mensaje…" />
      <Button title="Enviar" icon="send" onPress={enviar} loading={enviando} />
    </ScreenContainer>
  );
}
