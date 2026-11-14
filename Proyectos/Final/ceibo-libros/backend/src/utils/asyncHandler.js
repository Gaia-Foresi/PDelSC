// Envuelve un controlador async para que los errores lleguen al middleware de errores.
// Sin esto, si una función async tira un error, Express no se entera y el pedido queda colgado.
// Con esto, el error se pasa con next(error) al middleware de errores.
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
