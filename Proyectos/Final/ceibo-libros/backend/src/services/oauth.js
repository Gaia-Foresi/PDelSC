// Verificación de identidad con redes sociales. Devuelve { uid, email, nombre, apellido, foto }.
// El servidor SIEMPRE valida con el proveedor: nunca confía en datos que mande la app.
const { oauth } = require('../config/env');
const { HttpError } = require('../utils/httpError');

const falla = (mensaje) => new HttpError(502, 'PROVEEDOR_SOCIAL', mensaje);

async function pedirJson(url, opciones = {}) {
  let r;
  try {
    r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(10000) });
  } catch {
    throw falla('No pudimos comunicarnos con el proveedor. Probá de nuevo.');
  }
  const cuerpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, cuerpo };
}

/** Google: la app envía el access token; se valida que sea de nuestra aplicación y se leen los datos. */
async function google({ token }) {
  if (!token) throw falla('Falta el token de Google.');
  if (oauth.googleClientIds.length) {
    const info = await pedirJson(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!info.ok) throw falla('El token de Google no es válido.');
    const aud = info.cuerpo.aud || info.cuerpo.azp;
    if (!oauth.googleClientIds.includes(aud)) throw falla('El token de Google pertenece a otra aplicación.');
  }
  const r = await pedirJson('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok || !r.cuerpo.sub) throw falla('No pudimos validar tu cuenta de Google.');
  if (!r.cuerpo.email || r.cuerpo.email_verified === false) throw falla('Tu cuenta de Google no tiene un email verificado.');
  return {
    uid: r.cuerpo.sub, email: r.cuerpo.email,
    nombre: r.cuerpo.given_name || r.cuerpo.name || 'Usuario', apellido: r.cuerpo.family_name || '',
    foto: r.cuerpo.picture || null,
  };
}

/** GitHub: la app manda el `code`; el servidor lo canjea con el client secret (que nunca sale del servidor). */
async function github({ code, redirect_uri, code_verifier }) {
  if (!oauth.githubClientId || !oauth.githubClientSecret) throw falla('GitHub no está configurado en el servidor.');
  if (!code) throw falla('Falta el código de GitHub.');
  const t = await pedirJson('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: oauth.githubClientId, client_secret: oauth.githubClientSecret,
      code, redirect_uri, ...(code_verifier ? { code_verifier } : {}),
    }),
  });
  const accessToken = t.cuerpo.access_token;
  if (!accessToken) throw falla('GitHub rechazó el código. Probá iniciar sesión de nuevo.');

  const cab = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'ceibo-libros' };
  const u = await pedirJson('https://api.github.com/user', { headers: cab });
  if (!u.ok || !u.cuerpo.id) throw falla('No pudimos validar tu cuenta de GitHub.');
  const correos = await pedirJson('https://api.github.com/user/emails', { headers: cab });
  const principal = Array.isArray(correos.cuerpo)
    ? correos.cuerpo.find((c) => c.primary && c.verified) || correos.cuerpo.find((c) => c.verified)
    : null;
  if (!principal) throw falla('Tu cuenta de GitHub no tiene un email verificado.');

  const [nombre, ...resto] = (u.cuerpo.name || u.cuerpo.login || 'Usuario').split(' ');
  return { uid: String(u.cuerpo.id), email: principal.email, nombre, apellido: resto.join(' '), foto: u.cuerpo.avatar_url || null };
}

/** Discord: la app envía el access token; se valida que sea de nuestra aplicación. */
async function discord({ token }) {
  if (!token) throw falla('Falta el token de Discord.');
  const cab = { Authorization: `Bearer ${token}` };
  if (oauth.discordClientId) {
    const app = await pedirJson('https://discord.com/api/oauth2/@me', { headers: cab });
    if (!app.ok || app.cuerpo.application?.id !== oauth.discordClientId) throw falla('El token de Discord pertenece a otra aplicación.');
  }
  const r = await pedirJson('https://discord.com/api/users/@me', { headers: cab });
  if (!r.ok || !r.cuerpo.id) throw falla('No pudimos validar tu cuenta de Discord.');
  if (!r.cuerpo.email || r.cuerpo.verified === false) throw falla('Tu cuenta de Discord no tiene un email verificado.');
  const foto = r.cuerpo.avatar ? `https://cdn.discordapp.com/avatars/${r.cuerpo.id}/${r.cuerpo.avatar}.png` : null;
  return { uid: r.cuerpo.id, email: r.cuerpo.email, nombre: r.cuerpo.global_name || r.cuerpo.username || 'Usuario', apellido: '', foto };
}

module.exports = { google, github, discord };
