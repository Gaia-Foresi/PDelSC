// Qué secciones del manual ve cada rol y cómo se numeran. Lo usan la pantalla del manual y el generador de PDF.
const manual = require('./manual.json');

const ROLES = {
  usuario: { etiqueta: 'Usuario (lector)', titulo: 'Manual del usuario', archivo: 'manual-usuario' },
  bibliotecario: { etiqueta: 'Bibliotecario', titulo: 'Manual del bibliotecario', archivo: 'manual-bibliotecario' },
  dueno: { etiqueta: 'Dueño', titulo: 'Manual del dueño', archivo: 'manual-dueno' },
};

// Cada rol ve las secciones generales + las propias (el dueño ve también todo lo del personal)
const veSeccion = (seccion, rol) => {
  if (seccion.para === 'todos') return true;
  if (rol === 'dueno') return seccion.para !== 'usuario';
  return seccion.para === rol;
};

// Secciones del rol, ya numeradas desde 1 (cada manual tiene su propia numeración)
const seccionesDe = (rol) => manual.secciones
  .filter((s) => veSeccion(s, rol))
  .map((s, i) => ({ ...s, numero: i + 1, tituloNumerado: `${i + 1}. ${s.titulo}` }));

module.exports = { ROLES, veSeccion, seccionesDe };
