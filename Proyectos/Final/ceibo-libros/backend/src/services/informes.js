// Informes del gerente: descarga de un Excel con la información del sistema y análisis de varios Excel descargados antes.
// exceljs se carga recién cuando se usa, para no hacer más lento el arranque de la API.
import { consultar } from '../config/db.js';
import { err } from '../utils/httpError.js';
import { hoy, sumarDias, diasEntre } from '../utils/fechas.js';

const HOJA_DETALLE = 'Detalle de libros';
const COLUMNAS_DETALLE = ['ID préstamo', 'ID libro', 'Libro', 'Autor', 'Categoría', 'Lector', 'Curso', 'Fecha de préstamo', 'Vence', 'Devuelto el', 'Estado del ejemplar', 'Vencido', 'Mes'];

const ESTADOS = { PRESTADO: 'Prestado', ESPERA: 'Devuelto - en espera', STOCK: 'Devuelto - en stock', DANADO: 'Dañado' };
// Si un mismo ejemplar aparece en dos archivos, vale el estado más avanzado
const RANGO = { [ESTADOS.PRESTADO]: 1, [ESTADOS.ESPERA]: 2, [ESTADOS.STOCK]: 3, [ESTADOS.DANADO]: 4 };

const fechaCorta = (f) => (f ? new Date(f).toISOString().slice(0, 10) : '');
const estadoDe = (i) => {
  if (!i.devuelto_en) return ESTADOS.PRESTADO;
  if (i.revision === 'danado') return ESTADOS.DANADO;
  if (i.revision === 'pendiente') return ESTADOS.ESPERA;
  return ESTADOS.STOCK;
};

export const PERIODOS = ['todo', 'mes_actual', 'mes_anterior', '3_meses', 'mes'];
export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Rango de fechas (YYYY-MM-DD) y nombre legible de cada período. Con periodo 'mes' se pasa también `mes` (YYYY-MM). */
export function rangoDe(periodo, mes) {
  const h = hoy();
  const [y, m] = h.split('-').map(Number);
  const primero = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  const ultimo = (yy, mm) => sumarDias(primero(mm === 12 ? yy + 1 : yy, mm === 12 ? 1 : mm + 1), -1);
  if (periodo === 'mes' && MES_VALIDO.test(mes || '')) {
    const [yy, mm] = mes.split('-').map(Number);
    return { desde: primero(yy, mm), hasta: ultimo(yy, mm), nombre: `Mes ${mes}` };
  }
  if (periodo === 'mes_actual') return { desde: primero(y, m), hasta: ultimo(y, m), nombre: `Mes actual (${primero(y, m).slice(0, 7)})` };
  if (periodo === 'mes_anterior') {
    const yy = m === 1 ? y - 1 : y; const mm = m === 1 ? 12 : m - 1;
    return { desde: primero(yy, mm), hasta: ultimo(yy, mm), nombre: `Mes anterior (${primero(yy, mm).slice(0, 7)})` };
  }
  if (periodo === '3_meses') return { desde: sumarDias(h, -90), hasta: h, nombre: 'Últimos 3 meses' };
  return { desde: '1970-01-01', hasta: '2999-12-31', nombre: 'Todo el historial' };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (mes) => { const [y, m] = mes.split('-').map(Number); return `${MESES[m - 1]} de ${y}`; };

/** Meses en los que hubo préstamos (para elegir cuál descargar), del más nuevo al más viejo. */
export async function mesesConDatos() {
  const filas = await consultar(
    `SELECT DATE_FORMAT(p.fecha_inicio, '%Y-%m') AS mes, COUNT(DISTINCT p.id) AS prestamos, COUNT(pi.id) AS libros
     FROM prestamos p JOIN prestamo_items pi ON pi.prestamo_id = p.id
     GROUP BY mes ORDER BY mes DESC`);
  return filas.map((f) => ({ mes: f.mes, nombre: nombreMes(f.mes), prestamos: Number(f.prestamos), libros: Number(f.libros) }));
}

async function cargarExcelJS() {
  const mod = await import('exceljs');
  return mod.default || mod;
}

function darFormato(hoja, anchos) {
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4A2E' } };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  (anchos || []).forEach((a, i) => { hoja.getColumn(i + 1).width = a; });
}

/** Arma el Excel con toda la información. Devuelve { buffer, nombre, resumen }. */
export async function generarExcel(periodo = 'todo', mes) {
  if (periodo === 'mes' && !MES_VALIDO.test(mes || '')) throw err.validacion('Elegí un mes válido.');
  const ExcelJS = await cargarExcelJS();
  const rango = rangoDe(periodo, mes);
  const h = hoy();

  const items = await consultar(
    `SELECT p.id AS prestamo_id, pi.libro_id, l.titulo, a.nombre AS autor, c.nombre AS categoria,
            CONCAT(u.nombre, ' ', u.apellido) AS lector, u.curso, p.fecha_inicio, p.fecha_vencimiento, pi.devuelto_en, pi.revision
     FROM prestamo_items pi
     JOIN prestamos p ON p.id = pi.prestamo_id
     JOIN usuarios u ON u.id = p.usuario_id
     JOIN libros l ON l.id = pi.libro_id
     JOIN autores a ON a.id = l.autor_id
     JOIN categorias c ON c.id = l.categoria_id
     WHERE p.fecha_inicio BETWEEN ? AND ? ORDER BY p.id, pi.id`, [rango.desde, rango.hasta]);

  // Un mes elegido sin movimientos no genera Excel: se avisa en vez de bajar un archivo vacío
  if (periodo === 'mes' && !items.length) throw err.conflicto('SIN_DATOS', `En ${nombreMes(mes)} no hubo préstamos, así que no hay Excel para descargar.`);

  const detalle = items.map((i) => {
    const estado = estadoDe(i);
    return [
      i.prestamo_id, i.libro_id, i.titulo, i.autor, i.categoria, i.lector.trim(), i.curso || '',
      i.fecha_inicio, i.fecha_vencimiento, fechaCorta(i.devuelto_en), estado,
      estado === ESTADOS.PRESTADO && i.fecha_vencimiento < h ? 'Sí' : 'No', String(i.fecha_inicio).slice(0, 7),
    ];
  });

  const cuenta = (estado) => detalle.filter((f) => f[10] === estado).length;
  const [t] = await consultar(
    `SELECT (SELECT COUNT(*) FROM libros WHERE activo = 1) AS libros,
            (SELECT COALESCE(SUM(stock_total), 0) FROM libros WHERE activo = 1) AS ejemplares,
            (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'usuario') AS usuarios,
            (SELECT COUNT(*) FROM usuarios WHERE estado = 'bloqueado') AS bloqueados,
            (SELECT COUNT(*) FROM prestamos WHERE estado = 'activo') AS prestamos_activos,
            (SELECT COUNT(*) FROM prestamos WHERE estado = 'activo' AND fecha_vencimiento < ?) AS prestamos_vencidos,
            (SELECT COUNT(*) FROM reservas WHERE estado = 'activa' AND fecha_limite > NOW()) AS reservas_activas`, [h]);

  const resumen = {
    periodo: rango.nombre,
    libros_prestados: detalle.length,
    devueltos: cuenta(ESTADOS.ESPERA) + cuenta(ESTADOS.STOCK) + cuenta(ESTADOS.DANADO),
    no_devueltos: cuenta(ESTADOS.PRESTADO),
    vencidos_sin_devolver: detalle.filter((f) => f[11] === 'Sí').length,
    en_espera: cuenta(ESTADOS.ESPERA),
    danados: cuenta(ESTADOS.DANADO),
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ceibo Libros';
  wb.created = new Date();

  const hojaResumen = wb.addWorksheet('Resumen');
  hojaResumen.addRow(['Concepto', 'Valor']);
  [
    ['Generado el', h], ['Período del detalle', rango.nombre],
    ['Libros activos (títulos)', Number(t.libros)], ['Ejemplares en total', Number(t.ejemplares)],
    ['Usuarios (lectores)', Number(t.usuarios)], ['Usuarios bloqueados', Number(t.bloqueados)],
    ['Préstamos activos ahora', Number(t.prestamos_activos)], ['Préstamos vencidos ahora', Number(t.prestamos_vencidos)],
    ['Reservas activas ahora', Number(t.reservas_activas)],
    ['Libros prestados en el período', resumen.libros_prestados], ['Devueltos', resumen.devueltos],
    ['No devueltos', resumen.no_devueltos], ['Vencidos sin devolver', resumen.vencidos_sin_devolver],
    ['Devueltos en espera de revisión', resumen.en_espera], ['Dañados', resumen.danados],
  ].forEach((f) => hojaResumen.addRow(f));
  darFormato(hojaResumen, [38, 30]);

  const hojaDetalle = wb.addWorksheet(HOJA_DETALLE);
  hojaDetalle.addRow(COLUMNAS_DETALLE);
  detalle.forEach((f) => hojaDetalle.addRow(f));
  darFormato(hojaDetalle, [12, 10, 36, 26, 20, 26, 10, 16, 14, 14, 22, 10, 10]);
  hojaDetalle.autoFilter = { from: 'A1', to: 'M1' };

  const libros = await consultar(
    `SELECT l.id, l.titulo, a.nombre AS autor, c.nombre AS categoria, l.stock_total, l.activo,
            (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id) AS veces,
            (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id AND pi.revision = 'danado') AS danados,
            (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id AND pi.revision = 'pendiente') AS en_espera,
            GREATEST(0, CAST(l.stock_total AS SIGNED)
              - (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.libro_id = l.id AND (pi.devuelto_en IS NULL OR pi.revision = 'pendiente'))
              - (SELECT COUNT(*) FROM reservas r WHERE r.libro_id = l.id AND r.estado = 'activa' AND r.fecha_limite > NOW())) AS disponibles
     FROM libros l JOIN autores a ON a.id = l.autor_id JOIN categorias c ON c.id = l.categoria_id ORDER BY l.titulo`);
  const hojaLibros = wb.addWorksheet('Libros');
  hojaLibros.addRow(['ID', 'Título', 'Autor', 'Categoría', 'Stock total', 'Disponibles', 'En espera', 'Veces prestado', 'Dañados', 'Activo']);
  libros.forEach((l) => hojaLibros.addRow([l.id, l.titulo, l.autor, l.categoria, Number(l.stock_total), Number(l.disponibles), Number(l.en_espera), Number(l.veces), Number(l.danados), l.activo ? 'Sí' : 'No']));
  darFormato(hojaLibros, [8, 36, 26, 20, 12, 12, 11, 15, 10, 8]);

  const reservas = await consultar(
    `SELECT r.id, l.titulo, CONCAT(u.nombre, ' ', u.apellido) AS lector, r.tipo, r.estado, r.visita_en, r.creada_en, r.codigo_retiro
     FROM reservas r JOIN libros l ON l.id = r.libro_id JOIN usuarios u ON u.id = r.usuario_id ORDER BY r.id DESC LIMIT 5000`);
  const hojaReservas = wb.addWorksheet('Reservas');
  hojaReservas.addRow(['ID', 'Libro', 'Lector', 'Tipo', 'Estado', 'Visita', 'Creada', 'Código']);
  reservas.forEach((r) => hojaReservas.addRow([r.id, r.titulo, r.lector.trim(), r.tipo === 'sala' ? 'Leer en sala' : 'Retiro', r.estado, fechaCorta(r.visita_en), fechaCorta(r.creada_en), r.codigo_retiro]));
  darFormato(hojaReservas, [8, 36, 26, 14, 12, 12, 12, 10]);

  const usuarios = await consultar(
    `SELECT u.id, CONCAT(u.nombre, ' ', u.apellido) AS nombre, u.email, r.nombre AS rol, u.estado, u.tipo_bloqueo, u.curso, u.creado_en
     FROM usuarios u JOIN roles r ON r.id = u.rol_id ORDER BY u.nombre`);
  const hojaUsuarios = wb.addWorksheet('Usuarios');
  hojaUsuarios.addRow(['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Motivo del bloqueo', 'Curso', 'Alta']);
  usuarios.forEach((u) => hojaUsuarios.addRow([u.id, u.nombre.trim(), u.email, u.rol, u.estado, u.tipo_bloqueo === 'dano' ? 'Daño a un libro' : u.tipo_bloqueo === 'atraso' ? 'Atraso en la devolución' : '', u.curso || '', fechaCorta(u.creado_en)]));
  darFormato(hojaUsuarios, [8, 28, 32, 14, 12, 24, 10, 12]);

  const masPrestados = agrupar(detalle, 2, 3).slice(0, 20);
  const hojaTop = wb.addWorksheet('Más prestados');
  hojaTop.addRow(['Libro', 'Autor', 'Veces prestado']);
  masPrestados.forEach((f) => hojaTop.addRow([f.clave, f.extra, f.total]));
  darFormato(hojaTop, [40, 28, 16]);

  const porMes = agrupar(detalle, 12).sort((a, b) => a.clave.localeCompare(b.clave));
  const hojaMes = wb.addWorksheet('Por mes');
  hojaMes.addRow(['Mes', 'Libros prestados']);
  porMes.forEach((f) => hojaMes.addRow([f.clave, f.total]));
  darFormato(hojaMes, [12, 18]);

  const porCategoria = agrupar(detalle, 4);
  const hojaCat = wb.addWorksheet('Por categoría');
  hojaCat.addRow(['Categoría', 'Libros prestados']);
  porCategoria.forEach((f) => hojaCat.addRow([f.clave, f.total]));
  darFormato(hojaCat, [26, 18]);

  const sufijo = periodo === 'todo' ? 'completo' : periodo === 'mes' ? `mes-${mes}` : periodo.replace('_', '-');
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, nombre: `ceibo-libros-estadisticas-${sufijo}-${h}.xlsx`, resumen };
}

/** Cuenta filas por el valor de una columna (índice) y ordena de mayor a menor. `colExtra` guarda un dato de apoyo (ej.: el autor). */
function agrupar(filas, col, colExtra) {
  const mapa = new Map();
  for (const f of filas) {
    const clave = String(f[col]);
    const actual = mapa.get(clave) || { clave, total: 0, extra: colExtra !== undefined ? f[colExtra] : '' };
    actual.total += 1;
    mapa.set(clave, actual);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave));
}

const texto = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return String(v.text ?? v.result ?? '').trim();
  return String(v).trim();
};

/**
 * Lee varios Excel descargados desde Estadísticas, junta los libros prestados (sin repetir los que aparecen en dos archivos)
 * y devuelve el análisis: qué libros salieron más, cuáles no se devolvieron, cuántos se dañaron, etc.
 */
export async function analizarArchivos(archivos) {
  const ExcelJS = await cargarExcelJS();
  const registros = new Map(); // "idPréstamo-idLibro" -> fila
  const leidos = [];
  const invalidos = [];

  for (const a of archivos) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(a.contenido, 'base64'));
      const hoja = wb.getWorksheet(HOJA_DETALLE);
      if (!hoja) throw new Error('falta la hoja');
      const cab = {};
      hoja.getRow(1).eachCell((c, n) => { cab[texto(c.value)] = n; });
      if (COLUMNAS_DETALLE.some((n) => !cab[n])) throw new Error('faltan columnas');
      let filas = 0;
      hoja.eachRow((fila, n) => {
        if (n === 1) return;
        const v = (nombre) => texto(fila.getCell(cab[nombre]).value);
        const idP = v('ID préstamo'); const idL = v('ID libro');
        if (!idP || !idL) return;
        const estado = v('Estado del ejemplar');
        if (!RANGO[estado]) return;
        const reg = {
          clave: `${idP}-${idL}`, libro: v('Libro'), autor: v('Autor'), categoria: v('Categoría'), lector: v('Lector'),
          prestado: v('Fecha de préstamo'), vence: v('Vence'), estado, mes: v('Mes'),
        };
        const previo = registros.get(reg.clave);
        if (!previo || RANGO[reg.estado] >= RANGO[previo.estado]) registros.set(reg.clave, reg);
        filas += 1;
      });
      leidos.push({ nombre: a.nombre, filas });
    } catch (e) {
      invalidos.push({ nombre: a.nombre, motivo: 'No es un archivo descargado desde Estadísticas (o está dañado).' });
    }
  }
  if (!leidos.length) throw err.validacion('Ninguno de los archivos sirve. Subí los Excel que descargaste desde Estadísticas.', { archivos: 'Archivos inválidos' });

  const h = hoy();
  const todos = [...registros.values()];
  const ordenar = (m) => [...m.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave));
  const contar = (lista, fn) => { const m = new Map(); lista.forEach((r) => { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); }); return m; };

  const noDevueltos = todos.filter((r) => r.estado === ESTADOS.PRESTADO);
  const fechas = todos.map((r) => r.prestado).filter(Boolean).sort();
  const masPrestados = [...contar(todos, (r) => `${r.libro}|${r.autor}`).entries()]
    .map(([k, total]) => { const [titulo, autor] = k.split('|'); return { titulo, autor, total }; })
    .sort((a, b) => b.total - a.total || a.titulo.localeCompare(b.titulo));
  const danadosPorLibro = [...contar(todos.filter((r) => r.estado === ESTADOS.DANADO), (r) => r.libro).entries()]
    .map(([titulo, total]) => ({ titulo, total })).sort((a, b) => b.total - a.total);
  const atrasoPorLector = [...contar(noDevueltos.filter((r) => r.vence && r.vence < h), (r) => r.lector).entries()]
    .map(([lector, total]) => ({ lector, total })).sort((a, b) => b.total - a.total).slice(0, 5);

  return {
    archivos: { leidos, invalidos },
    periodo: { desde: fechas[0] || null, hasta: fechas[fechas.length - 1] || null },
    totales: {
      libros_prestados: todos.length,
      devueltos: todos.length - noDevueltos.length,
      no_devueltos: noDevueltos.length,
      vencidos_sin_devolver: noDevueltos.filter((r) => r.vence && r.vence < h).length,
      en_espera: todos.filter((r) => r.estado === ESTADOS.ESPERA).length,
      danados: todos.filter((r) => r.estado === ESTADOS.DANADO).length,
    },
    mas_prestados: masPrestados.slice(0, 10),
    por_categoria: ordenar(contar(todos, (r) => r.categoria)).map((x) => ({ categoria: x.clave, total: x.total })),
    por_mes: ordenar(contar(todos, (r) => r.mes)).sort((a, b) => a.clave.localeCompare(b.clave)).map((x) => ({ mes: x.clave, total: x.total })),
    no_devueltos: noDevueltos
      .map((r) => ({ titulo: r.libro, lector: r.lector, vence: r.vence, dias_atraso: r.vence && r.vence < h ? diasEntre(r.vence, h) : 0 }))
      .sort((a, b) => b.dias_atraso - a.dias_atraso).slice(0, 50),
    danados_por_libro: danadosPorLibro,
    lectores_con_mas_atrasos: atrasoPorLector,
  };
}
