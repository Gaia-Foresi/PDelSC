// Error con código HTTP y código de negocio, que el middleware de errores convierte en JSON.
class HttpError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const err = {
  validacion: (mensaje = 'Revisá los datos ingresados.', detalles) => new HttpError(400, 'VALIDACION', mensaje, detalles),
  noAutenticado: (mensaje = 'Iniciá sesión para continuar.') => new HttpError(401, 'NO_AUTENTICADO', mensaje),
  credenciales: () => new HttpError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos.'),
  codigoInvalido: () => new HttpError(401, 'CODIGO_INVALIDO', 'El código es incorrecto o ya venció.'),
  sinPermiso: (mensaje = 'No tenés permiso para hacer esto.') => new HttpError(403, 'SIN_PERMISO', mensaje),
  bloqueado: (motivo) =>
    new HttpError(403, 'USUARIO_BLOQUEADO', motivo || 'Tu cuenta está bloqueada. Devolvé los libros pendientes en la biblioteca.'),
  noEncontrado: (que = 'El recurso') => new HttpError(404, 'NO_ENCONTRADO', `${que} no existe.`),
  conflicto: (codigo, mensaje) => new HttpError(409, codigo, mensaje),
  estado: (mensaje) => new HttpError(422, 'ESTADO_INVALIDO', mensaje),
};

module.exports = { HttpError, err };
