// Fechas "de calendario" (YYYY-MM-DD) según el huso horario de la biblioteca.
import env from '../config/env.js';
const { tzOffsetHoras } = env;

// Ayudas internas: "dos" agrega un 0 adelante (5 -> "05"), "formatear" pasa una fecha a YYYY-MM-DD
// y "partes" separa '2026-11-13' en [2026, 11, 13].
const dos = (n) => String(n).padStart(2, '0');
const formatear = (d) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
const partes = (f) => f.split('-').map(Number);

/** Fecha de hoy en la zona de la biblioteca. */
const hoy = () => formatear(new Date(Date.now() + tzOffsetHoras * 3600 * 1000));

/** Suma (o resta) días a una fecha YYYY-MM-DD. */
function sumarDias(fecha, dias) {
  const [y, m, d] = partes(fecha);
  return formatear(new Date(Date.UTC(y, m - 1, d + dias)));
}

/** Cantidad de días de `desde` a `hasta` (negativo si `hasta` ya pasó). */
function diasEntre(desde, hasta) {
  const t = (f) => { const [y, m, d] = partes(f); return Date.UTC(y, m - 1, d); };
  return Math.round((t(hasta) - t(desde)) / 86400000);
}

/** 'YYYY-MM-DD' → '15/10/2026' (para emails). */
function aLegible(fecha) {
  const [y, m, d] = partes(fecha);
  return `${dos(d)}/${dos(m)}/${y}`;
}

export { hoy, sumarDias, diasEntre, aLegible };
