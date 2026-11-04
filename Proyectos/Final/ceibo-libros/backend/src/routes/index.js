// Monta todas las rutas bajo /api. Recordá: SOLO existen endpoints POST.
import express from 'express';
import { limiteAuth } from '../middlewares/limites.js';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { ejecutarRecordatorios } from '../services/recordatorios.js';
import { usuarios, admin } from './usuarios.js';
import { categorias, libros } from './catalogo.js';
import { prestamos, reservas } from './prestamos.js';
import calendario from './calendario.js';
import authRouter from './auth.js';
import * as gestion from './gestion.js';

const { Router } = express;

const api = Router();

api.post('/salud', (req, res) => res.json({ ok: true, data: { estado: 'ok' } }));

// Disparador externo de la tarea diaria (por si el hosting duerme el servidor y el cron interno no corre).
// Se protege con el header x-cron-secret = CRON_SECRET.
api.post('/mantenimiento/recordatorios', asyncHandler(async (req, res) => {
  if (!env.cronSecret || req.get('x-cron-secret') !== env.cronSecret) throw new HttpError(403, 'SIN_PERMISO', 'No autorizado.');
  res.json({ ok: true, data: await ejecutarRecordatorios() });
}));

// El límite estricto es contra fuerza bruta en login/códigos; renovar o cerrar sesión no cuentan
const SIN_LIMITE_AUTH = new Set(['/refresh', '/logout']);
api.use('/auth', (req, res, next) => (SIN_LIMITE_AUTH.has(req.path) ? next() : limiteAuth(req, res, next)), authRouter);
api.use('/usuarios', usuarios);
api.use('/admin', admin);
api.use('/categorias', categorias);
api.use('/libros', libros);
api.use('/prestamos', prestamos);
api.use('/reservas', reservas);
api.use('/calendario', calendario);
api.use('/mensajes', gestion.mensajes);
api.use('/notificaciones', gestion.notificaciones);
api.use('/distribuidoras', gestion.distribuidoras);
api.use('/reposicion', gestion.reposicion);
api.use('/estadisticas', gestion.estadisticas);

export default api;
