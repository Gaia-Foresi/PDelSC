// Busca en internet la portada de los libros que no la tienen y guarda el LINK (no descarga imágenes).
//   npm run portadas             -> solo los que no tienen portada
//   npm run portadas -- --todas  -> vuelve a buscar la de todos los libros
const { pool } = require('../src/config/db');
const { completarPortadasFaltantes } = require('../src/services/portadas');

(async () => {

  // Determinar si se deben buscar portadas de todos los libros
  const todas = process.argv.includes('--todas');
  console.log(todas ? 'Buscando la portada de TODOS los libros…' : 'Buscando portadas de los libros que no tienen…');
  const r = await completarPortadasFaltantes(pool, { limite: 1000, todas });
  console.log(`\n✔ ${r.completados} de ${r.revisados} libros con portada.`);
  if (r.completados < r.revisados) console.log('  Los que quedaron sin portada se pueden completar a mano (campo "Portada" al editar el libro).');
  await pool.end();
})().catch((e) => { console.error('✘ Error:', e.message); process.exit(1); });
