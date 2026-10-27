// Cambia el email y la contraseña de una cuenta. Uso (desde backend/):
//   node scripts/cambiar-acceso.js emailActual emailNuevo contraseñaNueva
// Ejemplo:
//   node scripts/cambiar-acceso.js dueno@ceibolibros.com gerente@ceibolibros.com Dueno2026
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

(async () => {
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
