// Uso: router.post('/ruta', validar(esquema), controlador). Si los datos están mal, ni llega al controlador.
// Valida (y limpia) req.body con un esquema zod. Responde 400 con el detalle por campo.
import { err } from '../utils/httpError.js';

export default (esquema) => (req, res, next) => {
  // safeParse revisa el body contra el esquema sin tirar error: devuelve { success, data } o { success, error }.
  const r = esquema.safeParse(req.body ?? {});
  if (!r.success) {
    // Armamos un objeto { campo: 'mensaje de error' } para que la app marque cada campo.
    const detalles = {};
    for (const i of r.error.issues) {
      const campo = i.path.join('.') || 'body';
      if (!detalles[campo]) detalles[campo] = i.message;
    }
    return next(err.validacion('Revisá los datos ingresados.', detalles));
  }
  // Si está todo bien, reemplazamos el body por la versión limpia (sin espacios de más, emails en minúscula, etc.).
  req.body = r.data;
  next();
};
