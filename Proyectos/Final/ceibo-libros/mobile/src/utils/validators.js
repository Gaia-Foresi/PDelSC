// Validaciones de formularios. Cada función devuelve un texto de error o '' si está bien.
export const requerido = (v, nombre = 'Este campo') => (String(v ?? '').trim() ? '' : `${nombre} es obligatorio`);

export const email = (v) => {
  if (!String(v ?? '').trim()) return 'Ingresá tu email';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'El email no es válido';
};

export const password = (v) => {
  if (!v) return 'Ingresá una contraseña';
  if (v.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Debe tener al menos una letra y un número';
  return '';
};

export const codigo = (v) => (/^\d{6}$/.test(String(v ?? '').trim()) ? '' : 'El código tiene 6 números');

export const numeroMin = (v, min, nombre = 'El valor') => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || Number.isNaN(n)) return `${nombre} debe ser un número`;
  return n >= min ? '' : `${nombre} debe ser ${min} o más`;
};

// Recibe { campo: error } y devuelve true si no hay ningún error
export const sinErrores = (errores) => Object.values(errores).every((e) => !e);
