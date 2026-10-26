// ============================================================
//  npm run admin:crear -- <usuario> <contraseña>
// ------------------------------------------------------------
//  Crea un usuario admin, o si ya existe le cambia la contraseña.
//  Usalo también si alguna vez te olvidás la contraseña.
// ============================================================
import bcrypt from 'bcryptjs';
import { execute, getPool } from '../db.js';
import { TABLES } from '../schema.js';

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.log('Uso:  npm run admin:crear -- <usuario> <contraseña>');
    console.log('Ej.:  npm run admin:crear -- gaia MiClaveSegura2026');
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.log('❌ La contraseña tiene que tener al menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  await execute(TABLES[0]); // por si la tabla todavía no existe
  const hash = await bcrypt.hash(password, 12);

  const result = await execute(
    `INSERT INTO admin_usuarios (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username.trim(), hash]
  );

  // affectedRows: 1 = creado, 2 = actualizado
  if (result.affectedRows === 1) console.log(`✅ Usuario "${username}" creado.`);
  else console.log(`✅ Contraseña de "${username}" actualizada.`);
  console.log('   Entrá al panel en /#admin');
}

main()
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
