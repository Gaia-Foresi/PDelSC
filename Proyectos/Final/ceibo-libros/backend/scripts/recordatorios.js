// Ejecuta a mano la tarea diaria (vence reservas, avisa devoluciones y bloquea vencidos). Útil para probar.
const { pool } = require('../src/config/db');
const { ejecutarRecordatorios } = require('../src/services/recordatorios');

// Ejecuta la tarea de recordatorios
ejecutarRecordatorios()
  .catch((e) => { console.error('✘ Error:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
