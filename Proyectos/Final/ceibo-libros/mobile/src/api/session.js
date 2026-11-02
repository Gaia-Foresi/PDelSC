// Guarda en memoria (y en el almacenamiento seguro) la sesión: tokens + usuario.
import { borrar, guardar, leer } from '../utils/storage';

// Clave para almacenar la sesión en el almacenamiento seguro
const KEY = 'ceibo.sesion';
let sesion = { access_token: null, refresh_token: null, usuario: null };
let alPerderSesion = () => {};

// Funciones para gestionar la sesión
export const getSesion = () => sesion;
export const setAlPerderSesion = (fn) => { alPerderSesion = fn; };
export const notificarSesionPerdida = () => alPerderSesion();

// Carga la sesión desde el almacenamiento seguro (si existe) y la guarda en memoria
export async function cargarSesion() {
  const guardada = await leer(KEY);
  if (guardada?.refresh_token) sesion = { access_token: guardada.access_token || null, refresh_token: guardada.refresh_token, usuario: guardada.usuario || null };
  return sesion;
}

// Guarda la sesión en memoria y en el almacenamiento seguro
export async function guardarSesion(parcial) {
  sesion = { ...sesion, ...parcial };
  await guardar(KEY, sesion);
  return sesion;
}

// Borra la sesión de memoria y del almacenamiento seguro
export async function limpiarSesion() {
  sesion = { access_token: null, refresh_token: null, usuario: null };
  await borrar(KEY);
}
