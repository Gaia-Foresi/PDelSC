// Tarea diaria: vence reservas, avisa devoluciones próximas y bloquea a quienes tienen libros vencidos.
const { consultar } = require('../config/db');
const { reglas } = require('../config/env');
const { hoy, sumarDias, aLegible } = require('../utils/fechas');
const { crearNotificacion } = require('./notificaciones');
const { expirarReservas } = require('./reservas');
const { enviarEmail, plantilla, escapar } = require('./mailer');

async function emailSeguro(datos) {
  try { await enviarEmail(datos); } catch (e) { console.error('[recordatorios] email fallido:', e.message); }
}

async function ejecutarRecordatorios() {
  const hoyStr = hoy();
  const limite = sumarDias(hoyStr, reglas.recordatorioDias);
  const resumen = { reservasVencidas: 0, recordatorios: 0, vencidos: 0, bloqueados: 0 };

  await expirarReservas();

  // 1) Devoluciones que vencen dentro de los próximos N días (una sola vez por préstamo)
  const proximos = await consultar(
    `SELECT p.id, p.fecha_vencimiento, u.id AS uid, u.nombre, u.email
     FROM prestamos p JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.estado = 'activo' AND p.fecha_vencimiento >= ? AND p.fecha_vencimiento <= ?`, [hoyStr, limite]);

  for (const p of proximos) {
    const cuando = p.fecha_vencimiento === hoyStr ? 'hoy' : `el ${aLegible(p.fecha_vencimiento)}`;
    const cuerpo = `Tus libros vencen ${cuando}. Acercate a la biblioteca a devolverlos o pedí una extensión.`;
    const nueva = await crearNotificacion({
      usuarioId: p.uid, tipo: 'recordatorio_devolucion', titulo: 'Se acerca la fecha de devolución', cuerpo, prestamoId: p.id,
    });
    if (nueva) {
      resumen.recordatorios += 1;
      await emailSeguro({
        para: p.email, asunto: 'Recordatorio de devolución · Ceibo Libros', texto: `Hola ${p.nombre}. ${cuerpo}`,
        html: plantilla('Recordatorio de devolución', `<p>Hola ${escapar(p.nombre)}.</p><p>${escapar(cuerpo)}</p>`),
      });
    }
  }

  // 2) Préstamos vencidos: se avisa y se bloquea la cuenta hasta que devuelva
  const vencidos = await consultar(
    `SELECT p.id, p.fecha_vencimiento, u.id AS uid, u.nombre, u.email, u.estado
     FROM prestamos p JOIN usuarios u ON u.id = p.usuario_id
     JOIN roles r ON r.id = u.rol_id
     WHERE p.estado = 'activo' AND p.fecha_vencimiento < ? AND r.nombre = 'usuario'`, [hoyStr]);

  for (const p of vencidos) {
    const cuerpo = `Tu préstamo venció el ${aLegible(p.fecha_vencimiento)}. Devolvé los libros en la biblioteca para volver a usar el servicio.`;
    const nueva = await crearNotificacion({
      usuarioId: p.uid, tipo: 'vencimiento', titulo: 'Tenés libros vencidos', cuerpo, prestamoId: p.id,
    });
    if (nueva) {
      resumen.vencidos += 1;
      await emailSeguro({
        para: p.email, asunto: 'Préstamo vencido · Ceibo Libros', texto: `Hola ${p.nombre}. ${cuerpo}`,
        html: plantilla('Préstamo vencido', `<p>Hola ${escapar(p.nombre)}.</p><p>${escapar(cuerpo)}</p>`),
      });
    }
    if (p.estado !== 'bloqueado') {
      const motivo = 'Tenés libros sin devolver con el plazo vencido. Devolvelos en la biblioteca y tu cuenta se habilita automáticamente.';
      await consultar("UPDATE usuarios SET estado = 'bloqueado', motivo_bloqueo = ?, bloqueado_en = NOW() WHERE id = ? AND estado = 'activo'", [motivo, p.uid]);
      await crearNotificacion({ usuarioId: p.uid, tipo: 'bloqueo', titulo: 'Cuenta bloqueada', cuerpo: motivo });
      p.estado = 'bloqueado'; // evita bloquear dos veces si tiene varios préstamos vencidos
      resumen.bloqueados += 1;
    }
  }

  console.log('[recordatorios]', resumen);
  return resumen;
}

module.exports = { ejecutarRecordatorios };
