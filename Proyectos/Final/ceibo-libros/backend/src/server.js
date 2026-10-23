// Arranque: verifica la conexión con la base en la nube, levanta la API y programa la tarea diaria.
const cron = require('node-cron');
const env = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');
const { ejecutarRecordatorios } = require('./services/recordatorios');
const { completarPortadasFaltantes } = require('./services/portadas');
const { migrar } = require('./services/migracion');

async function main() {
  try {
    await pool.query('SELECT 1');
    console.log(`[db] Conectado a ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (e) {
    console.error(`[db] No se pudo conectar a la base de datos (${e.code || e.message}). Revisá el archivo .env`);
    process.exit(1);
  }

  // Si la base viene de una versión anterior, agrega solo lo que falta (no borra nada)
  try {
    const hechos = await migrar(pool);
    if (hechos.length) console.log(`[db] Base actualizada: ${hechos.join(', ')}`);
  } catch (e) {
    console.error('[db] No se pudo actualizar la base:', e.message);
    process.exit(1);
  }

  const servidor = app.listen(env.puerto, '0.0.0.0', () => console.log(`[api] Ceibo Libros escuchando en el puerto ${env.puerto}`));

  const correrTarea = () => ejecutarRecordatorios().catch((e) => console.error('[recordatorios] falló:', e.message));
  cron.schedule(env.reglas.cron, correrTarea, { timezone: env.reglas.cronTz });
  setTimeout(correrTarea, 15000); // también al arrancar: si el hosting durmió el servidor, se ponen al día los avisos

  // Los libros sin portada la buscan solos en segundo plano (guarda links, no descarga imágenes)
  setTimeout(() => {
    completarPortadasFaltantes(pool, { log: () => {} })
      .then((r) => r.completados && console.log(`[portadas] ${r.completados} portadas completadas`))
      .catch(() => {});
  }, 5000);

  const cerrar = (senal) => {
    console.log(`[api] ${senal}: cerrando...`);
    servidor.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
main();
