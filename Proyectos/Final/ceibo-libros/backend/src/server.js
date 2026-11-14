// Arranque: verifica la conexión con la base en la nube, levanta la API y programa la tarea diaria.
import cron from 'node-cron';
import env from './config/env.js';
import { pool } from './config/db.js';
import app from './app.js';
import { ejecutarRecordatorios } from './services/recordatorios.js';
import { completarPortadasFaltantes } from './services/portadas.js';
import { migrar } from './services/migracion.js';

// Función principal: arranca todo en orden. Si algo crítico falla, cierra el programa.
async function main() {
  // 1) Probamos que la base de datos responda.
  try {
    await pool.query('SELECT 1');
    console.log(`[db] Conectado a ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (e) {
    console.error(`[db] No se pudo conectar a la base de datos (${e.code || e.message}). Revisá el archivo .env`);
    process.exit(1);
  }

  // 2) Actualizamos la estructura de la base si hace falta.
  // Si la base viene de una versión anterior, agrega solo lo que falta (no borra nada)
  try {
    const hechos = await migrar(pool);
    if (hechos.length) console.log(`[db] Base actualizada: ${hechos.join(', ')}`);
  } catch (e) {
    console.error('[db] No se pudo actualizar la base:', e.message);
    process.exit(1);
  }

  // 3) Encendemos el servidor: queda escuchando pedidos en el puerto configurado.
  const servidor = app.listen(env.puerto, '0.0.0.0', () => console.log(`[api] Ceibo Libros escuchando en el puerto ${env.puerto}`));

  // 4) Tarea diaria de recordatorios (vencimientos). cron la programa según la hora del .env.
  const correrTarea = () => ejecutarRecordatorios().catch((e) => console.error('[recordatorios] falló:', e.message));
  cron.schedule(env.reglas.cron, correrTarea, { timezone: env.reglas.cronTz });
  setTimeout(correrTarea, 15000); // también al arrancar: si el hosting durmió el servidor, se ponen al día los avisos

  // Los libros sin portada la buscan solos en segundo plano (guarda links, no descarga imágenes)
  setTimeout(() => {
    completarPortadasFaltantes(pool, { log: () => {} })
      .then((r) => r.completados && console.log(`[portadas] ${r.completados} portadas completadas`))
      .catch(() => {});
  }, 5000);

  // Cierre prolijo: cuando el hosting pide apagar (SIGTERM) o apretás Ctrl+C (SIGINT),
  // deja de aceptar pedidos, cierra la base y termina. Si tarda más de 10 s, corta igual.
  const cerrar = (senal) => {
    console.log(`[api] ${senal}: cerrando...`);
    servidor.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

// Si una promesa falla y nadie la atrapó, la mostramos en consola en vez de que pase desapercibida.
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
main();
