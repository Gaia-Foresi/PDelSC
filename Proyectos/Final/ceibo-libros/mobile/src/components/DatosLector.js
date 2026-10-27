// Formulario "datos del lector" que se pide al reservar o pedir un préstamo (nombre, apellido y DNI)
// y diálogo que muestra el código de retiro. Uso:
//   const { pedirDatos, mostrarCodigo } = useDatosLector();
//   const datos = await pedirDatos({ titulo, mensaje, confirmText, visitaTipo: 'sala' | 'retiro' });   // null si cancela
//   (con visitaTipo también pide día y hora de la visita y devuelve `visita`)
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, shadow, spacing } from '../theme/tokens';
import Button from './Button';
import CodigoRetiro from './CodigoRetiro';
import Input from './Input';
import SelectorVisita from './SelectorVisita';
import { visitaTexto } from '../utils/format';
import { SheetModal } from './Modal';

const Ctx = createContext(null);
export const useDatosLector = () => useContext(Ctx);

export const limpiarDni = (v) => String(v || '').replace(/\D/g, '');
// Nombre y apellido: solo letras (con acentos), espacios, apóstrofe y guion. DNI: solo números.
export const limpiarNombre = (v) => String(v || '').replace(/[^\p{L}\s'’-]/gu, '').replace(/\s{2,}/g, ' ');
const NOMBRE_OK = /^\p{L}[\p{L}\s'’-]*$/u;

/** Campos de datos del lector reutilizables (también los usa el préstamo directo del personal). */
export function validarDatosLector(f) {
  return {
    nombre: !f.nombre.trim() ? 'Escribí el nombre' : (f.nombre.trim().length < 2 || !NOMBRE_OK.test(f.nombre.trim())) ? 'El nombre solo puede tener letras' : '',
    apellido: !f.apellido.trim() ? 'Escribí el apellido' : (f.apellido.trim().length < 2 || !NOMBRE_OK.test(f.apellido.trim())) ? 'El apellido solo puede tener letras' : '',
    dni: /^\d{6,9}$/.test(limpiarDni(f.dni)) ? '' : 'El DNI debe tener entre 6 y 9 números',
  };
}

export function CamposDatosLector({ form, setCampo, errores }) {
  return (
    <View>
      <Input label="Nombre" icon="account-outline" value={form.nombre} onChangeText={(t) => setCampo('nombre')(limpiarNombre(t))} error={errores.nombre} autoCapitalize="words" maxLength={60} />
      <Input label="Apellido" icon="account-outline" value={form.apellido} onChangeText={(t) => setCampo('apellido')(limpiarNombre(t))} error={errores.apellido} autoCapitalize="words" maxLength={60} />
      <Input label="DNI" icon="card-account-details-outline" value={form.dni} onChangeText={(t) => setCampo('dni')(limpiarDni(t))} error={errores.dni} keyboardType="number-pad" maxLength={9} placeholder="Solo números" />
    </View>
  );
}

export const formDesde = (u) => ({ nombre: u?.nombre || '', apellido: u?.apellido || '', dni: u?.dni || '' });

export function DatosLectorProvider({ children }) {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const [opts, setOpts] = useState(null);
  const [form, setForm] = useState(formDesde(null));
  const [errores, setErrores] = useState({});
  const [codigo, setCodigo] = useState(null);
  const [visita, setVisita] = useState(null);
  const [errorVisita, setErrorVisita] = useState('');
  const resolver = useRef(null);
  const resolverCodigo = useRef(null);

  const pedirDatos = useCallback((o) => new Promise((resolve) => {
    resolver.current = resolve;
    setErrores({});
    setVisita(null);
    setErrorVisita('');
    setForm(formDesde(o.inicial || usuario));
    setOpts(o);
  }), [usuario]);

  const mostrarCodigo = useCallback((o) => new Promise((resolve) => {
    resolverCodigo.current = resolve;
    setCodigo(o);
  }), []);

  const cerrar = (resultado) => {
    setOpts(null);
    resolver.current?.(resultado);
    resolver.current = null;
  };
  const cerrarCodigo = () => {
    setCodigo(null);
    resolverCodigo.current?.();
    resolverCodigo.current = null;
  };

  const setCampo = (k) => (t) => { setForm((f) => ({ ...f, [k]: t })); setErrores((e) => ({ ...e, [k]: '' })); };
  const enviar = () => {
    const e = validarDatosLector(form);
    setErrores(e);
    if (opts?.visitaTipo && !visita) setErrorVisita('Elegí el día y la hora en que vas a ir.');
    if (Object.values(e).some(Boolean) || (opts?.visitaTipo && !visita)) return;
    cerrar({
      nombre: form.nombre.trim(), apellido: form.apellido.trim(), dni: limpiarDni(form.dni),
      ...(opts?.visitaTipo ? { visita } : {}),
    });
  };

  return (
    <Ctx.Provider value={{ pedirDatos, mostrarCodigo }}>
      {children}
      <SheetModal
        visible={!!opts}
        title={opts?.titulo || 'Tus datos'}
        onClose={() => cerrar(null)}
        footer={<Button title={opts?.confirmText || 'Continuar'} icon="check" onPress={enviar} />}
      >
        {opts?.mensaje ? <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 21, marginBottom: spacing.md }}>{opts.mensaje}</Text> : null}
        <CamposDatosLector form={form} setCampo={setCampo} errores={errores} />
        {opts?.visitaTipo ? (
          <SelectorVisita tipo={opts.visitaTipo} value={visita} onChange={(v) => { setVisita(v); setErrorVisita(''); }} error={errorVisita} />
        ) : null}
      </SheetModal>

      <Modal visible={!!codigo} transparent animationType="fade" onRequestClose={cerrarCodigo} statusBarTranslucent>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors.shadow)]} accessibilityViewIsModal>
            <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
              <MaterialCommunityIcons name="check-decagram-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.titulo, { color: colors.text, fontFamily: font.title }]}>{codigo?.titulo}</Text>
            {codigo?.mensaje ? <Text style={[styles.mensaje, { color: colors.textMuted }]}>{codigo.mensaje}</Text> : null}
            <View style={{ alignSelf: 'stretch' }}><CodigoRetiro codigo={codigo?.codigo} /></View>
            {codigo?.visita ? (
              <View style={[styles.visita, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginLeft: 8, flex: 1 }}>Te esperamos el {visitaTexto(codigo.visita)}</Text>
              </View>
            ) : null}
            {codigo?.vigencia ? <Text style={[styles.mensaje, { color: colors.textMuted }]}>{codigo.vigencia}</Text> : null}
            <Text style={[styles.mensaje, { color: colors.textMuted, fontSize: 13, marginTop: spacing.md }]}>
              También lo ves siempre en “Libros reservados” y en el detalle del préstamo.
            </Text>
            <Button title="Entendido" onPress={cerrarCodigo} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  icono: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  titulo: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  mensaje: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  visita: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
});
