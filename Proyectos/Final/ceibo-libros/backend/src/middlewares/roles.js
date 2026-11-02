// Control de acceso por rol. Uso: router.post('/ruta', requiereRol('dueno', 'bibliotecario'), ...)
const { err } = require('../utils/httpError');

// Roles de usuarios que pueden acceder a la interfaz de administración (staff). 
// Los demás usuarios solo pueden acceder a la interfaz de usuario.
const STAFF = ['dueno', 'bibliotecario'];

// Solo permite el acceso si el usuario tiene alguno de los roles indicados. Si no, devuelve un error 403.
const requiereRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : next(err.sinPermiso());

module.exports = { requiereRol, STAFF, esStaff: (u) => STAFF.includes(u.rol) };
