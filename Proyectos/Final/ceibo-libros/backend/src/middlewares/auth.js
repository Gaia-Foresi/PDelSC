// Se pone delante de las rutas que requieren estar logueado. Si todo está bien, deja el usuario en req.usuario.
// Middleware de autenticación: valida el JWT y carga el usuario (con su rol ACTUAL de la base).
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { consultar } from '../config/db.js';
import { HttpError, err } from '../utils/httpError.js';
import asyncHandler from '../utils/asyncHandler.js';

const { jwt: cfg } = env;

export default asyncHandler(async (req, res, next) => {
  // El token llega en la cabecera así: "Authorization: Bearer <token>". Separamos las dos partes.
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) throw err.noAutenticado();

  let payload;
  // jwt.verify comprueba que el token lo firmamos nosotros y que no venció. Si falla, tira error.
  try {
    payload = jwt.verify(token, cfg.accessSecret, { algorithms: ['HS256'] });
  } catch (e) {
    if (e.name === 'TokenExpiredError') throw new HttpError(401, 'TOKEN_EXPIRADO', 'Tu sesión expiró.');
    throw err.noAutenticado('Sesión inválida.');
  }

  // El rol se lee de la base en cada request: si el gerente cambia un rol, aplica de inmediato.
  const [u] = await consultar(
    `SELECT u.id, u.estado, u.motivo_bloqueo, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`, [payload.sub]);
  if (!u) throw err.noAutenticado('La cuenta ya no existe.');

  // Guardamos el usuario en el pedido para que los siguientes pasos (controladores) lo usen.
  req.usuario = { id: u.id, rol: u.rol, estado: u.estado, motivo_bloqueo: u.motivo_bloqueo };
  next();
});
