// Entrada para Vercel (funciones "serverless"): cada instancia que se enciende
// actualiza la base una vez, corre la tarea diaria una vez y después atiende los pedidos con la misma API de siempre.
// En un servidor común (Railway, Render, tu compu) se usa `npm start` y este archivo no interviene.
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { migrar } = require('../src/services/migracion');
const { ejecutarRecordatorios } = require('../src/services/recordatorios');

let listo = null;

function iniciar() {
  if (!listo) {
    listo = migrar(pool)
      .then((hechos) => { if (hechos.length) console.log(`[db] Base actualizada: ${hechos.join(', ')}`); })
      .catch((e) => { listo = null; throw e; });
    // Los avisos de devolución no pueden esperar a un cron: se ponen al día al encender la instancia (no repite avisos)
    listo.then(() => ejecutarRecordatorios()).catch((e) => console.error('[recordatorios] falló:', e.message));
  }
  return listo;
}

module.exports = async (req, res) => {
  try {
    await iniciar();
  } catch (e) {
    console.error('[db] No se pudo preparar la base:', e.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: { codigo: 'BASE_NO_DISPONIBLE', mensaje: 'No pudimos conectarnos con la base de datos. Probá de nuevo en un momento.' } }));
  }
  return app(req, res);
};