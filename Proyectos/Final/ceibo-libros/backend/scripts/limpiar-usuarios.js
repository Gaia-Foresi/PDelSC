// Borra usuarios (solo lectores) de la base, junto con sus préstamos, reservas y mensajes.
// NUNCA borra al gerente ni a los bibliotecarios. Por defecto solo MUESTRA lo que borraría.
//
//   npm run usuarios:limpiar                          -> lista a quién borraría (no borra nada)
//   npm run usuarios:limpiar -- --confirmar           -> borra a todos los lectores, salvo los de demostración
//   npm run usuarios:limpiar -- --email=a@x.com,b@y.com --confirmar   -> borra solo esas cuentas
//   npm run usuarios:limpiar -- --incluir-demo --confirmar            -> borra también lucia@ y tomas@ejemplo.com
import { pool } from '../src/config/db.js';

// Lista de usuarios de demostración que no se borran por defecto
const DEMO = ['lucia@ejemplo.com', 'tomas@ejemplo.com'];
const args = process.argv.slice(2);
const confirmar = args.includes('--confirmar');
const incluirDemo = args.includes('--incluir-demo');
const emailArg = (args.find((a) => a.startsWith('--email=')) || '').slice(8);
const emails = emailArg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Borra usuarios (solo lectores) de la base, junto con sus préstamos, reservas y mensajes.
(async () => {

  //consulta los usuarios con rol 3, seleccionando sus datos principales. 
  // Si se proporciona una lista de emails, devuelve solamente los usuarios que coinciden; 
  // si no, puede excluir las cuentas de demostración. 
  // Finalmente, ejecuta la consulta y ordena los resultados por ID.
  let sql = 'SELECT id, nombre, apellido, email, creado_en FROM usuarios WHERE rol_id = 3';
  const params = [];
  if (emails.length) { sql += ` AND LOWER(email) IN (${emails.map(() => '?').join(',')})`; params.push(...emails); }
  else if (!incluirDemo) { sql += ` AND LOWER(email) NOT IN (${DEMO.map(() => '?').join(',')})`; params.push(...DEMO); }
  const [lista] = await pool.query(`${sql} ORDER BY id`, params);

  // verifica si hay usuarios para borrar. 
  // Si los encuentra, muestra sus datos y solicita una confirmación mediante --confirmar. 
  // Si no se confirma, no elimina nada y cierra la conexión a la base de datos.
  if (!lista.length) { console.log('No hay usuarios para borrar con ese criterio.'); return pool.end(); }
  console.log(`${confirmar ? 'Se borrarán' : 'Se borrarían'} ${lista.length} usuario(s):`);
  for (const u of lista) console.log(`  #${u.id}  ${u.nombre} ${u.apellido}  <${u.email}>`);
  if (!confirmar) {
    console.log('\nNo se borró nada. Para borrar de verdad, repetí el comando agregando --confirmar');
    return pool.end();
  }

  //prepara los identificadores, 
  // genera los espacios necesarios para una consulta SQL 
  // y consigue una conexión con la base de datos.
  const ids = lista.map((u) => u.id);
  const en = ids.map(() => '?').join(',');
  const conn = await pool.getConnection();

  // se encarga de eliminar uno o varios usuarios de la base de datos junto con sus datos relacionados, 
  // asegurándose de que, 
  // si ocurre algún error durante el proceso, no se borre nada parcialmente.
  try {
    await conn.beginTransaction();
    // Orden: primero lo que depende de los usuarios sin borrado en cascada
    await conn.query(`DELETE FROM prestamos WHERE usuario_id IN (${en})`, ids);            // items y avisos de esos préstamos caen en cascada
    await conn.query(`DELETE FROM reservas WHERE usuario_id IN (${en})`, ids);
    await conn.query(`DELETE FROM mensajes WHERE remitente_id IN (${en})`, ids);
    await conn.query(`DELETE FROM hilos WHERE creado_por IN (${en})`, ids);                // sus mensajes y participantes caen en cascada
    await conn.query(`DELETE FROM usuarios WHERE id IN (${en})`, ids);                     // redes sociales, códigos, sesiones y notificaciones caen en cascada
    await conn.commit();
    console.log(`\n✔ Listo: ${ids.length} usuario(s) borrado(s) con sus datos.`);
  } catch (e) {
    await conn.rollback();
    console.error('✘ No se borró nada (se deshizo todo):', e.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
})().catch((e) => { console.error('✘ Error:', e.message); process.exit(1); });
