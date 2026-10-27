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

/** Agrega a cada libro la lista `categorias` (la principal primero, después las adicionales). */
async function conCategorias(libros, conn = pool) {
  if (!libros.length) return libros;
  const [filas] = await conn.query(
    `SELECT l.id AS libro_id, c.id, c.nombre, c.codigo, c.color, c.icono,
            (c.id = l.categoria_id) AS principal
     FROM libros l
     JOIN categorias c ON c.id = l.categoria_id
        OR EXISTS (SELECT 1 FROM libro_categorias lc WHERE lc.libro_id = l.id AND lc.categoria_id = c.id)
     WHERE l.id IN (?) ORDER BY principal DESC, c.nombre`, [libros.map((l) => l.id)]);
  return libros.map((l) => ({
    ...l,
    categorias: filas.filter((f) => f.libro_id === l.id).map(({ id, nombre, codigo, color, icono }) => ({ id, nombre, codigo, color, icono })),
  }));
}

async function obtenerLibro(id, conn = pool) {
  const [filas] = await conn.query(`${SQL_LIBRO} WHERE l.id = ? AND l.activo = 1`, [id]);
  return filas[0] ? (await conCategorias([filas[0]], conn))[0] : null;
}

/** Condición SQL: el libro `l` pertenece a la categoría `?` (principal o adicional). */
const EN_CATEGORIA = '(l.categoria_id = ? OR EXISTS (SELECT 1 FROM libro_categorias lc WHERE lc.libro_id = l.id AND lc.categoria_id = ?))';

/** Reemplaza las categorías de un libro: la primera queda como principal. */
async function guardarCategorias(libroId, ids, conn = pool) {
  const unicas = [...new Set(ids)];
  const [ok] = await conn.query('SELECT id FROM categorias WHERE id IN (?)', [unicas]);
  if (ok.length !== unicas.length) return false;
  await conn.query('UPDATE libros SET categoria_id = ? WHERE id = ?', [unicas[0], libroId]);
  await conn.query('DELETE FROM libro_categorias WHERE libro_id = ?', [libroId]);
  const extras = unicas.slice(1);
  if (extras.length) await conn.query('INSERT INTO libro_categorias (libro_id, categoria_id) VALUES ?', [extras.map((c) => [libroId, c])]);
  return true;
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

module.exports = { SQL_LIBRO, conCategorias, EN_CATEGORIA, guardarCategorias, obtenerLibro, autorId, ejemplaresEnUso };
