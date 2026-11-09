import express from 'express';
import * as mensajes from '../controllers/mensajes.js';
import * as gestion from '../controllers/gestion.js';
import autenticar from '../middlewares/auth.js';
import { requiereRol, STAFF } from '../middlewares/roles.js';
import validar from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { z, id, texto, textoOpc, email } from '../utils/esquemas.js';
import { PERIODOS } from '../services/informes.js';

const { Router } = express;

const vacio = z.object({}).passthrough();
const soloId = z.object({ id });
const w = asyncHandler;

// ------------------------------------------------------------------- mensajes
const mensajesRouter = Router();
mensajesRouter.use(autenticar);
mensajesRouter.post('/hilos', validar(z.object({ respondidos: z.boolean().optional() })), w(mensajes.hilos));
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
notificaciones.post('/push/registrar', validar(z.object({ token: z.string().min(10).max(200), plataforma: z.enum(['android', 'ios']).optional() })), w(gestion.pushRegistrar));
notificaciones.post('/push/quitar', validar(z.object({ token: z.string().min(10).max(200) })), w(gestion.pushQuitar));
notificaciones.post('/cantidad', validar(vacio), w(gestion.notifCantidad));

// ------------------------------------------------------------- distribuidoras
const telefono = textoOpc(30);
const distribuidoras = Router();
distribuidoras.use(autenticar, requiereRol('gerente'));
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
reposicion.use(autenticar, requiereRol('gerente'));
reposicion.post('/crear', validar(z.object({
  distribuidora_id: id,
  mensaje: textoOpc(1000),
  items: z.array(item).min(1, 'Agregá al menos un libro').max(50, 'Máximo 50 renglones'),
})), w(gestion.reposicionCrear));
reposicion.post('/listar', validar(vacio), w(gestion.reposicionListar));

// ---------------------------------------------------------------- estadísticas
const estadisticas = Router();
estadisticas.use(autenticar, requiereRol('gerente'));
estadisticas.post('/resumen', validar(vacio), w(gestion.resumen));
estadisticas.post('/meses', validar(vacio), w(gestion.mesesInforme));
estadisticas.post('/exportar', validar(z.object({
  periodo: z.enum(PERIODOS, { message: 'Período inválido' }).optional(),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido').optional(),
}).refine((d) => d.periodo !== 'mes' || !!d.mes, { message: 'Elegí un mes', path: ['mes'] })), w(gestion.exportar));
estadisticas.post('/analizar', validar(z.object({
  archivos: z.array(z.object({ nombre: texto(200), contenido: z.string().min(20, 'Archivo vacío') }))
    .min(1, 'Subí al menos un archivo').max(12, 'Máximo 12 archivos')
    .refine((a) => a.reduce((s, x) => s + x.contenido.length, 0) <= 5_500_000, 'Los archivos pesan demasiado (máximo 4 MB en total)'),
})), w(gestion.analizar));

export { mensajesRouter as mensajes, notificaciones, distribuidoras, reposicion, estadisticas };
