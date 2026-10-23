// Middleware de autenticación: valida el JWT y carga el usuario (con su rol ACTUAL de la base).
const jwt = require('jsonwebtoken');
const { jwt: cfg } = require('../config/env');
const { consultar } = require('../config/db');
const { HttpError, err } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) throw err.noAutenticado();

  let payload;
  try {
    payload = jwt.verify(token, cfg.accessSecret, { algorithms: ['HS256'] });
  } catch (e) {
    if (e.name === 'TokenExpiredError') throw new HttpError(401, 'TOKEN_EXPIRADO', 'Tu sesión expiró.');
    throw err.noAutenticado('Sesión inválida.');
  }

  // El rol se lee de la base en cada request: si el dueño cambia un rol, aplica de inmediato.
  const [u] = await consultar(
    `SELECT u.id, u.estado, u.motivo_bloqueo, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`, [payload.sub]);
  if (!u) throw err.noAutenticado('La cuenta ya no existe.');

  req.usuario = { id: u.id, rol: u.rol, estado: u.estado, motivo_bloqueo: u.motivo_bloqueo };
  next();
});
