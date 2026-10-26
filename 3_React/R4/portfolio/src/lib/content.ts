// ============================================================
//  CONTENIDO DEL PORTFOLIO
// ------------------------------------------------------------
//  Se pide todo a /api/contenido. Si la API no responde
//  (por ejemplo corriendo solo "npm run dev"), se usa el
//  contenido por defecto para que la página igual se vea.
// ============================================================
import {
  SEED_PERFIL,
  SEED_HABILIDADES,
  SEED_EXPERIENCIAS,
  SEED_PROYECTOS,
} from '../../server/schema';

export interface Habilidad {
  id: number;
  nombre: string;
  nivel: number;
  categoria: string;
}

export interface Experiencia {
  id: number;
  titulo: string;
  lugar: string;
  fecha: string;
  descripcion: string; // una línea por ítem
  tecnologias: string; // separadas por coma
}

export interface Proyecto {
  id: number;
  nombre: string;
  fecha: string;
  descripcion: string;
  tecnologias: string;
  caracteristicas: string;
  link: string;
  github: string;
}

export interface Content {
  perfil: Record<string, string>;
  habilidades: Habilidad[];
  experiencias: Experiencia[];
  proyectos: Proyecto[];
}

export const CATEGORIAS: Record<string, string> = {
  programacion: 'Programación',
  frontend: 'Frontend',
  backend: 'Backend y bases de datos',
  tools: 'Herramientas',
  soft: 'Habilidades blandas',
};

export function defaultContent(): Content {
  return {
    perfil: { ...SEED_PERFIL },
    habilidades: SEED_HABILIDADES.map(([nombre, nivel, categoria], i) => ({
      id: i + 1,
      nombre,
      nivel,
      categoria,
    })),
    experiencias: SEED_EXPERIENCIAS.map((e, i) => ({ id: i + 1, ...e })),
    proyectos: SEED_PROYECTOS.map((p, i) => ({ id: i + 1, link: '', github: '', ...p })),
  };
}

export async function loadContent(): Promise<Content> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('/api/contenido', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Content;
    // Completa con valores por defecto las claves que falten
    data.perfil = { ...defaultContent().perfil, ...data.perfil };
    return data;
  } catch (err) {
    console.warn('⚠️ No se pudo cargar el contenido desde la API. Uso el contenido por defecto.', err);
    return defaultContent();
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Ayudas para mostrar texto de forma segura ----------
export function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa el texto y convierte **así** en negrita */
export function rich(text: string): string {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export const lines = (t: string) =>
  (t || '').split('\n').map(s => s.trim()).filter(Boolean);

export const commas = (t: string) =>
  (t || '').split(',').map(s => s.trim()).filter(Boolean);

/** Solo deja pasar links http(s) */
export function safeUrl(url: string): string {
  return /^https?:\/\//i.test((url || '').trim()) ? url.trim() : '';
}
