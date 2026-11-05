// Cambia el email y la contraseña de una cuenta. Uso (desde backend/):
//   node scripts/cambiar-acceso.js emailActual emailNuevo contraseñaNueva
// Ejemplo:
//   node scripts/cambiar-acceso.js email-actual@ejemplo.com gerente@ceibolibros.com Gerente2026
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

// Cambia el email y la contraseña de una cuenta
(async () => {
  // valida que se hayan ingresado los datos y que la contraseña cumpla los requisitos mínimos. 
  // Después genera un hash con bcrypt y actualiza los datos del usuario en la base de datos. 
  // Finalmente, informa si la operación se realizó correctamente o si ocurrió algún error.
  const [actual, nuevo, clave] = process.argv.slice(2);
  if (!actual || !nuevo || !clave) {
    console.log('Uso: node scripts/cambiar-acceso.js emailActual emailNuevo contraseñaNueva');
    process.exit(1);
  }
  if (clave.length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) {
    console.log('La contraseña debe tener al menos 8 caracteres, con letras y números.');
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(clave, 10);
    const [r] = await pool.query('UPDATE usuarios SET email = ?, password_hash = ? WHERE email = ?', [nuevo.toLowerCase(), hash, actual.toLowerCase()]);
    console.log(r.affectedRows ? `✔ Listo: ahora se ingresa con ${nuevo.toLowerCase()}` : `No existe ninguna cuenta con el email ${actual}.`);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
})();
