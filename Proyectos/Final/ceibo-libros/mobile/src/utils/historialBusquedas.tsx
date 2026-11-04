// Historial de búsquedas del lector: se guarda en el dispositivo, por usuario, con la fecha de cada búsqueda.
// Formato guardado: [{ q: 'borges', fecha: '2026-11-02T18:00:00.000Z' }, ...] (la más nueva primero).
// Se aceptan también listas viejas de solo textos (sin fecha).
import { guardar, leer } from './storage';

export interface BusquedaGuardada {
  q: string;
  fecha: string | null;
}

export const MAX_HISTORIAL = 200; // historial completo
export const MAX_RAPIDO = 5; // historial rápido (debajo del buscador)

export const claveHistorial = (usuarioId?: number | string | null) => `historial_busquedas_${usuarioId || 'anon'}`;

export async function leerHistorial(usuarioId?: number | string | null): Promise<BusquedaGuardada[]> {
  const guardado = await leer(claveHistorial(usuarioId));
  if (!Array.isArray(guardado)) return [];
  return guardado
    .map((h: any) => (typeof h === 'string' ? { q: h, fecha: null } : { q: String(h?.q || ''), fecha: h?.fecha || null }))
    .filter((h) => h.q.trim().length > 0);
}

export function guardarHistorial(usuarioId: number | string | null | undefined, lista: BusquedaGuardada[]) {
  return guardar(claveHistorial(usuarioId), lista.slice(0, MAX_HISTORIAL));
}

// Historial rápido: una lista aparte, de hasta 5 búsquedas. Al llegar al límite entra la nueva y sale la más antigua.
// Quitar algo del rápido NO lo quita del historial completo (que guarda todo lo buscado).
export const claveRapido = (usuarioId?: number | string | null) => `historial_rapido_${usuarioId || 'anon'}`;

export async function leerRapido(usuarioId?: number | string | null): Promise<BusquedaGuardada[]> {
  const guardado = await leer(claveRapido(usuarioId));
  if (!Array.isArray(guardado)) return (await leerHistorial(usuarioId)).slice(0, MAX_RAPIDO); // primera vez: las 5 últimas del completo
  return guardado
    .map((h: any) => ({ q: String(h?.q || ''), fecha: h?.fecha || null }))
    .filter((h) => h.q.trim().length > 0)
    .slice(0, MAX_RAPIDO);
}

const guardarRapido = (usuarioId: number | string | null | undefined, lista: BusquedaGuardada[]) =>
  guardar(claveRapido(usuarioId), lista.slice(0, MAX_RAPIDO));

/** Anota una búsqueda en el historial completo y en el rápido (si ya estaba, sube y actualiza la fecha). Devuelve el rápido. */
export async function recordarBusqueda(usuarioId: number | string | null | undefined, texto: string): Promise<BusquedaGuardada[]> {
  const limpio = texto.trim().slice(0, 80);
  if (limpio.length < 2) return leerRapido(usuarioId);
  const fecha = new Date().toISOString();
  const otras = (lista: BusquedaGuardada[]) => lista.filter((h) => h.q.toLowerCase() !== limpio.toLowerCase());
  const completo = [{ q: limpio, fecha }, ...otras(await leerHistorial(usuarioId))].slice(0, MAX_HISTORIAL);
  await guardarHistorial(usuarioId, completo);
  const rapido = [{ q: limpio, fecha }, ...otras(await leerRapido(usuarioId))].slice(0, MAX_RAPIDO);
  await guardarRapido(usuarioId, rapido);
  return rapido;
}

/** Quita una búsqueda solo del historial rápido. */
export async function quitarDelRapido(usuarioId: number | string | null | undefined, texto: string): Promise<BusquedaGuardada[]> {
  const nueva = (await leerRapido(usuarioId)).filter((h) => h.q !== texto);
  await guardarRapido(usuarioId, nueva);
  return nueva;
}

/** Vacía el historial rápido (el completo queda como está). */
export const borrarRapido = (usuarioId?: number | string | null) => guardarRapido(usuarioId, []);

export async function quitarBusqueda(usuarioId: number | string | null | undefined, texto: string): Promise<BusquedaGuardada[]> {
  const nueva = (await leerHistorial(usuarioId)).filter((h) => h.q !== texto);
  await guardarHistorial(usuarioId, nueva);
  return nueva;
}

/** Borra el historial completo (y también el rápido, que sale de él). */
export const borrarHistorial = async (usuarioId?: number | string | null) => { await guardarHistorial(usuarioId, []); await guardarRapido(usuarioId, []); };
