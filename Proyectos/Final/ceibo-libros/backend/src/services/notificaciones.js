// Notificaciones dentro de la app.
import { pool } from '../config/db.js';
import { enviarPush } from './push.js';

/**
 * Crea una notificación. Si ya existe una igual para ese préstamo (misma clave única),
 * no duplica y devuelve false; si se creó devuelve true.
 */
async function crearNotificacion({ usuarioId, tipo, titulo, cuerpo, prestamoId = null }, conn = pool) {
  const [r] = await conn.query(
    'INSERT IGNORE INTO notificaciones (usuario_id, tipo, titulo, cuerpo, prestamo_id) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, tipo, titulo, cuerpo, prestamoId]);
  const creada = r.affectedRows > 0;
  // Además de la campana de la app, llega al celular (sin esperar: si falla, no afecta a quien la generó)
  if (creada) enviarPush(usuarioId, { titulo, cuerpo, datos: { tipo, prestamoId } });
  return creada;
}

export { crearNotificacion };
