// Perfil propio, seguridad de la cuenta y administración de usuarios (bloqueo y roles). Nunca se borran usuarios.
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { consultar } from '../config/db.js';
import { err } from '../utils/httpError.js';
import { usuarioPublico, SQL_USUARIO } from '../utils/serializers.js';
import { crearNotificacion } from '../services/notificaciones.js';
import { cargarPrestamos } from '../services/prestamos.js';
import { listarReservas } from '../services/reservas.js';

const cargar = async (id) => (await consultar(`${SQL_USUARIO} WHERE u.id = ?`, [id]))[0];

/** El bibliotecario solo gestiona usuarios comunes; el dueño gestiona a todos. */
function validarAlcance(actor, objetivo) {
  if (actor.rol === 'bibliotecario' && objetivo.rol !== 'usuario') {
    throw err.sinPermiso('Solo podés gestionar usuarios comunes.');
  }
}

export const perfil = async (req, res) => {
  const u = await cargar(req.usuario.id);
  const [{ prestamos_activos }] = await consultar(
    `SELECT COUNT(*) AS prestamos_activos FROM prestamo_items pi JOIN prestamos p ON p.id = pi.prestamo_id
     WHERE p.usuario_id = ? AND pi.devuelto_en IS NULL`, [u.id]);
  const [{ reservas_activas }] = await consultar(
    "SELECT COUNT(*) AS reservas_activas FROM reservas WHERE usuario_id = ? AND estado = 'activa' AND fecha_limite > NOW()", [u.id]);
  res.json({ ok: true, data: { usuario: usuarioPublico(u), resumen: { prestamos_activos, reservas_activas, reservas_max: env.reglas.reservasMaxActivas } } });
};

export const actualizarPerfil = async (req, res) => {
  const campos = {};
  for (const k of ['nombre', 'apellido', 'telefono', 'curso', 'dni', 'foto_url']) {
    if (req.body[k] !== undefined) campos[k] = req.body[k] === '' ? null : req.body[k];
  }
  if (campos.nombre === null) throw err.validacion('El nombre es obligatorio.', { nombre: 'Obligatorio' });
  if (campos.apellido === null) campos.apellido = '';
  if (Object.keys(campos).length) await consultar('UPDATE usuarios SET ? WHERE id = ?', [campos, req.usuario.id]);
  res.json({ ok: true, data: { usuario: usuarioPublico(await cargar(req.usuario.id)) } });
};

export const cambiarPassword = async (req, res) => {
  const { password_actual, password_nueva } = req.body;
  const [u] = await consultar('SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
  if (u.password_hash) {
    // Si ya tenía contraseña, hay que demostrar que la conoce.
    if (!password_actual || !(await bcrypt.compare(password_actual, u.password_hash))) {
      throw err.validacion('La contraseña actual no es correcta.', { password_actual: 'Contraseña incorrecta' });
    }
  }
  await consultar('UPDATE usuarios SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password_nueva, 10), req.usuario.id]);
  res.json({ ok: true, data: { actualizado: true } });
};

export const dosPasos = async (req, res) => {
  await consultar('UPDATE usuarios SET dos_pasos_activo = ? WHERE id = ?', [req.body.activar ? 1 : 0, req.usuario.id]);
  res.json({ ok: true, data: { usuario: usuarioPublico(await cargar(req.usuario.id)) } });
};

export const listar = async (req, res) => {
  const { q, rol, estado, pagina, limite } = req.body;
  const donde = [];
  const params = [];
  if (req.usuario.rol === 'bibliotecario') donde.push("r.nombre = 'usuario'");
  else if (rol) { donde.push('r.nombre = ?'); params.push(rol); }
  if (estado) { donde.push('u.estado = ?'); params.push(estado); }
  if (q) {
    const like = `%${q}%`;
    donde.push("(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ? OR CONCAT(u.nombre, ' ', u.apellido) LIKE ?)");
    params.push(like, like, like, like);
  }
  const W = donde.length ? `WHERE ${donde.join(' AND ')}` : '';

  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id ${W}`, params);
  const filas = await consultar(
    `SELECT x.*, (SELECT COUNT(*) FROM prestamo_items pi JOIN prestamos p ON p.id = pi.prestamo_id
                  WHERE p.usuario_id = x.id AND pi.devuelto_en IS NULL) AS prestamos_activos
     FROM (${SQL_USUARIO} ${W}) x ORDER BY x.nombre, x.apellido LIMIT ? OFFSET ?`,
    [...params, limite, (pagina - 1) * limite]);

  res.json({
    ok: true,
    // En los listados no se envían las fotos subidas (pesan); la app muestra las iniciales
    data: {
      usuarios: filas.map((f) => ({ ...usuarioPublico(f), foto_url: f.foto_url?.startsWith('data:') ? null : f.foto_url, prestamos_activos: Number(f.prestamos_activos) })),
      total,
    },
  });
};

export const detalle = async (req, res) => {
  const u = await cargar(req.body.id);
  if (!u) throw err.noEncontrado('El usuario');
  validarAlcance(req.usuario, u);
  const [prestamos, reservas] = await Promise.all([
    cargarPrestamos('WHERE p.usuario_id = ?', [u.id], { limite: 50 }),
    listarReservas('WHERE r.usuario_id = ?', [u.id]),
  ]);
  res.json({ ok: true, data: { usuario: usuarioPublico(u), prestamos, reservas } });
};

export const bloquear = async (req, res) => {
  const u = await cargar(req.body.id);
  if (!u) throw err.noEncontrado('El usuario');
  if (u.rol !== 'usuario') throw err.sinPermiso('Solo se pueden bloquear usuarios comunes.');
  const { tipo, motivo } = req.body;
  await consultar("UPDATE usuarios SET estado = 'bloqueado', motivo_bloqueo = ?, tipo_bloqueo = ?, bloqueado_en = NOW() WHERE id = ?", [motivo, tipo, u.id]);
  await crearNotificacion({
    usuarioId: u.id, tipo: 'bloqueo',
    titulo: tipo === 'dano' ? 'Cuenta bloqueada por daño a un libro' : 'Cuenta bloqueada por atraso en la devolución', cuerpo: motivo,
  });
  res.json({ ok: true, data: { usuario: usuarioPublico(await cargar(u.id)) } });
};

export const desbloquear = async (req, res) => {
  const u = await cargar(req.body.id);
  if (!u) throw err.noEncontrado('El usuario');
  if (u.rol !== 'usuario') throw err.sinPermiso('Solo se pueden desbloquear usuarios comunes.');
  await consultar("UPDATE usuarios SET estado = 'activo', motivo_bloqueo = NULL, tipo_bloqueo = NULL, bloqueado_en = NULL WHERE id = ?", [u.id]);
  await crearNotificacion({
    usuarioId: u.id, tipo: 'desbloqueo', titulo: 'Cuenta habilitada', cuerpo: 'Tu cuenta fue habilitada nuevamente por la biblioteca.',
  });
  res.json({ ok: true, data: { usuario: usuarioPublico(await cargar(u.id)) } });
};

// Panel de administración (solo dueño)
export const cambiarRol = async (req, res) => {
  const { id, rol } = req.body;
  if (id === req.usuario.id) throw err.sinPermiso('No podés cambiar tu propio rol.');
  const u = await cargar(id);
  if (!u) throw err.noEncontrado('El usuario');
  if (u.rol === rol) return res.json({ ok: true, data: { usuario: usuarioPublico(u) } });
  await consultar('UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE nombre = ?) WHERE id = ?', [rol, id]);
  res.json({ ok: true, data: { usuario: usuarioPublico(await cargar(id)) } });
};
