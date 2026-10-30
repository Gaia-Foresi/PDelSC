// Borra usuarios (solo lectores) de la base, junto con sus préstamos, reservas y mensajes.
// NUNCA borra al dueño ni a los bibliotecarios. Por defecto solo MUESTRA lo que borraría.
//
//   npm run usuarios:limpiar                          -> lista a quién borraría (no borra nada)
//   npm run usuarios:limpiar -- --confirmar           -> borra a todos los lectores, salvo los de demostración
//   npm run usuarios:limpiar -- --email=a@x.com,b@y.com --confirmar   -> borra solo esas cuentas
//   npm run usuarios:limpiar -- --incluir-demo --confirmar            -> borra también lucia@ y tomas@ejemplo.com
const { pool } = require('../src/config/db');

// Emails de usuarios de demostración que no se borran por defecto
const DEMO = ['lucia@ejemplo.com', 'tomas@ejemplo.com'];
const args = process.argv.slice(2);
const confirmar = args.includes('--confirmar');
const incluirDemo = args.includes('--incluir-demo');
const emailArg = (args.find((a) => a.startsWith('--email=')) || '').slice(8);
const emails = emailArg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

(async () => {

  // Listar usuarios a borrar
  let sql = 'SELECT id, nombre, apellido, email, creado_en FROM usuarios WHERE rol_id = 3';
  const params = [];
  if (emails.length) { sql += ` AND LOWER(email) IN (${emails.map(() => '?').join(',')})`; params.push(...emails); }
  else if (!incluirDemo) { sql += ` AND LOWER(email) NOT IN (${DEMO.map(() => '?').join(',')})`; params.push(...DEMO); }
  const [lista] = await pool.query(`${sql} ORDER BY id`, params);

  // Mostrar usuarios que se borrarán
  if (!lista.length) { console.log('No hay usuarios para borrar con ese criterio.'); return pool.end(); }
  console.log(`${confirmar ? 'Se borrarán' : 'Se borrarían'} ${lista.length} usuario(s):`);
  for (const u of lista) console.log(`  #${u.id}  ${u.nombre} ${u.apellido}  <${u.email}>`);
  if (!confirmar) {
    console.log('\nNo se borró nada. Para borrar de verdad, repetí el comando agregando --confirmar');
    return pool.end();
  }

  // Borrado en cascada de usuarios y sus datos
  const ids = lista.map((u) => u.id);
  const en = ids.map(() => '?').join(',');
  const conn = await pool.getConnection();
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
