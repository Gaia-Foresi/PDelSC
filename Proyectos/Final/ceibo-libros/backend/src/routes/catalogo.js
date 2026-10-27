const { Router } = require('express');
const ctl = require('../controllers/catalogo');
const autenticar = require('../middlewares/auth');
const { requiereRol, STAFF } = require('../middlewares/roles');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z, id, texto, textoOpc, color, urlOpc } = require('../utils/esquemas');

const vacio = z.object({}).passthrough();
const soloId = z.object({ id });

const categoriaBase = {
  codigo: texto(5),
  nombre: texto(60),
  descripcion: textoOpc(255),
  icono: texto(40),
  color,
};
const S = {
  catCrear: z.object({ ...categoriaBase, descripcion: textoOpc(255), icono: categoriaBase.icono.optional(), color: color.optional() }),
  catActualizar: z.object({
    id,
    codigo: categoriaBase.codigo.optional(),
    nombre: categoriaBase.nombre.optional(),
    descripcion: textoOpc(255),
    icono: categoriaBase.icono.optional(),
    color: color.optional(),
  }),
  libroListar: z.object({
    categoria_id: id.optional(),
    q: z.string().trim().max(80).optional(),
    solo_disponibles: z.boolean().optional(),
  }),
  libroCrear: z.object({
    titulo: texto(160),
    autor: texto(120),
    categoria_id: id.optional(),
    categoria_ids: z.array(id).min(1, 'Elegí al menos una categoría').max(6, 'Máximo 6 categorías').optional(),
    descripcion: textoOpc(2000),
    stock_total: z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').min(0, 'No puede ser negativo').max(1000, 'Máximo 1000'),
    portada_url: urlOpc,
  }),
  libroActualizar: z.object({
    id,
    titulo: texto(160).optional(),
    autor: texto(120).optional(),
    categoria_id: id.optional(),
    categoria_ids: z.array(id).min(1, 'Elegí al menos una categoría').max(6, 'Máximo 6 categorías').optional(),
    descripcion: textoOpc(2000),
    stock_total: z.coerce.number().int('Debe ser entero').min(0, 'No puede ser negativo').max(1000, 'Máximo 1000').optional(),
    portada_url: urlOpc,
  }),
};

const categorias = Router();
categorias.use(autenticar);
categorias.post('/listar', validar(vacio), asyncHandler(ctl.categoriasListar));
categorias.post('/crear', requiereRol(...STAFF), validar(S.catCrear), asyncHandler(ctl.categoriasCrear));
categorias.post('/actualizar', requiereRol(...STAFF), validar(S.catActualizar), asyncHandler(ctl.categoriasActualizar));
categorias.post('/eliminar', requiereRol('dueno'), validar(soloId), asyncHandler(ctl.categoriasEliminar));

const libros = Router();
libros.use(autenticar);
libros.post('/listar', validar(S.libroListar), asyncHandler(ctl.librosListar));
libros.post('/detalle', validar(soloId), asyncHandler(ctl.librosDetalle));
libros.post('/historial', requiereRol(...STAFF), validar(soloId), asyncHandler(ctl.librosHistorial));
libros.post('/crear', requiereRol(...STAFF), validar(S.libroCrear), asyncHandler(ctl.librosCrear));
libros.post('/actualizar', requiereRol(...STAFF), validar(S.libroActualizar), asyncHandler(ctl.librosActualizar));
libros.post('/buscar-portada', requiereRol(...STAFF), validar(z.object({ titulo: texto(160), autor: textoOpc(120) })), asyncHandler(ctl.librosBuscarPortada));
libros.post('/eliminar', requiereRol('dueno'), validar(soloId), asyncHandler(ctl.librosEliminar));

module.exports = { categorias, libros };
