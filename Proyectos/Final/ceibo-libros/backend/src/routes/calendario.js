// Rutas para el calendario de reservas. Solo accesible para staff.
const { Router } = require('express');
const ctl = require('../controllers/calendario');
const autenticar = require('../middlewares/auth');
const { requiereRol, STAFF } = require('../middlewares/roles');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z } = require('../utils/esquemas');

// Valida que la fecha tenga el formato AAAA-MM-DD
const fecha = z.string({ required_error: 'Obligatorio' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD');
const calendario = Router();
calendario.use(autenticar, requiereRol(...STAFF));
calendario.post('/listar', validar(z.object({ desde: fecha, hasta: fecha })), asyncHandler(ctl.listar));

module.exports = calendario;
