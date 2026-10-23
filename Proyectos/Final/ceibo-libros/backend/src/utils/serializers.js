// Convierte filas de la base en los objetos públicos que devuelve la API.

/** Fila de `usuarios` (+ `rol` ya resuelto con JOIN a roles) → objeto público. Nunca expone el hash. */
function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    rol: u.rol,
    estado: u.estado,
    motivo_bloqueo: u.estado === 'bloqueado' ? u.motivo_bloqueo : null,
    telefono: u.telefono,
    curso: u.curso,
    dni: u.dni,
    foto_url: u.foto_url,
    dos_pasos_activo: !!u.dos_pasos_activo,
    creado_en: u.creado_en,
  };
}

/** SELECT base de usuarios con su rol (sin password_hash). */
const SQL_USUARIO = `
  SELECT u.id, u.nombre, u.apellido, u.email, r.nombre AS rol, u.estado, u.motivo_bloqueo,
         u.telefono, u.curso, u.dni, u.foto_url, u.dos_pasos_activo, u.email_verificado, u.creado_en
  FROM usuarios u JOIN roles r ON r.id = u.rol_id`;

module.exports = { usuarioPublico, SQL_USUARIO };
