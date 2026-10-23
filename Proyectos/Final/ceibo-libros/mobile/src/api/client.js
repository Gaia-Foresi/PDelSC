// Cliente HTTP. Regla del proyecto: TODAS las llamadas a la API son POST con cuerpo JSON.
// - Agrega el token de acceso.
// - Si vence (401 TOKEN_EXPIRADO) renueva con /auth/refresh (una sola vez a la vez) y reintenta.
// - Convierte cualquier error en { codigo, mensaje, detalles, status } para mostrarlo al usuario.
import { API_URL } from './config';
import { getSesion, guardarSesion, limpiarSesion, notificarSesionPerdida } from './session';

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor({ codigo, mensaje, detalles, status }) {
    super(mensaje);
    this.codigo = codigo;
    this.detalles = detalles || null;
    this.status = status || 0;
  }
}

async function enviar(ruta, cuerpo, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(cuerpo || {}),
      signal: controller.signal,
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* respuesta sin JSON */ }
    if (res.ok && json?.ok !== false) return json?.data ?? {};
    const err = json?.error || {};
    throw new ApiError({
      codigo: err.codigo || 'ERROR_INTERNO',
      mensaje: err.mensaje || 'Ocurrió un error inesperado. Probá de nuevo.',
      detalles: err.detalles,
      status: res.status,
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const abortado = e?.name === 'AbortError';
    throw new ApiError({
      codigo: 'SIN_CONEXION',
      mensaje: abortado
        ? 'El servidor tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.'
        : 'No pudimos conectarnos con el servidor. Revisá tu conexión a internet.',
      status: 0,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Renovación de tokens: si varias llamadas fallan a la vez comparten UNA sola renovación
let renovando = null;
function renovarTokens() {
  if (!renovando) {
    renovando = (async () => {
      const { refresh_token } = getSesion();
      if (!refresh_token) throw new ApiError({ codigo: 'REFRESH_INVALIDO', mensaje: 'Tu sesión venció.', status: 401 });
      const data = await enviar('/auth/refresh', { refresh_token });
      await guardarSesion({ access_token: data.access_token, refresh_token: data.refresh_token });
      return data.access_token;
    })().finally(() => { renovando = null; });
  }
  return renovando;
}

export async function post(ruta, cuerpo = {}, { auth = true } = {}) {
  if (!auth) return enviar(ruta, cuerpo, null);
  try {
    return await enviar(ruta, cuerpo, getSesion().access_token);
  } catch (e) {
    const venció = e instanceof ApiError && e.status === 401 && ['TOKEN_EXPIRADO', 'NO_AUTENTICADO'].includes(e.codigo);
    if (!venció) throw e;
    try {
      const nuevo = await renovarTokens();
      return await enviar(ruta, cuerpo, nuevo);
    } catch (e2) {
      // Si falló la renovación por un motivo de sesión, cerramos sesión; si fue de red, solo propagamos el error
      if (e2 instanceof ApiError && e2.status === 401) {
        await limpiarSesion();
        notificarSesionPerdida();
      }
      throw e2;
    }
  }
}
