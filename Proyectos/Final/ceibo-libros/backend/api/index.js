// Entrada para Vercel (funciones serverless). En Vercel no hay un servidor encendido: cada pedido
// ejecuta esta función. La primera vez que despierta, deja la base al día (migración) y luego atiende.
import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import { migrar } from '../src/services/migracion.js';

// se asegura de que la base de datos se actualice una sola vez, 
// aunque lo pidan muchos al mismo tiempo. Si la actualización falla, 
// deja la puerta abierta para volver a intentarlo más adelante.
// "preparada" guarda la promesa de la migración: si ya existe, no se vuelve a ejecutar.
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

// Función que Vercel ejecuta en cada pedido: primero se asegura de que la base esté lista,
// después le pasa el pedido a la app de Express.
export default async (req, res) => {
  await preparar();
  return app(req, res);
};
