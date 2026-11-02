// Emisión y rotación de tokens: access JWT (corto) + refresh opaco (largo, guardado como hash).
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { consultar } from '../config/db.js';
import { sha256, tokenAleatorio } from '../utils/codigos.js';
import { HttpError, err } from '../utils/httpError.js';
import { usuarioPublico, SQL_USUARIO } from '../utils/serializers.js';

const { jwt: cfg } = env;

const refreshInvalido = () => new HttpError(401, 'REFRESH_INVALIDO', 'Tu sesión venció. Volvé a iniciar sesión.');

function firmarAccess(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, cfg.accessSecret, { algorithm: 'HS256', expiresIn: cfg.accessExp });
}

async function crearRefresh(usuarioId) {
  const token = tokenAleatorio();
  await consultar(
    'INSERT INTO refresh_tokens (usuario_id, token_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [usuarioId, sha256(token), cfg.refreshDias]);
  return token;
}

/** Crea la sesión completa que se devuelve en login/registro verificado. `usuario` viene de SQL_USUARIO. */
async function emitirSesion(usuario) {
  return {
    usuario: usuarioPublico(usuario),
    access_token: firmarAccess(usuario),
    refresh_token: await crearRefresh(usuario.id),
  };
}

/** Rota el refresh token: invalida el recibido y entrega uno nuevo + access nuevo. */
async function rotarRefresh(token) {
  const hash = sha256(token);
  const [fila] = await consultar('SELECT id, usuario_id, revocado, expira_en FROM refresh_tokens WHERE token_hash = ?', [hash]);
  if (!fila) throw refreshInvalido();

  // Reutilizar un token ya rotado indica robo: se cierran todas las sesiones de esa cuenta.
  if (fila.revocado) {
    await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE usuario_id = ?', [fila.usuario_id]);
    throw refreshInvalido();
  }
  if (new Date(fila.expira_en) < new Date()) throw refreshInvalido();

  const [usuario] = await consultar(`${SQL_USUARIO} WHERE u.id = ?`, [fila.usuario_id]);
  if (!usuario) throw refreshInvalido();
  if (usuario.estado === 'bloqueado') {
    await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE usuario_id = ?', [usuario.id]); // cierra sus sesiones
    throw err.bloqueado('Tu cuenta está bloqueada. Acercate a la biblioteca para regularizarla.');
  }

  await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE id = ?', [fila.id]);
  return { access_token: firmarAccess(usuario), refresh_token: await crearRefresh(usuario.id) };
}

async function revocarRefresh(token) {
  await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [sha256(token)]);
}

async function revocarTodos(usuarioId) {
  await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE usuario_id = ?', [usuarioId]);
}

export { emitirSesion, rotarRefresh, revocarRefresh, revocarTodos };
