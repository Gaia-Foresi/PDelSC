// Actualiza una base YA CREADA a la versión nueva, sin borrar datos. 
// Se puede ejecutar varias veces.
// npm run db:migrar   (el servidor también lo hace solo al arrancar)
const { pool } = require('../src/config/db');
const { migrar } = require('../src/services/migracion');

// Entrada para Vercel (funciones serverless).
migrar(pool)
  .then(async (hechos) => {
    console.log(hechos.length ? `✔ Base actualizada. Columnas nuevas: ${hechos.join(', ')}` : '✔ La base ya estaba actualizada.');
    await pool.end();
  })
  .catch((e) => { console.error('✘ Error:', e.message); process.exit(1); });
