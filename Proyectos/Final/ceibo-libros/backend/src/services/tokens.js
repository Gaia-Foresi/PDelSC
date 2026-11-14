// Access token: JWT que dura poco (60 min) y se manda en cada pedido.
// Refresh token: texto al azar que dura días y sirve solo para pedir un access token nuevo.
// Emisión y rotación de tokens: access JWT (corto) + refresh opaco (largo, guardado como hash).
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { consultar } from '../config/db.js';
import { sha256, tokenAleatorio } from '../utils/codigos.js';
import { HttpError, err } from '../utils/httpError.js';
import { usuarioPublico, SQL_USUARIO } from '../utils/serializers.js';

const { jwt: cfg } = env;

// Margen de 2 minutos para tolerar un refresh token que se acaba de usar.
const GRACIA_MS = 2 * 60 * 1000;
const refreshInvalido = () => new HttpError(401, 'REFRESH_INVALIDO', 'Tu sesión venció. Volvé a iniciar sesión.');

// Firma un JWT con el id (sub) y el rol del usuario. Vence según JWT_ACCESS_EXP.
function firmarAccess(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, cfg.accessSecret, { algorithm: 'HS256', expiresIn: cfg.accessExp });
}

// Crea un refresh token al azar. En la base se guarda solo su hash; el token real lo recibe la app.
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
  const [fila] = await consultar('SELECT id, usuario_id, revocado, revocado_en, expira_en FROM refresh_tokens WHERE token_hash = ?', [hash]);
  if (!fila) throw refreshInvalido();

  // Un token ya rotado se tolera unos minutos (dos pestañas o dos pedidos que renuevan a la vez);
  // pasado ese margen, reutilizarlo indica robo y se cierran todas las sesiones de esa cuenta.
  const reciente = fila.revocado && fila.revocado_en && Date.now() - new Date(fila.revocado_en).getTime() < GRACIA_MS;
  if (fila.revocado && !reciente) {
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

  if (!fila.revocado) await consultar('UPDATE refresh_tokens SET revocado = 1, revocado_en = NOW() WHERE id = ?', [fila.id]);
  return { access_token: firmarAccess(usuario), refresh_token: await crearRefresh(usuario.id) };
}

// Anula un refresh token (cerrar sesión en este dispositivo).
async function revocarRefresh(token) {
  await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [sha256(token)]);
}

// Anula todos los refresh tokens del usuario (cerrar sesión en todos los dispositivos).
async function revocarTodos(usuarioId) {
  await consultar('UPDATE refresh_tokens SET revocado = 1 WHERE usuario_id = ?', [usuarioId]);
}

export { emitirSesion, rotarRefresh, revocarRefresh, revocarTodos };
