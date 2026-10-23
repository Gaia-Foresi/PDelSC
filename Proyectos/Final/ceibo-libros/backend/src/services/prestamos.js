// Lógica de préstamos: creación con control de stock, devoluciones y desbloqueo automático.
const { pool, transaccion } = require('../config/db');
const { reglas } = require('../config/env');
const { err } = require('../utils/httpError');
const { hoy, sumarDias, diasEntre } = require('../utils/fechas');
const { crearNotificacion } = require('./notificaciones');
const { codigoRetiroUnico } = require('../utils/codigos');
const { publica } = require('./visitas');

const SQL_PRESTAMO = `
  SELECT p.id, p.usuario_id, p.fecha_inicio, p.fecha_vencimiento, p.estado, p.cerrado_en, p.visita_en, p.codigo_retiro,
         u.nombre AS unombre, u.apellido AS uapellido, u.email AS uemail, u.curso AS ucurso, u.dni AS udni,
         CONCAT(s.nombre, ' ', s.apellido) AS registrado_por
  FROM prestamos p
  JOIN usuarios u ON u.id = p.usuario_id
  JOIN usuarios s ON s.id = p.registrado_por`;

/** Carga préstamos (con sus libros) que cumplen `where`. Calcula `vencido` y `dias_restantes`. */
async function cargarPrestamos(where = '', params = [], { limite = 200, conn = pool } = {}) {
  const [filas] = await conn.query(`${SQL_PRESTAMO} ${where} ORDER BY p.id DESC LIMIT ${Number(limite)}`, params);
  if (!filas.length) return [];

  const [items] = await conn.query(
    `SELECT pi.prestamo_id, pi.libro_id, l.titulo, a.nombre AS autor, pi.devuelto_en
     FROM prestamo_items pi
     JOIN libros l ON l.id = pi.libro_id
     JOIN autores a ON a.id = l.autor_id
     WHERE pi.prestamo_id IN (?) ORDER BY pi.id`, [filas.map((f) => f.id)]);

  const hoyStr = hoy();
  return filas.map((f) => ({
    id: f.id,
    usuario: { id: f.usuario_id, nombre: `${f.unombre} ${f.uapellido}`.trim(), email: f.uemail, curso: f.ucurso, dni: f.udni },
    codigo_retiro: f.codigo_retiro,
    visita: publica(f.visita_en),
    registrado_por: f.registrado_por,
    fecha_inicio: f.fecha_inicio,
    fecha_vencimiento: f.fecha_vencimiento,
    estado: f.estado,
    vencido: f.estado === 'activo' && f.fecha_vencimiento < hoyStr,
    dias_restantes: f.estado === 'activo' ? diasEntre(hoyStr, f.fecha_vencimiento) : null,
    items: items
      .filter((i) => i.prestamo_id === f.id)
      .map((i) => ({ libro_id: i.libro_id, titulo: i.titulo, autor: i.autor, devuelto_en: i.devuelto_en })),
  }));
}

async function obtenerPrestamo(id, conn = pool) {
  const [p] = await cargarPrestamos('WHERE p.id = ?', [id], { conn });
  return p || null;
}

/**
 * Verifica (con bloqueo de filas) que cada libro exista, esté activo y tenga ejemplares libres.
 * Debe llamarse dentro de una transacción.
 */
async function verificarStock(conn, libroIds) {
  const [filas] = await conn.query(
    `SELECT l.id, l.titulo, l.activo,
        CAST(l.stock_total AS SIGNED)
          - (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id AND pi.devuelto_en IS NULL)
          - (SELECT COUNT(*) FROM reservas r WHERE r.libro_id = l.id AND r.estado = 'activa' AND r.fecha_limite > NOW())
          AS disponibles
     FROM libros l WHERE l.id IN (?) FOR UPDATE`, [libroIds]);
  if (filas.length !== libroIds.length || filas.some((f) => !f.activo)) throw err.noEncontrado('Alguno de los libros');
  const sinStock = filas.find((f) => Number(f.disponibles) < 1);
  if (sinStock) throw err.conflicto('SIN_STOCK', `No quedan ejemplares disponibles de "${sinStock.titulo}".`);
}

/** Si el usuario tenía reservas activas de estos libros, las da por cumplidas (libera el ejemplar reservado). */
const cumplirReservas = (conn, usuarioId, libroIds) =>
  conn.query("UPDATE reservas SET estado = 'cumplida' WHERE usuario_id = ? AND libro_id IN (?) AND estado = 'activa'", [usuarioId, libroIds]);

async function validarUsuarioParaPrestamo(conn, usuarioId) {
  const [[u]] = await conn.query('SELECT id, estado, motivo_bloqueo FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
  if (!u) throw err.noEncontrado('El usuario');
  if (u.estado === 'bloqueado') throw err.bloqueado(u.motivo_bloqueo);
}

/**
 * Guarda los datos del lector (nombre, apellido, curso, DNI) y, si `exigir`, verifica que no falte ninguno.
 * Son los datos que se piden en cada reserva o préstamo.
 */
async function guardarDatosLector(conn, usuarioId, datos = {}, exigir = true) {
  const campos = {};
  for (const k of ['nombre', 'apellido', 'curso', 'dni']) if (datos[k]) campos[k] = datos[k];
  if (Object.keys(campos).length) await conn.query('UPDATE usuarios SET ? WHERE id = ?', [campos, usuarioId]);
  if (!exigir) return;
  const [[u]] = await conn.query('SELECT nombre, apellido, curso, dni FROM usuarios WHERE id = ?', [usuarioId]);
  const faltan = {};
  if (!u.apellido) faltan.apellido = 'Obligatorio';
  if (!u.curso) faltan.curso = 'Obligatorio';
  if (!u.dni) faltan.dni = 'Obligatorio';
  if (Object.keys(faltan).length) throw err.validacion('Faltan datos del lector: completá apellido, curso y DNI.', faltan);
}

/** Crea un préstamo con uno o más libros. `codigo` permite conservar el de la reserva de origen. */
async function crearPrestamo({ usuarioId, libroIds, dias, staffId, datos, codigo, visita, exigirDatos = true }) {
  const ids = [...new Set(libroIds)];
  if (ids.length > reglas.prestamoMaxLibros) {
    throw err.conflicto('LIMITE_ALCANZADO', `Un préstamo admite hasta ${reglas.prestamoMaxLibros} libros.`);
  }
  const id = await transaccion(async (conn) => {
    await validarUsuarioParaPrestamo(conn, usuarioId);
    await guardarDatosLector(conn, usuarioId, datos, exigirDatos);
    await cumplirReservas(conn, usuarioId, ids);
    await verificarStock(conn, ids);

    const inicio = hoy();
    const [r] = await conn.query(
      'INSERT INTO prestamos (usuario_id, registrado_por, fecha_inicio, fecha_vencimiento, visita_en, codigo_retiro) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, staffId, inicio, sumarDias(inicio, dias || reglas.prestamoDiasDefecto), visita || new Date(), codigo || await codigoRetiroUnico(conn)]);
    await conn.query('INSERT INTO prestamo_items (prestamo_id, libro_id) VALUES ?', [ids.map((l) => [r.insertId, l])]);
    return r.insertId;
  });
  return obtenerPrestamo(id);
}

/** Agrega libros a un préstamo abierto. */
async function agregarLibros({ prestamoId, libroIds }) {
  const ids = [...new Set(libroIds)];
  await transaccion(async (conn) => {
    const [[p]] = await conn.query('SELECT id, usuario_id, estado FROM prestamos WHERE id = ? FOR UPDATE', [prestamoId]);
    if (!p) throw err.noEncontrado('El préstamo');
    if (p.estado !== 'activo') throw err.estado('El préstamo ya está cerrado.');
    await validarUsuarioParaPrestamo(conn, p.usuario_id);

    const [existentes] = await conn.query('SELECT libro_id, devuelto_en FROM prestamo_items WHERE prestamo_id = ?', [prestamoId]);
    if (existentes.some((e) => ids.includes(e.libro_id))) {
      throw err.conflicto('LIBRO_DUPLICADO', 'Alguno de esos libros ya figura en este préstamo.');
    }
    const abiertos = existentes.filter((e) => !e.devuelto_en).length;
    if (abiertos + ids.length > reglas.prestamoMaxLibros) {
      throw err.conflicto('LIMITE_ALCANZADO', `Un préstamo admite hasta ${reglas.prestamoMaxLibros} libros a la vez.`);
    }

    await cumplirReservas(conn, p.usuario_id, ids);
    await verificarStock(conn, ids);
    await conn.query('INSERT INTO prestamo_items (prestamo_id, libro_id) VALUES ?', [ids.map((l) => [prestamoId, l])]);
  });
  return obtenerPrestamo(prestamoId);
}

/**
 * Registra la devolución de un libro (o de todos). Cierra el préstamo si no quedan libros
 * y, si el usuario estaba bloqueado y ya no debe nada, lo desbloquea automáticamente.
 */
async function devolver({ prestamoId, libroId }) {
  let desbloqueado = false;
  await transaccion(async (conn) => {
    const [[p]] = await conn.query('SELECT id, usuario_id, estado FROM prestamos WHERE id = ? FOR UPDATE', [prestamoId]);
    if (!p) throw err.noEncontrado('El préstamo');
    if (p.estado !== 'activo') throw err.estado('El préstamo ya está cerrado.');

    const [r] = await conn.query(
      `UPDATE prestamo_items SET devuelto_en = NOW() WHERE prestamo_id = ? AND devuelto_en IS NULL ${libroId ? 'AND libro_id = ?' : ''}`,
      libroId ? [prestamoId, libroId] : [prestamoId]);
    if (r.affectedRows === 0) throw err.estado('Ese libro ya fue devuelto o no pertenece al préstamo.');

    const [[{ pendientes }]] = await conn.query(
      'SELECT COUNT(*) AS pendientes FROM prestamo_items WHERE prestamo_id = ? AND devuelto_en IS NULL', [prestamoId]);
    if (Number(pendientes) === 0) {
      await conn.query("UPDATE prestamos SET estado = 'cerrado', cerrado_en = NOW() WHERE id = ?", [prestamoId]);
    }

    desbloqueado = await desbloquearSiNoDebe(conn, p.usuario_id);
  });
  return { prestamo: await obtenerPrestamo(prestamoId), usuario_desbloqueado: desbloqueado };
}

/** Desbloquea al usuario si no le queda ningún libro sin devolver. */
async function desbloquearSiNoDebe(conn, usuarioId) {
  const [[u]] = await conn.query('SELECT estado FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
  if (!u || u.estado !== 'bloqueado') return false;

  const [[{ debe }]] = await conn.query(
    `SELECT COUNT(*) AS debe FROM prestamo_items pi JOIN prestamos p ON p.id = pi.prestamo_id
     WHERE p.usuario_id = ? AND pi.devuelto_en IS NULL`, [usuarioId]);
  if (Number(debe) > 0) return false;

  await conn.query("UPDATE usuarios SET estado = 'activo', motivo_bloqueo = NULL, bloqueado_en = NULL WHERE id = ?", [usuarioId]);
  await crearNotificacion({
    usuarioId, tipo: 'desbloqueo', titulo: 'Cuenta habilitada',
    cuerpo: 'Gracias por devolver los libros. Ya podés volver a reservar y pedir préstamos.',
  }, conn);
  return true;
}

module.exports = { guardarDatosLector, cargarPrestamos, obtenerPrestamo, crearPrestamo, agregarLibros, devolver, desbloquearSiNoDebe };
