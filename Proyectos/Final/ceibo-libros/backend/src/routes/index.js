// Monta todas las rutas bajo /api. Recordá: SOLO existen endpoints POST.
const { Router } = require('express');
const { limiteAuth } = require('../middlewares/limites');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { HttpError } = require('../utils/httpError');
const { ejecutarRecordatorios } = require('../services/recordatorios');
const { usuarios, admin } = require('./usuarios');
const { categorias, libros } = require('./catalogo');
const { prestamos, reservas } = require('./prestamos');
const gestion = require('./gestion');

const api = Router();

api.post('/salud', (req, res) => res.json({ ok: true, data: { estado: 'ok' } }));

// Disparador externo de la tarea diaria (por si el hosting duerme el servidor y el cron interno no corre).
// Se protege con el header x-cron-secret = CRON_SECRET.
api.post('/mantenimiento/recordatorios', asyncHandler(async (req, res) => {
  if (!env.cronSecret || req.get('x-cron-secret') !== env.cronSecret) throw new HttpError(403, 'SIN_PERMISO', 'No autorizado.');
  res.json({ ok: true, data: await ejecutarRecordatorios() });
}));

api.use('/auth', limiteAuth, require('./auth'));
api.use('/usuarios', usuarios);
api.use('/admin', admin);
api.use('/categorias', categorias);
api.use('/libros', libros);
api.use('/prestamos', prestamos);
api.use('/reservas', reservas);
api.use('/calendario', require('./calendario'));
api.use('/mensajes', gestion.mensajes);
api.use('/notificaciones', gestion.notificaciones);
api.use('/distribuidoras', gestion.distribuidoras);
api.use('/reposicion', gestion.reposicion);
api.use('/estadisticas', gestion.estadisticas);

module.exports = api;
