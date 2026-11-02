// Entrada para Vercel (funciones serverless). En Vercel no hay un servidor encendido: cada pedido
// ejecuta esta función. La primera vez que despierta, deja la base al día (migración) y luego atiende.
import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import { migrar } from '../src/services/migracion.js';

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

export default async (req, res) => {
  await preparar();
  return app(req, res);
};
