const router = require('express').Router();
const ctl = require('../controllers/usuarios');
const autenticar = require('../middlewares/auth');
const { requiereRol, STAFF } = require('../middlewares/roles');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z, id, texto, textoOpc, password, curso, dni } = require('../utils/esquemas');

const S = {
  vacio: z.object({}).passthrough(),
  actualizar: z.object({
    nombre: texto(60).optional(),
    apellido: z.string().trim().max(60).optional(),
    telefono: textoOpc(30),
    curso: curso.optional(),
    dni: dni.optional(),
    // URL (https://...) o imagen subida desde la galería, ya reducida por la app (data:image/jpeg;base64,...)
    foto_url: z.string().trim().max(300000, 'La imagen es demasiado grande')
      .refine((v) => v === '' || /^https?:\/\//.test(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v), 'Debe ser una URL o una imagen válida')
      .nullish(),
  }),
  cambiarPassword: z.object({ password_actual: z.string().max(72).optional(), password_nueva: password }),
  dosPasos: z.object({ activar: z.boolean({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser verdadero o falso' }) }),
  listar: z.object({
    q: z.string().trim().max(80).optional(),
    rol: z.enum(['dueno', 'bibliotecario', 'usuario']).optional(),
    estado: z.enum(['activo', 'bloqueado']).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(30),
  }),
  id: z.object({ id }),
  bloquear: z.object({ id, motivo: texto(255) }),
  cambiarRol: z.object({ id, rol: z.enum(['dueno', 'bibliotecario', 'usuario'], { message: 'Rol inválido' }) }),
};

const usuarios = router;
usuarios.use(autenticar);
usuarios.post('/perfil', validar(S.vacio), asyncHandler(ctl.perfil));
usuarios.post('/actualizar-perfil', validar(S.actualizar), asyncHandler(ctl.actualizarPerfil));
usuarios.post('/cambiar-password', validar(S.cambiarPassword), asyncHandler(ctl.cambiarPassword));
usuarios.post('/dos-pasos', validar(S.dosPasos), asyncHandler(ctl.dosPasos));
usuarios.post('/listar', requiereRol(...STAFF), validar(S.listar), asyncHandler(ctl.listar));
usuarios.post('/detalle', requiereRol(...STAFF), validar(S.id), asyncHandler(ctl.detalle));
usuarios.post('/bloquear', requiereRol(...STAFF), validar(S.bloquear), asyncHandler(ctl.bloquear));
usuarios.post('/desbloquear', requiereRol(...STAFF), validar(S.id), asyncHandler(ctl.desbloquear));

// Panel de administración
const admin = require('express').Router();
admin.use(autenticar, requiereRol('dueno'));
admin.post('/cambiar-rol', validar(S.cambiarRol), asyncHandler(ctl.cambiarRol));

module.exports = { usuarios, admin };
