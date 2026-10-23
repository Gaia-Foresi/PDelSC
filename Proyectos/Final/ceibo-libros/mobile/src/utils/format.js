// Formato de fechas y textos en español (sin depender de Intl para que ande igual en todos lados).
const pad = (n) => String(n).padStart(2, '0');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// '2026-10-15' (DATE) o ISO completo -> '15/10/2026'
export function fecha(valor) {
  if (!valor) return '';
  const d = new Date(String(valor).length === 10 ? `${valor}T00:00:00` : valor);
  if (isNaN(d)) return String(valor);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fechaHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Para mensajes: hora si es de hoy, si no "15 oct"
export function fechaCorta(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

// '2026-05' -> 'may 26'
export function mesCorto(ym) {
  const [y, m] = String(ym).split('-');
  return `${MESES[Number(m) - 1] || ym} ${String(y).slice(2)}`;
}

export function iniciales(nombre = '', apellido = '') {
  const a = nombre.trim()[0] || '';
  const b = apellido.trim()[0] || (nombre.trim().split(' ')[1] || '')[0] || '';
  return (a + b).toUpperCase() || '?';
}

export const nombreCompleto = (u) => [u?.nombre, u?.apellido].filter(Boolean).join(' ');

export const ROL_TEXTO = { dueno: 'Dueño', bibliotecario: 'Bibliotecario', usuario: 'Usuario' };

export function diasTexto(prestamo) {
  if (prestamo.estado === 'cerrado') return 'Devuelto';
  const d = prestamo.dias_restantes;
  if (prestamo.vencido) return `Vencido hace ${Math.abs(d ?? 0)} ${Math.abs(d) === 1 ? 'día' : 'días'}`;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  return `Quedan ${d} días`;
}

// Elige texto claro u oscuro según el color de fondo (para letras sobre las categorías)
export function textoSobre(hex = '#8FAE8B') {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#2B1D18' : '#FFFFFF';
}

const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export { MESES_LARGO };

/** 'YYYY-MM-DD' → día de la semana (0 = domingo), sin depender del huso horario del dispositivo. */
export const diaSemana = (fechaIso) => { const [y, m, d] = fechaIso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

/** Visita de la API ({ fecha, hora }) → "vie 23/10 · 09:30 hs". */
export function visitaTexto(v) {
  if (!v) return '';
  const [, m, d] = v.fecha.split('-');
  return `${DIAS_CORTO[diaSemana(v.fecha)]} ${d}/${m} · ${v.hora} hs`;
}

/** 'YYYY-MM-DD' → "viernes 23 de octubre". */
export function diaLargo(fechaIso) {
  const [, m, d] = fechaIso.split('-').map(Number);
  return `${DIAS_LARGO[diaSemana(fechaIso)]} ${d} de ${MESES_LARGO[m - 1]}`;
}
