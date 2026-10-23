const { Router } = require('express');
const mensajes = require('../controllers/mensajes');
const gestion = require('../controllers/gestion');
const autenticar = require('../middlewares/auth');
const { requiereRol, STAFF } = require('../middlewares/roles');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z, id, texto, textoOpc, email } = require('../utils/esquemas');

const vacio = z.object({}).passthrough();
const soloId = z.object({ id });
const w = asyncHandler;

// ------------------------------------------------------------------- mensajes
const mensajesRouter = Router();
mensajesRouter.use(autenticar);
mensajesRouter.post('/hilos', validar(vacio), w(mensajes.hilos));
mensajesRouter.post('/hilo', validar(z.object({ hilo_id: id })), w(mensajes.hilo));
mensajesRouter.post('/crear', validar(z.object({
  tipo: z.enum(['consulta', 'interno'], { message: 'Tipo inválido' }),
  asunto: texto(140),
  cuerpo: texto(2000),
  destinatario_id: id.optional(),
})), w(mensajes.crear));
mensajesRouter.post('/enviar', validar(z.object({ hilo_id: id, cuerpo: texto(2000) })), w(mensajes.enviar));
mensajesRouter.post('/no-leidos', validar(vacio), w(mensajes.noLeidos));
mensajesRouter.post('/contactos', requiereRol(...STAFF), validar(vacio), w(mensajes.contactos));

// -------------------------------------------------------------- notificaciones
const notificaciones = Router();
notificaciones.use(autenticar);
notificaciones.post('/listar', validar(z.object({ solo_no_leidas: z.boolean().optional() })), w(gestion.notifListar));
notificaciones.post('/marcar-leidas', validar(z.object({ ids: z.array(id).max(200).optional() })), w(gestion.notifMarcarLeidas));
notificaciones.post('/cantidad', validar(vacio), w(gestion.notifCantidad));

// ------------------------------------------------------------- distribuidoras
const telefono = textoOpc(30);
const distribuidoras = Router();
distribuidoras.use(autenticar, requiereRol('dueno'));
distribuidoras.post('/listar', validar(vacio), w(gestion.distListar));
distribuidoras.post('/crear', validar(z.object({ nombre: texto(100), email, telefono })), w(gestion.distCrear));
distribuidoras.post('/actualizar', validar(z.object({ id, nombre: texto(100).optional(), email: email.optional(), telefono })), w(gestion.distActualizar));
distribuidoras.post('/eliminar', validar(soloId), w(gestion.distEliminar));

// ------------------------------------------------------------------ reposición
const item = z.object({
  libro_id: id.optional(),
  titulo: z.string().trim().min(1, 'Obligatorio').max(160, 'Máximo 160 caracteres').optional(),
  cantidad: z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').min(1, 'Mínimo 1').max(500, 'Máximo 500'),
}).refine((i) => i.libro_id || i.titulo, { message: 'Elegí un libro o escribí un título', path: ['titulo'] });

const reposicion = Router();
reposicion.use(autenticar, requiereRol('dueno'));
reposicion.post('/crear', validar(z.object({
  distribuidora_id: id,
  mensaje: textoOpc(1000),
  items: z.array(item).min(1, 'Agregá al menos un libro').max(50, 'Máximo 50 renglones'),
})), w(gestion.reposicionCrear));
reposicion.post('/listar', validar(vacio), w(gestion.reposicionListar));

// ---------------------------------------------------------------- estadísticas
const estadisticas = Router();
estadisticas.use(autenticar, requiereRol('dueno'));
estadisticas.post('/resumen', validar(vacio), w(gestion.resumen));

module.exports = { mensajes: mensajesRouter, notificaciones, distribuidoras, reposicion, estadisticas };
