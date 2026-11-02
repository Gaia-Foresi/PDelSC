// Notificaciones dentro de la app.
import { pool } from '../config/db.js';

/**
 * Crea una notificación. Si ya existe una igual para ese préstamo (misma clave única),
 * no duplica y devuelve false; si se creó devuelve true.
 */
async function crearNotificacion({ usuarioId, tipo, titulo, cuerpo, prestamoId = null }, conn = pool) {
  const [r] = await conn.query(
    'INSERT IGNORE INTO notificaciones (usuario_id, tipo, titulo, cuerpo, prestamo_id) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, tipo, titulo, cuerpo, prestamoId]);
  return r.affectedRows > 0;
}

export { crearNotificacion };
