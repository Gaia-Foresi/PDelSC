// Notificaciones dentro de la app.
const { pool } = require('../config/db');

// sirve para guardar una notificación para un usuario. 
// Recibe los datos del mensaje, los guarda en la base de datos y devuelve si pudo crearlo o no
async function crearNotificacion({ usuarioId, tipo, titulo, cuerpo, prestamoId = null }, conn = pool) {
  const [r] = await conn.query(
    'INSERT IGNORE INTO notificaciones (usuario_id, tipo, titulo, cuerpo, prestamo_id) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, tipo, titulo, cuerpo, prestamoId]);
  return r.affectedRows > 0;
}

module.exports = { crearNotificacion };
