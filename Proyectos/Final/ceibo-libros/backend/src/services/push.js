// Notificaciones push al celular (como las de WhatsApp), usando el servicio gratuito de Expo.
// Cada celular registra un "token" al iniciar sesión. Cuando se crea una notificación en la app, también se manda al celular.
// Si algo falla (sin internet, token viejo) no se rompe nada: la notificación igual queda en la campana de la app.
import { consultar } from '../config/db.js';

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
const TOKEN_VALIDO = /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/;

const tokenValido = (t) => typeof t === 'string' && TOKEN_VALIDO.test(t);

async function registrarToken(usuarioId, token, plataforma = 'android') {
  if (!tokenValido(token)) return false;
  // Un celular pertenece a una sola persona a la vez: si cambia de cuenta, el token pasa a la nueva
  await consultar(
    `INSERT INTO dispositivos_push (usuario_id, token, plataforma) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id), plataforma = VALUES(plataforma), actualizado_en = NOW()`,
    [usuarioId, token, String(plataforma).slice(0, 10)]);
  return true;
}

async function quitarToken(usuarioId, token) {
  await consultar('DELETE FROM dispositivos_push WHERE usuario_id = ? AND token = ?', [usuarioId, token]);
}

/** Manda una notificación a todos los celulares de la persona. Nunca lanza error. */
async function enviarPush(usuarioId, { titulo, cuerpo, datos = {} }) {
  try {
    const filas = await consultar('SELECT token FROM dispositivos_push WHERE usuario_id = ?', [usuarioId]);
    if (!filas.length) return;
    const mensajes = filas.map((f) => ({
      to: f.token, title: titulo, body: cuerpo, data: datos, sound: 'default', channelId: 'avisos', priority: 'high',
    }));
    const resp = await fetch(URL_EXPO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes),
      signal: AbortSignal.timeout(8000),
    });
    const json = await resp.json().catch(() => null);
    // Si Expo dice que el celular ya no existe (se desinstaló la app), se borra su token
    (json?.data || []).forEach((r, i) => {
      if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
        consultar('DELETE FROM dispositivos_push WHERE token = ?', [mensajes[i].to]).catch(() => {});
      }
    });
  } catch (e) {
    console.error('[push] no se pudo enviar:', e.message);
  }
}

export { registrarToken, quitarToken, enviarPush, tokenValido };
