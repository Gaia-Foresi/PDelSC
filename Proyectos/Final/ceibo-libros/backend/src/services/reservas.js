// Consultas compartidas de reservas.
const { pool } = require('../config/db');
const { publica } = require('./visitas');

/** Marca como vencidas las reservas activas cuya fecha límite pasó (libera el ejemplar). */
async function expirarReservas(conn = pool) {
  await conn.query("UPDATE reservas SET estado = 'vencida' WHERE estado = 'activa' AND fecha_limite <= NOW()");
}

const SQL_RESERVA = `
  SELECT r.id, r.tipo, r.estado, r.creada_en, r.fecha_limite, r.visita_en, r.codigo_retiro,
         l.id AS libro_id, l.titulo, a.nombre AS autor,
         u.id AS usuario_id, u.nombre AS unombre, u.apellido AS uapellido, u.curso AS ucurso, u.dni AS udni
  FROM reservas r
  JOIN libros l ON l.id = r.libro_id
  JOIN autores a ON a.id = l.autor_id
  JOIN usuarios u ON u.id = r.usuario_id`;

const aObjeto = (r) => ({
  id: r.id,
  tipo: r.tipo,
  estado: r.estado,
  creada_en: r.creada_en,
  fecha_limite: r.fecha_limite,
  visita: publica(r.visita_en),
  codigo_retiro: r.codigo_retiro,
  libro: { id: r.libro_id, titulo: r.titulo, autor: r.autor },
  usuario: { id: r.usuario_id, nombre: `${r.unombre} ${r.uapellido}`.trim(), curso: r.ucurso, dni: r.udni },
});

/** Reservas que cumplen `where` (SQL con alias r/l/a/u) ordenadas de la más nueva a la más vieja. */
async function listarReservas(where = '', params = [], conn = pool) {
  const [filas] = await conn.query(`${SQL_RESERVA} ${where} ORDER BY r.id DESC LIMIT 300`, params);
  return filas.map(aObjeto);
}

async function obtenerReserva(id, conn = pool) {
  const [r] = await listarReservas('WHERE r.id = ?', [id], conn);
  return r || null;
}

module.exports = { expirarReservas, listarReservas, obtenerReserva };
