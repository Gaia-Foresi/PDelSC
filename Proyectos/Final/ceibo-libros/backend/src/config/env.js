// Carga y valida las variables de entorno una sola vez.
require('dotenv').config();
const fs = require('fs');

function requerida(nombre) {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre} (copiá .env.example a .env y completala).`);
  return v;
}

function numero(nombre, defecto) {
  const v = process.env[nombre];
  return v === undefined || v === '' ? defecto : Number(v);
}

// Certificado CA opcional para la conexión SSL con la base en la nube
let ca = null;
if (process.env.DB_SSL_CA_PATH) ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
else if (process.env.DB_SSL_CA) ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');

// Railway (y otros hosts) entregan la base como una sola dirección: mysql://usuario:clave@host:puerto/base
// Si está definida (MYSQL_URL o DATABASE_URL) y no hay DB_HOST, se usa para completar las variables DB_*.
const urlBase = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (urlBase && !process.env.DB_HOST) {
  try {
    const u = new URL(urlBase);
    process.env.DB_HOST = u.hostname;
    process.env.DB_PORT = u.port || '3306';
    process.env.DB_USER = decodeURIComponent(u.username);
    process.env.DB_PASSWORD = decodeURIComponent(u.password);
    process.env.DB_NAME = u.pathname.replace(/^\//, '');
  } catch {
    throw new Error('MYSQL_URL / DATABASE_URL no tiene el formato mysql://usuario:clave@host:puerto/base');
  }
}

module.exports = {
  entorno: process.env.NODE_ENV || 'development',
  puerto: numero('PORT', 4000),
  tzOffsetHoras: numero('TZ_OFFSET_HORAS', -3),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Si se define, permite disparar la tarea diaria desde un cron externo (header x-cron-secret)
  cronSecret: process.env.CRON_SECRET || '',

  db: {
    host: requerida('DB_HOST'),
    port: numero('DB_PORT', 3306),
    user: requerida('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: requerida('DB_NAME'),
    ssl: process.env.DB_SSL === 'true',
    ca,
    rechazarNoAutorizado: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },

  jwt: {
    accessSecret: requerida('JWT_ACCESS_SECRET'),
    accessExp: process.env.JWT_ACCESS_EXP || '15m',
    refreshDias: numero('JWT_REFRESH_DIAS', 30),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: numero('SMTP_PORT', 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Ceibo Libros <no-reply@ceibolibros.com>',
  },

  oauth: {
    googleClientIds: (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
  },

  // Horario en que se pueden elegir visitas a la biblioteca (hora local, según TZ_OFFSET_HORAS)
  visitas: {
    horaApertura: numero('VISITA_HORA_APERTURA', 8),
    horaCierre: numero('VISITA_HORA_CIERRE', 18),
    // días de atención: 1 = lunes ... 7 = domingo
    dias: (process.env.VISITA_DIAS || '1,2,3,4,5').split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 7),
    pasoMin: numero('VISITA_PASO_MIN', 30),
    graciaHoras: numero('VISITA_GRACIA_HORAS', 2), // la reserva se mantiene hasta 2 h después de la hora elegida
  },

  reglas: {
    recordatorioDias: numero('RECORDATORIO_DIAS', 2),
    prestamoDiasDefecto: numero('PRESTAMO_DIAS_DEFECTO', 14),
    prestamoMaxLibros: numero('PRESTAMO_MAX_LIBROS', 5),
    reservasMaxActivas: numero('RESERVAS_MAX_ACTIVAS', 3),
    cron: process.env.CRON_RECORDATORIOS || '0 9 * * *',
    cronTz: process.env.CRON_TZ || 'America/Argentina/Buenos_Aires',
  },
};
