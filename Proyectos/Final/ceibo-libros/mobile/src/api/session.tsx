// Guarda en memoria (y en el almacenamiento seguro) la sesión: tokens + usuario.
import { borrar, guardar, leer } from '../utils/storage';
import type { SesionGuardada } from '../types';

const KEY = 'ceibo.sesion';
// La sesión vive en una variable (rápido de leer) y también se guarda en el almacenamiento del celular.
let sesion: SesionGuardada = { access_token: null, refresh_token: null, usuario: null };
// Función que se ejecuta si la sesión se pierde (la configura AuthContext para volver al login).
let alPerderSesion: () => void = () => {};

export const getSesion = () => sesion;
export const setAlPerderSesion = (fn: () => void) => { alPerderSesion = fn; };
export const notificarSesionPerdida = () => alPerderSesion();

// Al abrir la app, lee la sesión guardada en el celular.
export async function cargarSesion() {
  const guardada = await leer(KEY);
  if (guardada?.refresh_token) {
    // Sesiones guardadas antes del cambio de nombre del rol
    const usuario = guardada.usuario && !['usuario', 'bibliotecario', 'gerente'].includes((guardada.usuario as any).rol) ? { ...guardada.usuario, rol: 'gerente' } : guardada.usuario || null;
    sesion = { access_token: guardada.access_token || null, refresh_token: guardada.refresh_token, usuario } as SesionGuardada;
  }
  return sesion;
}

// Guarda una parte de la sesión (por ejemplo, solo los tokens nuevos) sin perder el resto.
export async function guardarSesion(parcial: Partial<SesionGuardada>) {
  sesion = { ...sesion, ...parcial };
  await guardar(KEY, sesion);
  return sesion;
}

// Borra la sesión (al cerrar sesión).
export async function limpiarSesion() {
  sesion = { access_token: null, refresh_token: null, usuario: null };
  await borrar(KEY);
}
