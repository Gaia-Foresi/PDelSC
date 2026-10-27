// Pool de conexiones a MySQL (base de datos alojada en la nube).
const mysql = require('mysql2/promise');
const { db } = require('./env');

const ssl = db.ssl
  ? { rejectUnauthorized: db.rechazarNoAutorizado, ...(db.ca ? { ca: db.ca } : {}) }
  : undefined;

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  ssl,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_MAX) || 10, // en Vercel conviene un número chico (ej.: 3)
  timezone: 'Z',            // las fechas viajan en UTC
  dateStrings: ['DATE'],    // las columnas DATE vuelven como 'YYYY-MM-DD'
});

// Toda conexión trabaja en UTC para que NOW() sea consistente
pool.pool.on('connection', (conexion) => conexion.query("SET time_zone = '+00:00'"));

/** Ejecuta una consulta y devuelve solo las filas. Los valores siempre van como parámetros (?). */
async function consultar(sql, params = []) {
  const [filas] = await pool.query(sql, params);
  return filas;
}

/** Ejecuta `fn(conexion)` dentro de una transacción; hace rollback si algo falla. */
async function transaccion(fn) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await fn(conexion);
    await conexion.commit();
    return resultado;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { pool, consultar, transaccion };
