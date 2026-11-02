import express from 'express';
import * as ctl from '../controllers/calendario.js';
import autenticar from '../middlewares/auth.js';
import { requiereRol, STAFF } from '../middlewares/roles.js';
import validar from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z } from '../utils/esquemas.js';

const { Router } = express;

const fecha = z.string({ required_error: 'Obligatorio' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD');
const calendario = Router();
calendario.use(autenticar, requiereRol(...STAFF));
calendario.post('/listar', validar(z.object({ desde: fecha, hasta: fecha })), asyncHandler(ctl.listar));

export default calendario;
