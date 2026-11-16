// Fecha y hora en que una persona va a la biblioteca: horarios disponibles y validación.
// Todo se guarda en UTC; los días y las horas de atención se calculan en la hora local (TZ_OFFSET_HORAS).
import env from '../config/env.js';
import { err } from '../utils/httpError.js';

const { visitas, tzOffsetHoras } = env;

// "sala" = leer en la biblioteca, "retiro" = llevarse el libro.
const HORAS_VENTANA = { sala: 24, retiro: 72 }; // cuánto se guarda la reserva como mínimo según el tipo
const DIAS_ELEGIBLES = 14; // hasta cuántos días adelante se puede elegir la visita
// Agrega un 0 adelante a los números de una cifra (5 -> "05").
const dos = (n) => String(n).padStart(2, '0');
const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Date (UTC) → fecha y hora locales de la biblioteca. */
function aLocal(fecha) {
  const d = new Date(new Date(fecha).getTime() + tzOffsetHoras * 3600000);
  return {
    fecha: `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`,
    hora: `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`,
    dow: d.getUTCDay(), // 0 = domingo
  };
}

/** Objeto público de una visita (o null). */
function publica(fecha) {
  if (!fecha) return null;
  const l = aLocal(fecha);
  return { en: new Date(fecha).toISOString(), fecha: l.fecha, hora: l.hora };
}

/** Fecha y hora locales → Date (UTC). */
const aUtc = (y, m, d, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min) - tzOffsetHoras * 3600000);

/** Todos los horarios de atención entre `desde` y `hasta` (Dates UTC), en orden. */
// Recorre día por día y, en los días de atención, agrega un horario cada "pasoMin" minutos
// entre la hora de apertura y la de cierre.
function generarHorarios(desde, hasta) {
  const salida = [];
  const inicio = aLocal(desde).fecha.split('-').map(Number);
  const fin = aUtc(...aLocal(hasta).fecha.split('-').map(Number)).getTime();
  for (let dia = new Date(Date.UTC(inicio[0], inicio[1] - 1, inicio[2])); ; dia = new Date(dia.getTime() + 86400000)) {
    const [y, m, d] = [dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate()];
    if (aUtc(y, m, d).getTime() > fin) break;
    // getUTCDay() da 0 para el domingo; acá se pasa a 7 para que coincida con la configuración (1 = lunes ... 7 = domingo).
    const dow = dia.getUTCDay() === 0 ? 7 : dia.getUTCDay();
    if (!visitas.dias.includes(dow)) continue;
    for (let minutos = visitas.horaApertura * 60; minutos < visitas.horaCierre * 60; minutos += visitas.pasoMin) {
      const t = aUtc(y, m, d, Math.floor(minutos / 60), minutos % 60);
      if (t >= desde && t <= hasta) salida.push(t);
    }
  }
  return salida;
}

/** Horarios disponibles para una reserva: desde dentro de 5 minutos hasta DIAS_ELEGIBLES días adelante (solo días y horas de atención). */
function horariosPara() {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 5 * 60000);
  const hasta = new Date(ahora.getTime() + DIAS_ELEGIBLES * 86400000);
  return { lista: generarHorarios(desde, hasta) };
}

/** ¿Ese día está bloqueado por el gerente?
 *  - `fecha`: el día como texto 'YYYY-MM-DD' (hora local de la biblioteca).
 *  - `bloqueos`: la lista que trae bloqueosVigentes(), con forma [{ desde, hasta }].
 *  En criollo: recorre los bloqueos y dice "sí" si la fecha cae entre el `desde` y el `hasta` de alguno.
 *  Se puede comparar así, con >= y <=, porque 'YYYY-MM-DD' ordena igual como texto que como fecha. */
const diaBloqueado = (fecha, bloqueos = []) => bloqueos.some((b) => fecha >= b.desde && fecha <= b.hasta);

/** Horarios agrupados por día, listos para mostrar.
 *  En criollo: toma todos los horarios posibles y los reparte en "cajitas" por día. Si el día está cerrado,
 *  la cajita se marca con `no_disponible: true` y queda SIN horas. Nunca se informa el motivo del cierre. */
function horariosAgrupados(tipo, bloqueos = []) {
  const { lista } = horariosPara(); // todos los horarios de atención de los próximos días
  const dias = [];
  for (const t of lista) {
    const l = aLocal(t); // pasa el horario a fecha y hora locales
    let dia = dias.find((x) => x.fecha === l.fecha); // ¿ya existe la cajita de este día?
    if (!dia) {
      const [y, m, d] = l.fecha.split('-');
      dia = { fecha: l.fecha, etiqueta: `${DIAS_CORTO[l.dow]} ${d}/${m}`, horas: [] };
      if (diaBloqueado(l.fecha, bloqueos)) dia.no_disponible = true; // día cerrado: se marca, y la app lo dibuja tachado
      dias.push(dia);
    }
    // Las horas solo se agregan si el día NO está cerrado
    if (!dia.no_disponible) dia.horas.push({ hora: l.hora, iso: t.toISOString() });
  }
  return dias;
}

/** Comprueba que `iso` sea uno de los horarios disponibles. Devuelve la fecha de visita y hasta cuándo se guarda la reserva. */
function validarVisitaReserva(iso, tipo, bloqueos = []) {
  const t = new Date(iso);
  const { lista } = horariosPara();
  if (Number.isNaN(t.getTime()) || !lista.some((x) => x.getTime() === t.getTime())) {
    throw err.validacion('Elegí un día y horario disponibles para tu visita.', { visita: 'Horario no disponible' });
  }
  // Segunda barrera: aunque la app no deje tocar un día cerrado, el servidor lo comprueba igual.
  // (Si alguien manda el pedido "a mano", sin usar la app, esta línea lo frena.)
  if (diaBloqueado(aLocal(t).fecha, bloqueos)) {
    throw err.validacion('Ese día no está disponible para reservas. Elegí otra fecha.', { visita: 'Día no disponible' });
  }
  // La reserva se guarda como mínimo 24 h (sala) o 72 h (retiro), o hasta la hora de visita más el margen, lo que sea más tarde.
  const base = new Date(Date.now() + (HORAS_VENTANA[tipo] || 24) * 3600000);
  const conGracia = new Date(t.getTime() + visitas.graciaHoras * 3600000);
  return { visita: t, limite: conGracia > base ? conGracia : base };
}

/** Visita de un préstamo cargado por el personal: cualquier fecha razonable; sin dato = ahora. */
function visitaPrestamo(iso) {
  if (!iso) return new Date();
  const t = new Date(iso);
  const dif = Math.abs(t.getTime() - Date.now());
  if (Number.isNaN(t.getTime()) || dif > 60 * 86400000) {
    throw err.validacion('La fecha y hora de la visita no es válida.', { visita: 'Fecha inválida' });
  }
  return t;
}

export { aLocal, aUtc, publica, diaBloqueado, horariosAgrupados, validarVisitaReserva, visitaPrestamo };
