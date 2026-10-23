// Guarda en memoria (y en el almacenamiento seguro) la sesión: tokens + usuario.
import { borrar, guardar, leer } from '../utils/storage';

const KEY = 'ceibo.sesion';
let sesion = { access_token: null, refresh_token: null, usuario: null };
let alPerderSesion = () => {};

export const getSesion = () => sesion;
export const setAlPerderSesion = (fn) => { alPerderSesion = fn; };
export const notificarSesionPerdida = () => alPerderSesion();

export async function cargarSesion() {
  const guardada = await leer(KEY);
  if (guardada?.refresh_token) sesion = { access_token: guardada.access_token || null, refresh_token: guardada.refresh_token, usuario: guardada.usuario || null };
  return sesion;
}

export async function guardarSesion(parcial) {
  sesion = { ...sesion, ...parcial };
  await guardar(KEY, sesion);
  return sesion;
}

export async function limpiarSesion() {
  sesion = { access_token: null, refresh_token: null, usuario: null };
  await borrar(KEY);
}
