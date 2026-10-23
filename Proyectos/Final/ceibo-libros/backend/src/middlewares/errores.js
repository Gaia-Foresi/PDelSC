// Manejo centralizado de errores: siempre responde { ok:false, error:{ codigo, mensaje, detalles? } }.
const { HttpError } = require('../utils/httpError');
const { entorno } = require('../config/env');

const responder = (res, status, codigo, mensaje, detalles) =>
  res.status(status).json({ ok: false, error: { codigo, mensaje, ...(detalles ? { detalles } : {}) } });

/** Solo se aceptan POST (y OPTIONS para CORS). */
function soloPost(req, res, next) {
  if (req.method === 'POST' || req.method === 'OPTIONS') return next();
  res.set('Allow', 'POST');
  return responder(res, 405, 'METODO_NO_PERMITIDO', 'Esta API solo acepta el método POST.');
}

function noEncontrado(req, res) {
  return responder(res, 404, 'NO_ENCONTRADO', 'Ruta inexistente.');
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(e, req, res, next) {
  if (e instanceof HttpError) return responder(res, e.status, e.codigo, e.message, e.detalles);

  // JSON mal formado en el body
  if (e.type === 'entity.parse.failed') return responder(res, 400, 'VALIDACION', 'El cuerpo de la petición no es un JSON válido.');
  if (e.type === 'entity.too.large') return responder(res, 400, 'VALIDACION', 'El cuerpo de la petición es demasiado grande.');

  // Claves únicas / foráneas de MySQL
  if (e.code === 'ER_DUP_ENTRY') return responder(res, 409, 'DUPLICADO', 'Ya existe un registro con esos datos.');
  if (e.code === 'ER_NO_REFERENCED_ROW_2') return responder(res, 400, 'VALIDACION', 'Hace referencia a un registro que no existe.');
  if (e.code === 'ER_ROW_IS_REFERENCED_2') return responder(res, 409, 'LIBRO_EN_USO', 'No se puede eliminar: está en uso.');

  console.error('[ERROR]', req.method, req.originalUrl, entorno === 'production' ? e.message : e);
  return responder(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Probá de nuevo en un momento.');
}

module.exports = { soloPost, noEncontrado, manejarErrores };
