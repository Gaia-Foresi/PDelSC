// Control de acceso por rol. Uso: router.post('/ruta', requiereRol('dueno', 'bibliotecario'), ...)
import { err } from '../utils/httpError.js';

const STAFF = ['dueno', 'bibliotecario'];

const requiereRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : next(err.sinPermiso());

export const esStaff = (u) => STAFF.includes(u.rol);
export { requiereRol, STAFF };
