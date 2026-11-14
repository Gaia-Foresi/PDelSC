// Control de acceso por rol. Uso: router.post('/ruta', requiereRol('gerente', 'bibliotecario'), ...)
import { err } from '../utils/httpError.js';

// Staff = personal de la biblioteca.
const STAFF = ['gerente', 'bibliotecario'];

// requiereRol('gerente') devuelve un middleware: si el rol del usuario está en la lista, sigue (next());
// si no, corta con error 403 "sin permiso".
const requiereRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : next(err.sinPermiso());

// Ayuda rápida: ¿este usuario es gerente o bibliotecario?
export const esStaff = (u) => STAFF.includes(u.rol);
export { requiereRol, STAFF };
