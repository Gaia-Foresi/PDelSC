// Qué secciones del manual ve cada rol y cómo se numeran. Lo usan la pantalla del manual y el generador de PDF.
import manual from './manual.json';

export const ROLES: Record<string, { etiqueta: string; titulo: string; archivo: string }> = {
  usuario: { etiqueta: 'Usuario (lector)', titulo: 'Manual del usuario', archivo: 'manual-usuario' },
  bibliotecario: { etiqueta: 'Bibliotecario', titulo: 'Manual del bibliotecario', archivo: 'manual-bibliotecario' },
  gerente: { etiqueta: 'Gerente', titulo: 'Manual del gerente', archivo: 'manual-gerente' },
};

// Cada rol ve las secciones generales + las propias (el gerente ve también todo lo del personal)
export const veSeccion = (seccion: any, rol: string) => {
  if (seccion.para === 'todos') return true;
  if (rol === 'gerente') return seccion.para !== 'usuario';
  return seccion.para === rol;
};

// Secciones del rol, ya numeradas desde 1 (cada manual tiene su propia numeración)
export const seccionesDe = (rol: string) => (manual.secciones as any[])
  .filter((s) => veSeccion(s, rol))
  .map((s: any, i: number) => ({ ...s, numero: i + 1, tituloNumerado: `${i + 1}. ${s.titulo}` }));
