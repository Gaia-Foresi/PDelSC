import { avisarCorrecto, avisarErrores } from './formularios';

// Validaciones de formularios. Cada función devuelve un texto de error o '' si está bien.
// Campo obligatorio: si está vacío (o solo tiene espacios), devuelve el mensaje de error.
export const requerido = (v, nombre = 'Este campo') => (String(v ?? '').trim() ? '' : `${nombre} es obligatorio`);

// Email: obligatorio y con formato válido.
export const email = (v) => {
  if (!String(v ?? '').trim()) return 'Ingresá tu email';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'El email no es válido';
};

// Contraseña: las mismas reglas que pide el backend.
export const password = (v) => {
  if (!v) return 'Ingresá una contraseña';
  if (v.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Debe tener al menos una letra y un número';
  return '';
};

// Código de verificación: exactamente 6 números.
export const codigo = (v) => (/^\d{6}$/.test(String(v ?? '').trim()) ? '' : 'El código tiene 6 números');

// Número con un valor mínimo.
export const numeroMin = (v, min, nombre = 'El valor') => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || Number.isNaN(n)) return `${nombre} debe ser un número`;
  return n >= min ? '' : `${nombre} debe ser ${min} o más`;
};

// Recibe { campo: error } y devuelve true si no hay ningún error
export const sinErrores = (errores) => {
  const cantidad = Object.values(errores).filter(Boolean).length;
  if (!cantidad) avisarCorrecto(); // si había un aviso de campos por corregir, se retira
  if (cantidad) avisarErrores(cantidad); // desplaza la pantalla hasta el primer campo a corregir y avisa cuántos son
  return cantidad === 0;
};
