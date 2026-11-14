// Error con código HTTP y código de negocio, que el middleware de errores convierte en JSON.
// Clase propia de error: además del mensaje guarda el código HTTP (status),
// un código corto para el frontend (ej. 'EMAIL_EN_USO') y detalles opcionales.
class HttpError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

// "Fábrica" de errores ya armados, para no repetir códigos. Uso: throw err.noEncontrado('El libro')
// 400 = datos mal | 401 = no logueado | 403 = sin permiso | 404 = no existe | 409 = conflicto | 422 = estado inválido
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

export { HttpError, err };
