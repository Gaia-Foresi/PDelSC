// Notificaciones, distribuidoras / reposición de stock y estadísticas.
const { consultar, transaccion } = require('../config/db');
const { err } = require('../utils/httpError');
const { hoy } = require('../utils/fechas');
const { enviarEmail, plantilla, escapar } = require('../services/mailer');

// ------------------------------------------------------------ notificaciones
exports.notifListar = async (req, res) => {
  const filas = await consultar(
    `SELECT id, tipo, titulo, cuerpo, leida, creada_en FROM notificaciones
     WHERE usuario_id = ? ${req.body.solo_no_leidas ? 'AND leida = 0' : ''} ORDER BY id DESC LIMIT 100`, [req.usuario.id]);
  res.json({ ok: true, data: { notificaciones: filas.map((n) => ({ ...n, leida: !!n.leida })) } });
};

exports.notifMarcarLeidas = async (req, res) => {
  const { ids } = req.body;
  const r = ids?.length
    ? await consultar('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0 AND id IN (?)', [req.usuario.id, ids])
    : await consultar('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0', [req.usuario.id]);
  res.json({ ok: true, data: { marcadas: r.affectedRows } });
};

exports.notifCantidad = async (req, res) => {
  const [{ total }] = await consultar('SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = 0', [req.usuario.id]);
  res.json({ ok: true, data: { total: Number(total) } });
};

// ------------------------------------------------------------ distribuidoras
const SQL_DIST = 'SELECT id, nombre, email, telefono FROM distribuidoras WHERE activo = 1';

exports.distListar = async (req, res) => {
  res.json({ ok: true, data: { distribuidoras: await consultar(`${SQL_DIST} ORDER BY nombre`) } });
};

const distPorId = async (id) => (await consultar(`${SQL_DIST} AND id = ?`, [id]))[0];

exports.distCrear = async (req, res) => {
  const { nombre, email, telefono } = req.body;
  const r = await consultar('INSERT INTO distribuidoras (nombre, email, telefono) VALUES (?, ?, ?)', [nombre, email, telefono || null]);
  res.status(201).json({ ok: true, data: { distribuidora: await distPorId(r.insertId) } });
};

exports.distActualizar = async (req, res) => {
  const { id, ...resto } = req.body;
  if (!(await distPorId(id))) throw err.noEncontrado('La distribuidora');
  const campos = Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined));
  if ('telefono' in campos) campos.telefono = campos.telefono || null;
  if (Object.keys(campos).length) await consultar('UPDATE distribuidoras SET ? WHERE id = ?', [campos, id]);
  res.json({ ok: true, data: { distribuidora: await distPorId(id) } });
};

exports.distEliminar = async (req, res) => {
  if (!(await distPorId(req.body.id))) throw err.noEncontrado('La distribuidora');
  await consultar('UPDATE distribuidoras SET activo = 0 WHERE id = ?', [req.body.id]); // baja lógica: conserva el historial de pedidos
  res.json({ ok: true, data: { eliminado: true } });
};

// ---------------------------------------------------------------- reposición
exports.reposicionCrear = async (req, res) => {
  const { distribuidora_id, mensaje, items } = req.body;
  const dist = await distPorId(distribuidora_id);
  if (!dist) throw err.noEncontrado('La distribuidora');

  // Resolver títulos de los libros existentes
  const ids = items.filter((i) => i.libro_id).map((i) => i.libro_id);
  const libros = ids.length
    ? await consultar('SELECT l.id, l.titulo, a.nombre AS autor FROM libros l JOIN autores a ON a.id = l.autor_id WHERE l.id IN (?) AND l.activo = 1', [ids])
    : [];
  if (libros.length !== new Set(ids).size) throw err.noEncontrado('Alguno de los libros');
  const lineas = items.map((i) => {
    const l = i.libro_id ? libros.find((x) => x.id === i.libro_id) : null;
    return { libro_id: i.libro_id || null, titulo_solicitado: l ? null : i.titulo, texto: l ? `${l.titulo} (${l.autor})` : i.titulo, cantidad: i.cantidad };
  });

  const [{ nombre, apellido }] = await consultar('SELECT nombre, apellido FROM usuarios WHERE id = ?', [req.usuario.id]);
  const firmante = `${nombre} ${apellido}`.trim();
  const texto = [
    `Hola ${dist.nombre}, desde Ceibo Libros · Biblioteca queremos reponer el siguiente stock:`, '',
    ...lineas.map((l) => `- ${l.cantidad} x ${l.texto}`),
    ...(mensaje ? ['', mensaje] : []), '', `Saludos, ${firmante}`,
  ].join('\n');
  const html = plantilla('Pedido de reposición de stock',
    `<p>Hola ${escapar(dist.nombre)}, queremos reponer el siguiente stock:</p>
     <ul>${lineas.map((l) => `<li><b>${l.cantidad}</b> × ${escapar(l.texto)}</li>`).join('')}</ul>
     ${mensaje ? `<p>${escapar(mensaje)}</p>` : ''}<p>Saludos,<br>${escapar(firmante)}</p>`);

  let estado = 'enviado';
  let simulado = false;
  try {
    ({ simulado } = await enviarEmail({ para: dist.email, asunto: 'Pedido de reposición · Ceibo Libros', texto, html }));
  } catch (e) {
    console.error('[reposicion] email fallido:', e.message);
    estado = 'error';
  }

  const pedidoId = await transaccion(async (conn) => {
    const [p] = await conn.query(
      'INSERT INTO pedidos_reposicion (distribuidora_id, dueno_id, mensaje, estado_envio) VALUES (?, ?, ?, ?)',
      [distribuidora_id, req.usuario.id, mensaje || null, estado]);
    await conn.query('INSERT INTO pedido_items (pedido_id, libro_id, titulo_solicitado, cantidad) VALUES ?',
      [lineas.map((l) => [p.insertId, l.libro_id, l.titulo_solicitado, l.cantidad])]);
    return p.insertId;
  });
  res.status(201).json({ ok: true, data: { pedido: { id: pedidoId, estado_envio: estado, simulado } } });
};

exports.reposicionListar = async (req, res) => {
  const pedidos = await consultar(
    `SELECT p.id, p.mensaje, p.estado_envio, p.creado_en, d.nombre AS distribuidora
     FROM pedidos_reposicion p JOIN distribuidoras d ON d.id = p.distribuidora_id ORDER BY p.id DESC LIMIT 100`);
  const items = pedidos.length
    ? await consultar(
      `SELECT pi.pedido_id, pi.cantidad, COALESCE(l.titulo, pi.titulo_solicitado) AS titulo
       FROM pedido_items pi LEFT JOIN libros l ON l.id = pi.libro_id WHERE pi.pedido_id IN (?) ORDER BY pi.id`, [pedidos.map((p) => p.id)])
    : [];
  res.json({
    ok: true,
    data: { pedidos: pedidos.map((p) => ({ ...p, items: items.filter((i) => i.pedido_id === p.id).map(({ titulo, cantidad }) => ({ titulo, cantidad })) })) },
  });
};

// -------------------------------------------------------------- estadísticas
exports.resumen = async (req, res) => {
  const hoyStr = hoy();
  const [t] = await consultar(
    `SELECT
       (SELECT COUNT(*) FROM libros WHERE activo = 1) AS libros,
       (SELECT COALESCE(SUM(stock_total), 0) FROM libros WHERE activo = 1) AS ejemplares,
       (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'usuario') AS usuarios,
       (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'bibliotecario') AS bibliotecarios,
       (SELECT COUNT(*) FROM usuarios WHERE estado = 'bloqueado') AS bloqueados,
       (SELECT COUNT(*) FROM prestamos WHERE estado = 'activo') AS prestamos_activos,
       (SELECT COUNT(*) FROM prestamos WHERE estado = 'activo' AND fecha_vencimiento < ?) AS prestamos_vencidos,
       (SELECT COUNT(*) FROM reservas WHERE estado = 'activa' AND fecha_limite > NOW()) AS reservas_activas`, [hoyStr]);

  // Últimos 6 meses (incluye los meses sin préstamos, con 0)
  const [y, m] = hoyStr.split('-').map(Number);
  const meses = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const porMes = await consultar(
    "SELECT DATE_FORMAT(fecha_inicio, '%Y-%m') AS mes, COUNT(*) AS total FROM prestamos WHERE fecha_inicio >= ? GROUP BY mes", [`${meses[0]}-01`]);

  const masPrestados = await consultar(
    `SELECT l.titulo, COUNT(*) AS total FROM prestamo_items pi JOIN libros l ON l.id = pi.libro_id
     GROUP BY l.id, l.titulo ORDER BY total DESC, l.titulo LIMIT 5`);
  const porCategoria = await consultar(
    `SELECT c.nombre AS categoria, COUNT(pi.id) AS total
     FROM categorias c LEFT JOIN libros l ON (l.categoria_id = c.id OR EXISTS (SELECT 1 FROM libro_categorias lc WHERE lc.libro_id = l.id AND lc.categoria_id = c.id)) LEFT JOIN prestamo_items pi ON pi.libro_id = l.id
     GROUP BY c.id, c.nombre ORDER BY total DESC, c.nombre`);

  const num = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v)]));
  res.json({
    ok: true,
    data: {
      totales: num(t),
      prestamos_por_mes: meses.map((mes) => ({ mes, total: Number(porMes.find((x) => x.mes === mes)?.total || 0) })),
      libros_mas_prestados: masPrestados.map((x) => ({ titulo: x.titulo, total: Number(x.total) })),
      por_categoria: porCategoria.map((x) => ({ categoria: x.categoria, total: Number(x.total) })),
    },
  });
};

