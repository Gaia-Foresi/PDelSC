// Envuelve un controlador async para que los errores lleguen al middleware de errores.
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
