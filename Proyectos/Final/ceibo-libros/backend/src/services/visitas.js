// Fecha y hora en que una persona va a la biblioteca: horarios disponibles y validación.
// Todo se guarda en UTC; los días y las horas de atención se calculan en la hora local (TZ_OFFSET_HORAS).
const { visitas, tzOffsetHoras } = require('../config/env');
const { err } = require('../utils/httpError');

const HORAS_VENTANA = { sala: 24, retiro: 72 }; // cuánto se guarda la reserva como mínimo según el tipo
const DIAS_ELEGIBLES = 14; // hasta cuántos días adelante se puede elegir la visita
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
function generarHorarios(desde, hasta) {
  const salida = [];
  const inicio = aLocal(desde).fecha.split('-').map(Number);
  const fin = aUtc(...aLocal(hasta).fecha.split('-').map(Number)).getTime();
  for (let dia = new Date(Date.UTC(inicio[0], inicio[1] - 1, inicio[2])); ; dia = new Date(dia.getTime() + 86400000)) {
    const [y, m, d] = [dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate()];
    if (aUtc(y, m, d).getTime() > fin) break;
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

/** Horarios agrupados por día, listos para mostrar. */
function horariosAgrupados(tipo) {
  const { lista } = horariosPara();
  const dias = [];
  for (const t of lista) {
    const l = aLocal(t);
    let dia = dias.find((x) => x.fecha === l.fecha);
    if (!dia) {
      const [y, m, d] = l.fecha.split('-');
      dia = { fecha: l.fecha, etiqueta: `${DIAS_CORTO[l.dow]} ${d}/${m}`, horas: [] };
      dias.push(dia);
    }
    dia.horas.push({ hora: l.hora, iso: t.toISOString() });
  }
  return dias;
}

/** Comprueba que `iso` sea uno de los horarios disponibles. Devuelve la fecha de visita y hasta cuándo se guarda la reserva. */
function validarVisitaReserva(iso, tipo) {
  const t = new Date(iso);
  const { lista } = horariosPara();
  if (Number.isNaN(t.getTime()) || !lista.some((x) => x.getTime() === t.getTime())) {
    throw err.validacion('Elegí un día y horario disponibles para tu visita.', { visita: 'Horario no disponible' });
  }
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

module.exports = { aLocal, aUtc, publica, horariosAgrupados, validarVisitaReserva, visitaPrestamo };
