// Crea las tablas en la base MySQL de la nube ejecutando sql/schema.sql.
//   npm run db:init            -> falla si ya hay tablas (para no borrar datos por accidente)
//   npm run db:init -- --reset -> BORRA todo y vuelve a crear
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../src/config/env');

(async () => {
  const conexion = await mysql.createConnection({
    host: db.host, port: db.port, user: db.user, password: db.password, database: db.database,
    ssl: db.ssl ? { rejectUnauthorized: db.rechazarNoAutorizado, ...(db.ca ? { ca: db.ca } : {}) } : undefined,
    multipleStatements: true, charset: 'utf8mb4',
  });
  try {
    const [existe] = await conexion.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'usuarios'", [db.database]);
    if (existe[0].n > 0 && !process.argv.includes('--reset')) {
      console.error('La base ya tiene tablas. Si querés BORRAR todo y empezar de cero: npm run db:init -- --reset');
      process.exitCode = 1;
      return;
    }
    await conexion.query(fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8'));
    console.log('✔ Tablas creadas. Ahora ejecutá: npm run db:seed');
  } finally {
    await conexion.end();
  }
})().catch((e) => { console.error('✘ Error:', e.message); process.exit(1); });
