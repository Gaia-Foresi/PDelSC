const { Router } = require('express');
const ctl = require('../controllers/prestamos');
const autenticar = require('../middlewares/auth');
const { requiereRol, STAFF } = require('../middlewares/roles');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z, id, texto, curso, dni } = require('../utils/esquemas');
const { reglas } = require('../config/env');

const vacio = z.object({}).passthrough();
const dias = (max) => z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').min(1, 'Mínimo 1 día').max(max, `Máximo ${max} días`);
const libroIds = z.array(id, { required_error: 'Obligatorio', invalid_type_error: 'Debe ser una lista' })
  .min(1, 'Elegí al menos un libro').max(reglas.prestamoMaxLibros, `Máximo ${reglas.prestamoMaxLibros} libros`);

const fechaHora = z.string({ required_error: 'Obligatorio' }).datetime({ message: 'Fecha y hora inválidas' });

const S = {
  crear: z.object({
    usuario_id: id, libro_ids: libroIds, dias: dias(60).optional(),
    nombre: texto(60).optional(), apellido: texto(60).optional(), curso: curso.optional(), dni: dni.optional(),
    visita: fechaHora.optional(),
  }),
  listar: z.object({
    estado: z.enum(['activo', 'cerrado', 'vencido']).optional(),
    usuario_id: id.optional(),
    q: z.string().trim().max(80).optional(),
  }),
  soloId: z.object({ id }),
  agregar: z.object({ prestamo_id: id, libro_ids: libroIds }),
  devolver: z.object({ prestamo_id: id, libro_id: id.optional() }),
  extender: z.object({ prestamo_id: id, dias: dias(30) }),
  reservaCrear: z.object({
    libro_id: id, tipo: z.enum(['sala', 'retiro'], { message: 'Tipo inválido' }),
    nombre: texto(60), apellido: texto(60), curso, dni, visita: fechaHora,
  }),
  horarios: z.object({ tipo: z.enum(['sala', 'retiro']) }),
  reservaEstado: z.object({ estado: z.enum(['activa', 'cumplida', 'cancelada', 'vencida']).optional() }),
  reservaListar: z.object({
    estado: z.enum(['activa', 'cumplida', 'cancelada', 'vencida']).optional(),
    q: z.string().trim().max(80).optional(),
  }),
  atender: z.object({ id, dias: dias(60).optional() }),
};

const prestamos = Router();
prestamos.use(autenticar);
prestamos.post('/crear', requiereRol(...STAFF), validar(S.crear), asyncHandler(ctl.prestamosCrear));
prestamos.post('/mis', validar(vacio), asyncHandler(ctl.prestamosMis));
prestamos.post('/listar', requiereRol(...STAFF), validar(S.listar), asyncHandler(ctl.prestamosListar));
prestamos.post('/detalle', validar(S.soloId), asyncHandler(ctl.prestamosDetalle));
prestamos.post('/agregar-libros', requiereRol(...STAFF), validar(S.agregar), asyncHandler(ctl.prestamosAgregarLibros));
prestamos.post('/devolver', requiereRol(...STAFF), validar(S.devolver), asyncHandler(ctl.prestamosDevolver));
prestamos.post('/extender', requiereRol(...STAFF), validar(S.extender), asyncHandler(ctl.prestamosExtender));

const reservas = Router();
reservas.use(autenticar);
reservas.post('/horarios', validar(S.horarios), asyncHandler(ctl.reservasHorarios));
reservas.post('/crear', validar(S.reservaCrear), asyncHandler(ctl.reservasCrear));
reservas.post('/mis', validar(S.reservaEstado), asyncHandler(ctl.reservasMis));
reservas.post('/listar', requiereRol(...STAFF), validar(S.reservaListar), asyncHandler(ctl.reservasListar));
reservas.post('/cancelar', validar(S.soloId), asyncHandler(ctl.reservasCancelar));
reservas.post('/atender', requiereRol(...STAFF), validar(S.atender), asyncHandler(ctl.reservasAtender));

module.exports = { prestamos, reservas };
