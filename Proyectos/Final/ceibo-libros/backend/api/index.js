// Entrada para Vercel (funciones serverless). En Vercel no hay un servidor encendido: cada pedido
// ejecuta esta función. La primera vez que despierta, deja la base al día (migración) y luego atiende.
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { migrar } = require('../src/services/migracion');

// Si la migración falla, se reintenta en el próximo pedido. 
// Esto es para evitar que un error de migración bloquee la app indefinidamente.
let preparada = null;
const preparar = () => {
  if (!preparada) {
    preparada = migrar(pool).catch((e) => {
      preparada = null; // si falla, se reintenta en el próximo pedido
      console.error('[db] No se pudo actualizar la base:', e.message);
    });
  }
  return preparada;
};

module.exports = async (req, res) => {
  await preparar();
  return app(req, res);
};
