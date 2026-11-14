// Días o semanas en que el gerente cierra las reservas. Los usuarios solo ven "día no disponible": el motivo es interno.
//
// En criollo: este archivo solo sabe hacer UNA cosa, preguntarle a la base de datos "¿qué días están cerrados?".
// Lo usan los demás archivos (el que arma los horarios y el que valida una reserva) para no repetir la consulta.
import { consultar } from '../config/db.js'; // `consultar` = función que ejecuta una consulta SQL y devuelve las filas

/** Bloqueos que todavía importan. Fechas como texto 'YYYY-MM-DD' (por ejemplo '2026-11-16').
 *  - `desde` y `hasta` son el primer y el último día cerrado (si es un solo día, son iguales).
 *  - Se ignoran los bloqueos que terminaron hace más de 2 días: ya no sirven y así la consulta no crece con los años.
 *  - UTC_DATE() es la fecha de hoy en la base; DATE_SUB(..., INTERVAL 2 DAY) le resta 2 días.
 *  - ORDER BY desde = los más próximos primero. */
export const bloqueosVigentes = () =>
  consultar('SELECT id, desde, hasta FROM dias_bloqueados WHERE hasta >= DATE_SUB(UTC_DATE(), INTERVAL 2 DAY) ORDER BY desde');
