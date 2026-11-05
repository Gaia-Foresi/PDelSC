// Actualiza una base YA CREADA a la versión nueva, sin borrar datos. Se puede ejecutar varias veces.
//   npm run db:migrar   (el servidor también lo hace solo al arrancar)
import { pool } from '../src/config/db.js';
import { migrar } from '../src/services/migracion.js';

// Ejecuta la migración y muestra el resultado en consola. 
// Si ocurre un error, lo informa y termina con código 1.
migrar(pool)
  .then(async (hechos) => {
    console.log(hechos.length ? `✔ Base actualizada. Columnas nuevas: ${hechos.join(', ')}` : '✔ La base ya estaba actualizada.');
    await pool.end();
  })
  .catch((e) => { console.error('✘ Error:', e.message); process.exit(1); });
