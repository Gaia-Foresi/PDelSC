// Control de acceso por rol. Uso: router.post('/ruta', requiereRol('dueno', 'bibliotecario'), ...)
const { err } = require('../utils/httpError');

const STAFF = ['dueno', 'bibliotecario'];

const requiereRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : next(err.sinPermiso());

module.exports = { requiereRol, STAFF, esStaff: (u) => STAFF.includes(u.rol) };
