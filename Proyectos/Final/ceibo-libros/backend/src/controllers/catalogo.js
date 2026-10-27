// Categorías y libros (stock). "Eliminar" es siempre una baja lógica o falla si el elemento está en uso.
const { buscarPortada } = require('../services/portadas');
const { pool, consultar } = require('../config/db');
const { err } = require('../utils/httpError');
const { SQL_LIBRO, conCategorias, EN_CATEGORIA, guardarCategorias, obtenerLibro, autorId, ejemplaresEnUso } = require('../services/libros');

// ---------------------------------------------------------------- categorías
const SQL_CATEGORIA = `
  SELECT c.id, c.codigo, c.nombre, c.descripcion, c.icono, c.color,
         (SELECT COUNT(*) FROM libros l WHERE l.activo = 1 AND (l.categoria_id = c.id OR EXISTS (SELECT 1 FROM libro_categorias lc WHERE lc.libro_id = l.id AND lc.categoria_id = c.id))) AS total_libros
  FROM categorias c`;

const categoriaPorId = async (id) => {
  const [c] = await consultar(`${SQL_CATEGORIA} WHERE c.id = ?`, [id]);
  return c ? { ...c, total_libros: Number(c.total_libros) } : null;
};

exports.categoriasListar = async (req, res) => {
  const filas = await consultar(`${SQL_CATEGORIA} ORDER BY c.id`);
  res.json({ ok: true, data: { categorias: filas.map((c) => ({ ...c, total_libros: Number(c.total_libros) })) } });
};

exports.categoriasCrear = async (req, res) => {
  const { codigo, nombre, descripcion, icono, color } = req.body;
  const r = await consultar(
    'INSERT INTO categorias (codigo, nombre, descripcion, icono, color) VALUES (?, ?, ?, ?, ?)',
    [codigo, nombre, descripcion || null, icono || 'book-open-page-variant', color || '#8FAE8B']);
  res.status(201).json({ ok: true, data: { categoria: await categoriaPorId(r.insertId) } });
};

exports.categoriasActualizar = async (req, res) => {
  const { id, ...resto } = req.body;
  const campos = Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined));
  if (!(await categoriaPorId(id))) throw err.noEncontrado('La categoría');
  if (Object.keys(campos).length) await consultar('UPDATE categorias SET ? WHERE id = ?', [campos, id]);
  res.json({ ok: true, data: { categoria: await categoriaPorId(id) } });
};

exports.categoriasEliminar = async (req, res) => {
  const { id } = req.body;
  if (!(await categoriaPorId(id))) throw err.noEncontrado('La categoría');
  const [{ total }] = await consultar('SELECT (SELECT COUNT(*) FROM libros WHERE categoria_id = ?) + (SELECT COUNT(*) FROM libro_categorias WHERE categoria_id = ?) AS total', [id, id]);
  if (total > 0) throw err.conflicto('CATEGORIA_CON_LIBROS', 'No se puede eliminar: la categoría todavía tiene libros. Movelos a otra categoría primero.');
  await consultar('DELETE FROM categorias WHERE id = ?', [id]);
  res.json({ ok: true, data: { eliminado: true } });
};

// -------------------------------------------------------------------- libros
exports.librosListar = async (req, res) => {
  const { categoria_id, q, solo_disponibles } = req.body;
  const donde = ['l.activo = 1'];
  const params = [];
  if (categoria_id) { donde.push(EN_CATEGORIA); params.push(categoria_id, categoria_id); }
  if (q) { donde.push('(l.titulo LIKE ? OR a.nombre LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const filtroStock = solo_disponibles ? 'WHERE t.disponibles > 0' : '';
  const [filas] = await pool.query(
    `SELECT t.* FROM (${SQL_LIBRO} WHERE ${donde.join(' AND ')}) t ${filtroStock} ORDER BY t.titulo LIMIT 500`, params);
  const libros = await conCategorias(filas.map((l) => ({ ...l, disponibles: Number(l.disponibles) })));
  res.json({ ok: true, data: { libros } });
};

const normalizar = (l) => (l ? { ...l, disponibles: Number(l.disponibles) } : l);

exports.librosDetalle = async (req, res) => {
  const libro = await obtenerLibro(req.body.id);
  if (!libro) throw err.noEncontrado('El libro');
  res.json({ ok: true, data: { libro: normalizar(libro) } });
};

/** Las últimas 10 personas que usaron el libro, con fecha de retiro y de devolución (solo personal). */
exports.librosHistorial = async (req, res) => {
  const libro = await obtenerLibro(req.body.id);
  if (!libro) throw err.noEncontrado('El libro');
  const filas = await consultar(
    `SELECT pi.id, p.id AS prestamo_id, u.id AS usuario_id, CONCAT(u.nombre, ' ', u.apellido) AS persona,
            p.fecha_inicio AS retirado, pi.devuelto_en AS devuelto
     FROM prestamo_items pi
     JOIN prestamos p ON p.id = pi.prestamo_id
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE pi.libro_id = ? ORDER BY pi.id DESC LIMIT 10`, [req.body.id]);
  res.json({ ok: true, data: { historial: filas } });
};

exports.librosCrear = async (req, res) => {
  const { titulo, autor, categoria_id, categoria_ids, descripcion, stock_total, portada_url } = req.body;
  const cats = categoria_ids?.length ? categoria_ids : [categoria_id];
  if (!cats[0]) throw err.validacion('Elegí al menos una categoría.', { categoria_ids: 'Obligatorio' });
  const id = await autorId(autor);
  // Si no se cargó una portada, se busca sola en internet (queda guardado el link, no la imagen)
  const portada = portada_url || await buscarPortada(titulo, autor);
  const r = await consultar(
    'INSERT INTO libros (titulo, autor_id, categoria_id, descripcion, portada_url, stock_total) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo, id, cats[0], descripcion || null, portada || null, stock_total]);
  if (!(await guardarCategorias(r.insertId, cats))) {
    await consultar('DELETE FROM libros WHERE id = ?', [r.insertId]);
    throw err.validacion('Alguna de las categorías no existe.', { categoria_ids: 'Categoría inválida' });
  }
  res.status(201).json({ ok: true, data: { libro: normalizar(await obtenerLibro(r.insertId)) } });
};

exports.librosActualizar = async (req, res) => {
  const { id, autor, categoria_ids, ...resto } = req.body;
  const actual = await obtenerLibro(id);
  if (!actual) throw err.noEncontrado('El libro');
  const cats = categoria_ids?.length ? categoria_ids : (resto.categoria_id ? [resto.categoria_id] : null);
  delete resto.categoria_id; // las categorías se guardan aparte

  const campos = Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined));
  if ('descripcion' in campos) campos.descripcion = campos.descripcion || null;
  if ('portada_url' in campos) campos.portada_url = campos.portada_url || null;
  if (autor) campos.autor_id = await autorId(autor);
  // Si el libro queda sin portada, se intenta encontrarla automáticamente
  if (('portada_url' in campos && !campos.portada_url) || (!('portada_url' in campos) && !actual.portada_url)) {
    const encontrada = await buscarPortada(campos.titulo || actual.titulo, autor || actual.autor);
    if (encontrada) campos.portada_url = encontrada;
  }

  if (campos.stock_total !== undefined) {
    const enUso = await ejemplaresEnUso(id);
    if (campos.stock_total < enUso) {
      throw err.conflicto('LIBRO_EN_USO', `No podés dejar el stock en ${campos.stock_total}: hay ${enUso} ejemplar(es) prestados o reservados.`);
    }
  }
  if (Object.keys(campos).length) await consultar('UPDATE libros SET ? WHERE id = ?', [campos, id]);
  if (cats && !(await guardarCategorias(id, cats))) throw err.validacion('Alguna de las categorías no existe.', { categoria_ids: 'Categoría inválida' });
  res.json({ ok: true, data: { libro: normalizar(await obtenerLibro(id)) } });
};

exports.librosBuscarPortada = async (req, res) => {
  const url = await buscarPortada(req.body.titulo, req.body.autor);
  res.json({ ok: true, data: { portada_url: url } });
};

exports.librosEliminar = async (req, res) => {
  const { id } = req.body;
  if (!(await obtenerLibro(id))) throw err.noEncontrado('El libro');
  if ((await ejemplaresEnUso(id)) > 0) {
    throw err.conflicto('LIBRO_EN_USO', 'No se puede eliminar: el libro está prestado o reservado en este momento.');
  }
  await consultar('UPDATE libros SET activo = 0 WHERE id = ?', [id]); // baja lógica: conserva el historial de préstamos
  res.json({ ok: true, data: { eliminado: true } });
};
