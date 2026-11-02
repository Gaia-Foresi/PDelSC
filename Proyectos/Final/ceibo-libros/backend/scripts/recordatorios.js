// Ejecuta a mano la tarea diaria (vence reservas, avisa devoluciones y bloquea vencidos). Útil para probar.
import { pool } from '../src/config/db.js';
import { ejecutarRecordatorios } from '../src/services/recordatorios.js';

ejecutarRecordatorios()
  .catch((e) => { console.error('✘ Error:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
