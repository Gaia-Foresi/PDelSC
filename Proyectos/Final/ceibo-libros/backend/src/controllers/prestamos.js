// Préstamos y reservas. La lógica de stock y desbloqueo vive en services/prestamos.js.
const { consultar, transaccion } = require('../config/db');
const { reglas } = require('../config/env');
const { err } = require('../utils/httpError');
const { hoy, sumarDias } = require('../utils/fechas');
const { esStaff } = require('../middlewares/roles');
const P = require('../services/prestamos');
const R = require('../services/reservas');
const { crearNotificacion } = require('../services/notificaciones');
const { codigoRetiroUnico } = require('../utils/codigos');
const V = require('../services/visitas');

// ------------------------------------------------------------------ préstamos
exports.prestamosCrear = async (req, res) => {
  const { usuario_id, libro_ids, dias, nombre, apellido, curso, dni, visita } = req.body;
  const prestamo = await P.crearPrestamo({
    usuarioId: usuario_id, libroIds: libro_ids, dias, staffId: req.usuario.id, datos: { nombre, apellido, curso, dni },
    visita: V.visitaPrestamo(visita),
  });
  res.status(201).json({ ok: true, data: { prestamo } });
};

exports.prestamosMis = async (req, res) => {
  res.json({ ok: true, data: { prestamos: await P.cargarPrestamos('WHERE p.usuario_id = ?', [req.usuario.id]) } });
};

exports.prestamosListar = async (req, res) => {
  const { estado, usuario_id, q } = req.body;
  const donde = [];
  const params = [];
  const hoyStr = hoy();
  if (estado === 'cerrado') donde.push("p.estado = 'cerrado'");
  if (estado === 'activo') { donde.push("p.estado = 'activo' AND p.fecha_vencimiento >= ?"); params.push(hoyStr); }
  if (estado === 'vencido') { donde.push("p.estado = 'activo' AND p.fecha_vencimiento < ?"); params.push(hoyStr); }
  if (usuario_id) { donde.push('p.usuario_id = ?'); params.push(usuario_id); }
  if (q) {
    const like = `%${q}%`;
    donde.push(`(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ? OR CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR p.codigo_retiro = ? OR u.dni LIKE ?
      OR EXISTS (SELECT 1 FROM prestamo_items pi JOIN libros l ON l.id = pi.libro_id WHERE pi.prestamo_id = p.id AND l.titulo LIKE ?))`);
    params.push(like, like, like, like, q.toUpperCase(), like, like);
  }
  const prestamos = await P.cargarPrestamos(donde.length ? `WHERE ${donde.join(' AND ')}` : '', params);
  res.json({ ok: true, data: { prestamos } });
};

exports.prestamosDetalle = async (req, res) => {
  const prestamo = await P.obtenerPrestamo(req.body.id);
  if (!prestamo) throw err.noEncontrado('El préstamo');
  if (!esStaff(req.usuario) && prestamo.usuario.id !== req.usuario.id) throw err.noEncontrado('El préstamo'); // no revela que existe
  res.json({ ok: true, data: { prestamo } });
};

exports.prestamosAgregarLibros = async (req, res) => {
  const prestamo = await P.agregarLibros({ prestamoId: req.body.prestamo_id, libroIds: req.body.libro_ids });
  res.json({ ok: true, data: { prestamo } });
};

exports.prestamosDevolver = async (req, res) => {
  const { prestamo_id, libro_id } = req.body;
  res.json({ ok: true, data: await P.devolver({ prestamoId: prestamo_id, libroId: libro_id }) });
};

exports.prestamosExtender = async (req, res) => {
  const { prestamo_id, dias } = req.body;
  const antes = await P.obtenerPrestamo(prestamo_id);
  if (!antes) throw err.noEncontrado('El préstamo');
  if (antes.estado !== 'activo') throw err.estado('El préstamo ya está cerrado.');

  await consultar('UPDATE prestamos SET fecha_vencimiento = ? WHERE id = ?', [sumarDias(antes.fecha_vencimiento, dias), prestamo_id]);
  const prestamo = await P.obtenerPrestamo(prestamo_id);

  // Si estaba vencido y la prórroga lo regulariza, se levanta el bloqueo (siempre que no tenga otro vencido)
  if (antes.vencido && !prestamo.vencido) {
    await transaccion(async (conn) => {
      const [[{ otros }]] = await conn.query(
        "SELECT COUNT(*) AS otros FROM prestamos WHERE usuario_id = ? AND estado = 'activo' AND fecha_vencimiento < ?", [antes.usuario.id, hoy()]);
      if (Number(otros) === 0) {
        const [r] = await conn.query(
          "UPDATE usuarios SET estado = 'activo', motivo_bloqueo = NULL, bloqueado_en = NULL WHERE id = ? AND estado = 'bloqueado'", [antes.usuario.id]);
        if (r.affectedRows) {
          await crearNotificacion({
            usuarioId: antes.usuario.id, tipo: 'desbloqueo', titulo: 'Cuenta habilitada',
            cuerpo: 'La biblioteca extendió tu plazo de devolución. Ya podés volver a usar el servicio.',
          }, conn);
        }
      }
    });
  }
  res.json({ ok: true, data: { prestamo } });
};

// -------------------------------------------------------------------- reservas
exports.reservasHorarios = async (req, res) => {
  res.json({ ok: true, data: { dias: V.horariosAgrupados(req.body.tipo) } });
};

exports.reservasCrear = async (req, res) => {
  const { libro_id, tipo, nombre, apellido, curso, dni, visita } = req.body;
  if (req.usuario.estado === 'bloqueado') throw err.bloqueado(req.usuario.motivo_bloqueo);

  const turno = V.validarVisitaReserva(visita, tipo); // día y hora en que va a ir a la biblioteca
  const id = await transaccion(async (conn) => {
    const [[libro]] = await conn.query('SELECT id, titulo, activo, stock_total FROM libros WHERE id = ? FOR UPDATE', [libro_id]);
    if (!libro || !libro.activo) throw err.noEncontrado('El libro');

    const [[{ activas }]] = await conn.query(
      "SELECT COUNT(*) AS activas FROM reservas WHERE usuario_id = ? AND estado = 'activa' AND fecha_limite > NOW()", [req.usuario.id]);
    if (Number(activas) >= reglas.reservasMaxActivas) {
      throw err.conflicto('LIMITE_ALCANZADO', `Ya tenés ${reglas.reservasMaxActivas} reservas activas. Cancelá alguna o retirá tus libros.`);
    }
    const [dup] = await conn.query(
      "SELECT id FROM reservas WHERE usuario_id = ? AND libro_id = ? AND estado = 'activa' AND fecha_limite > NOW()", [req.usuario.id, libro_id]);
    if (dup.length) throw err.conflicto('YA_RESERVADO', 'Ya reservaste este libro.');

    const [[{ disponibles }]] = await conn.query(
      `SELECT CAST(? AS SIGNED)
         - (SELECT COUNT(*) FROM prestamo_items WHERE libro_id = ? AND devuelto_en IS NULL)
         - (SELECT COUNT(*) FROM reservas WHERE libro_id = ? AND estado = 'activa' AND fecha_limite > NOW()) AS disponibles`,
      [libro.stock_total, libro_id, libro_id]);
    if (Number(disponibles) < 1) throw err.conflicto('SIN_STOCK', `No quedan ejemplares disponibles de "${libro.titulo}".`);

    // Datos del lector (se piden en cada reserva y quedan guardados en su perfil)
    await P.guardarDatosLector(conn, req.usuario.id, { nombre, apellido, curso, dni }, true);
    const [r] = await conn.query(
      'INSERT INTO reservas (usuario_id, libro_id, tipo, fecha_limite, visita_en, codigo_retiro) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id, libro_id, tipo, turno.limite, turno.visita, await codigoRetiroUnico(conn)]);
    return r.insertId;
  });
  res.status(201).json({ ok: true, data: { reserva: await R.obtenerReserva(id) } });
};

exports.reservasMis = async (req, res) => {
  await R.expirarReservas();
  const { estado } = req.body;
  const donde = ['r.usuario_id = ?'];
  const params = [req.usuario.id];
  if (estado) { donde.push('r.estado = ?'); params.push(estado); }
  res.json({ ok: true, data: { reservas: await R.listarReservas(`WHERE ${donde.join(' AND ')}`, params) } });
};

exports.reservasListar = async (req, res) => {
  await R.expirarReservas();
  const { estado, q } = req.body;
  const donde = [];
  const params = [];
  if (estado) { donde.push('r.estado = ?'); params.push(estado); }
  if (q) {
    const like = `%${q}%`;
    donde.push("(l.titulo LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR r.codigo_retiro = ? OR u.dni LIKE ?)");
    params.push(like, like, like, like, q.toUpperCase(), like);
  }
  res.json({ ok: true, data: { reservas: await R.listarReservas(donde.length ? `WHERE ${donde.join(' AND ')}` : '', params) } });
};

exports.reservasCancelar = async (req, res) => {
  const reserva = await R.obtenerReserva(req.body.id);
  if (!reserva || (!esStaff(req.usuario) && reserva.usuario.id !== req.usuario.id)) throw err.noEncontrado('La reserva');
  if (reserva.estado !== 'activa') throw err.estado('Esa reserva ya no está activa.');
  await consultar("UPDATE reservas SET estado = 'cancelada' WHERE id = ? AND estado = 'activa'", [reserva.id]);
  res.json({ ok: true, data: { reserva: await R.obtenerReserva(reserva.id) } });
};

exports.reservasAtender = async (req, res) => {
  const { id, dias } = req.body;
  await R.expirarReservas();
  const reserva = await R.obtenerReserva(id);
  if (!reserva) throw err.noEncontrado('La reserva');
  if (reserva.estado !== 'activa') throw err.estado('Esa reserva ya no está activa (venció, se canceló o ya se atendió).');

  if (reserva.tipo === 'sala') {
    await consultar("UPDATE reservas SET estado = 'cumplida' WHERE id = ?", [id]);
    return res.json({ ok: true, data: { reserva: await R.obtenerReserva(id) } });
  }
  // Retiro: se crea el préstamo (que además marca la reserva como cumplida y libera el ejemplar reservado)
  const prestamo = await P.crearPrestamo({
    usuarioId: reserva.usuario.id, libroIds: [reserva.libro.id], dias, staffId: req.usuario.id,
    visita: reserva.visita ? new Date(reserva.visita.en) : undefined,
    codigo: reserva.codigo_retiro, exigirDatos: false, // el préstamo conserva el código que ya recibió el lector
  });
  res.json({ ok: true, data: { reserva: await R.obtenerReserva(id), prestamo } });
};

