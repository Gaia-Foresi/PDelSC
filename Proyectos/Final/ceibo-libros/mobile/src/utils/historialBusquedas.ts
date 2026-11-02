// Historial de búsquedas del lector: se guarda en el dispositivo, por usuario, con la fecha de cada búsqueda.
// Formato guardado: [{ q: 'borges', fecha: '2026-11-02T18:00:00.000Z' }, ...] (la más nueva primero).
// Se aceptan también listas viejas de solo textos (sin fecha).
import { guardar, leer } from './storage';

export interface BusquedaGuardada {
  q: string;
  fecha: string | null;
}

export const MAX_HISTORIAL = 40;

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

/** Agrega una búsqueda al principio (si ya estaba, la sube y actualiza la fecha). Devuelve la lista nueva. */
export async function recordarBusqueda(usuarioId: number | string | null | undefined, texto: string): Promise<BusquedaGuardada[]> {
  const limpio = texto.trim().slice(0, 80);
  const actual = await leerHistorial(usuarioId);
  if (limpio.length < 2) return actual;
  const nueva = [{ q: limpio, fecha: new Date().toISOString() }, ...actual.filter((h) => h.q.toLowerCase() !== limpio.toLowerCase())].slice(0, MAX_HISTORIAL);
  await guardarHistorial(usuarioId, nueva);
  return nueva;
}

export async function quitarBusqueda(usuarioId: number | string | null | undefined, texto: string): Promise<BusquedaGuardada[]> {
  const nueva = (await leerHistorial(usuarioId)).filter((h) => h.q !== texto);
  await guardarHistorial(usuarioId, nueva);
  return nueva;
}

export const borrarHistorial = (usuarioId?: number | string | null) => guardarHistorial(usuarioId, []);
