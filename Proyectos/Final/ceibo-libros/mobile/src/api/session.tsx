// Guarda en memoria (y en el almacenamiento seguro) la sesión: tokens + usuario.
import { borrar, guardar, leer } from '../utils/storage';
import type { SesionGuardada } from '../types';

const KEY = 'ceibo.sesion';
let sesion: SesionGuardada = { access_token: null, refresh_token: null, usuario: null };
let alPerderSesion: () => void = () => {};

export const getSesion = () => sesion;
export const setAlPerderSesion = (fn: () => void) => { alPerderSesion = fn; };
export const notificarSesionPerdida = () => alPerderSesion();

export async function cargarSesion() {
  const guardada = await leer(KEY);
  if (guardada?.refresh_token) {
    // Sesiones guardadas antes del cambio de nombre del rol
    const usuario = guardada.usuario && (guardada.usuario as any).rol === 'dueno' ? { ...guardada.usuario, rol: 'gerente' } : guardada.usuario || null;
    sesion = { access_token: guardada.access_token || null, refresh_token: guardada.refresh_token, usuario } as SesionGuardada;
  }
  return sesion;
}

export async function guardarSesion(parcial: Partial<SesionGuardada>) {
  sesion = { ...sesion, ...parcial };
  await guardar(KEY, sesion);
  return sesion;
}

export async function limpiarSesion() {
  sesion = { access_token: null, refresh_token: null, usuario: null };
  await borrar(KEY);
}
