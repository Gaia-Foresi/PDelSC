// Consultas compartidas de libros (con ejemplares disponibles calculados).
const { pool } = require('../config/db');

// disponibles = stock_total - prestados sin devolver - reservas activas vigentes
const SQL_LIBRO = `
  SELECT l.id, l.titulo, a.nombre AS autor, l.categoria_id, c.nombre AS categoria, c.codigo AS categoria_codigo,
         l.descripcion, l.portada_url, l.stock_total,
         GREATEST(0, CAST(l.stock_total AS SIGNED)
           - (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id AND pi.devuelto_en IS NULL)
           - (SELECT COUNT(*) FROM reservas r WHERE r.libro_id = l.id AND r.estado = 'activa' AND r.fecha_limite > NOW())
         ) AS disponibles
  FROM libros l
  JOIN autores a ON a.id = l.autor_id
  JOIN categorias c ON c.id = l.categoria_id`;

async function obtenerLibro(id, conn = pool) {
  const [filas] = await conn.query(`${SQL_LIBRO} WHERE l.id = ? AND l.activo = 1`, [id]);
  return filas[0] || null;
}

/** Busca el autor por nombre o lo crea; devuelve su id. */
async function autorId(nombre, conn = pool) {
  const [r] = await conn.query(
    'INSERT INTO autores (nombre) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [nombre]);
  return r.insertId;
}

/** Cuántos ejemplares están ocupados (prestados + reservados vigentes). */
async function ejemplaresEnUso(libroId, conn = pool) {
  const [[r]] = await conn.query(
    `SELECT
       (SELECT COUNT(*) FROM prestamo_items WHERE libro_id = ? AND devuelto_en IS NULL) +
       (SELECT COUNT(*) FROM reservas WHERE libro_id = ? AND estado = 'activa' AND fecha_limite > NOW()) AS usados`,
    [libroId, libroId]);
  return Number(r.usados);
}

module.exports = { SQL_LIBRO, obtenerLibro, autorId, ejemplaresEnUso };
