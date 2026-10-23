// Valida (y limpia) req.body con un esquema zod. Responde 400 con el detalle por campo.
const { err } = require('../utils/httpError');

module.exports = (esquema) => (req, res, next) => {
  const r = esquema.safeParse(req.body ?? {});
  if (!r.success) {
    const detalles = {};
    for (const i of r.error.issues) {
      const campo = i.path.join('.') || 'body';
      if (!detalles[campo]) detalles[campo] = i.message;
    }
    return next(err.validacion('Revisá los datos ingresados.', detalles));
  }
  req.body = r.data;
  next();
};
