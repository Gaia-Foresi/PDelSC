// Prueba de humo de toda la API (necesita el servidor corriendo y la base con `npm run db:seed`).
//   npm start            (en otra terminal)
//   npm test
// Los códigos por email se guardan con hash, así que el test los reemplaza directo en la base por uno conocido.
// ⚠ Modifica datos (bloquea/desbloquea a los usuarios de prueba, crea préstamos...). Usalo SOLO con una base de
//   pruebas y, para repetirlo, reiniciala antes:  npm run db:init -- --reset && npm run db:seed
// Tip: arrancá el servidor con LIMITE_AUTH=1000 para que el límite anti fuerza bruta no frene al test.
const { pool } = require('../src/config/db');
const { sha256 } = require('../src/utils/codigos');
const { puerto } = require('../src/config/env');
const { ejecutarRecordatorios } = require('../src/services/recordatorios');

const BASE = process.env.API_URL || `http://localhost:${puerto}/api`;
const CLAVES = { dueno: ['dueno@ceibolibros.com', 'Dueno2026'], biblio: ['biblioteca@ceibolibros.com', 'Biblio2026'], lucia: ['lucia@ejemplo.com', 'Lector2026'], tomas: ['tomas@ejemplo.com', 'Lector2026'] };

const DATOS = { nombre: 'Lucía', apellido: 'Lectora', curso: '5° B', dni: '40.123.456' };

let ok = 0;
const fallos = [];
const check = (nombre, condicion, extra = '') => {
  if (condicion) { ok += 1; console.log(`  ✔ ${nombre}`); } else { fallos.push(nombre); console.log(`  ✘ ${nombre} ${extra}`); }
};

async function post(ruta, cuerpo = {}, token) {
  const r = await fetch(BASE + ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(cuerpo),
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ok: json.ok, data: json.data, error: json.error };
}

async function login(clave) {
  const [email, password] = CLAVES[clave];
  const r = await post('/auth/login', { email, password });
  if (!r.data?.access_token) throw new Error(`No se pudo iniciar sesión como ${clave}: ${JSON.stringify(r.error)}`);
  return { token: r.data.access_token, refresh: r.data.refresh_token, usuario: r.data.usuario };
}

const poner = async (usuarioId, proposito, codigo = '123456') => {
  await pool.query('UPDATE codigos_verificacion SET codigo_hash = ? WHERE usuario_id = ? AND proposito = ? AND usado = 0', [sha256(codigo), usuarioId, proposito]);
};

async function main() {
  const sufijo = Date.now();

  console.log('\n# Reglas generales');
  const get = await fetch(`${BASE}/salud`);
  check('GET está prohibido (405)', get.status === 405);
  check('POST /salud responde ok', (await post('/salud')).data?.estado === 'ok');
  check('Ruta inexistente → 404', (await post('/no-existe')).status === 404);
  check('Sin token → 401', (await post('/libros/listar')).status === 401);
  check('Token falso → 401', (await post('/libros/listar', {}, 'abc.def.ghi')).status === 401);
  const val = await post('/auth/login', { email: 'no-es-email', password: '' });
  check('Validación → 400 con detalles por campo', val.status === 400 && val.error?.detalles?.email);

  console.log('\n# Login y roles');
  const mala = await post('/auth/login', { email: CLAVES.lucia[0], password: 'incorrecta1' });
  check('Contraseña incorrecta → 401', mala.status === 401 && mala.error.codigo === 'CREDENCIALES_INVALIDAS');
  const dueno = await login('dueno');
  const biblio = await login('biblio');
  const lucia = await login('lucia');
  const tomas = await login('tomas');
  check('Roles correctos', dueno.usuario.rol === 'dueno' && biblio.usuario.rol === 'bibliotecario' && lucia.usuario.rol === 'usuario');
  check('Tomás entra pero está bloqueado con mensaje', tomas.usuario.estado === 'bloqueado' && /devolv/i.test(tomas.usuario.motivo_bloqueo));
  check('Usuario no puede ver estadísticas (403)', (await post('/estadisticas/resumen', {}, lucia.token)).status === 403);
  check('Bibliotecario no puede ver estadísticas (403)', (await post('/estadisticas/resumen', {}, biblio.token)).status === 403);
  check('Usuario no puede crear libros (403)', (await post('/libros/crear', { titulo: 'X', autor: 'Y', categoria_id: 1, stock_total: 1 }, lucia.token)).status === 403);
  check('Usuario no puede listar usuarios (403)', (await post('/usuarios/listar', {}, lucia.token)).status === 403);
  check('Bibliotecario no puede cambiar roles (403)', (await post('/admin/cambiar-rol', { id: lucia.usuario.id, rol: 'bibliotecario' }, biblio.token)).status === 403);

  console.log('\n# Registro, verificación y 2 pasos');
  const email = `prueba${sufijo}@ejemplo.com`;
  const reg = await post('/auth/registro', { nombre: 'Prueba', apellido: 'Test', email, password: 'Clave1234' });
  check('Registro pide verificar el email', reg.status === 201 && reg.data.requiere_verificacion);
  check('Contraseña débil rechazada', (await post('/auth/registro', { nombre: 'A', apellido: 'B', email: `x${sufijo}@ejemplo.com`, password: 'corta' })).status === 400);
  const sinVerificar = await post('/auth/login', { email, password: 'Clave1234' });
  check('Login sin verificar no da sesión', sinVerificar.data?.requiere_verificacion && !sinVerificar.data.access_token);
  const [[nuevo]] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  const mal = await post('/auth/verificar-email', { email, codigo: '000000' });
  check('Código incorrecto → 401', mal.status === 401 && mal.error.codigo === 'CODIGO_INVALIDO');
  await poner(nuevo.id, 'verificar_email');
  const ver = await post('/auth/verificar-email', { email, codigo: '123456' });
  check('Verificar email da sesión de rol usuario', ver.data?.access_token && ver.data.usuario.rol === 'usuario');
  check('El código no se puede reutilizar', (await post('/auth/verificar-email', { email, codigo: '123456' })).status === 401);
  const nuevoTok = ver.data.access_token;

  check('Activar 2 pasos', (await post('/usuarios/dos-pasos', { activar: true }, nuevoTok)).data?.usuario?.dos_pasos_activo === true);
  const l2 = await post('/auth/login', { email, password: 'Clave1234' });
  check('Con 2 pasos el login pide código', l2.data?.requiere_2fa === true && !l2.data.access_token);
  await poner(nuevo.id, 'login_2fa');
  const l2b = await post('/auth/login-2fa', { email, codigo: '123456' });
  check('Código de 2 pasos da sesión', !!l2b.data?.access_token);

  console.log('\n# Tokens: refresh con rotación');
  const rf = await post('/auth/refresh', { refresh_token: l2b.data.refresh_token });
  check('Refresh entrega tokens nuevos', rf.data?.access_token && rf.data.refresh_token !== l2b.data.refresh_token);
  const rf2 = await post('/auth/refresh', { refresh_token: l2b.data.refresh_token });
  check('Reusar un refresh viejo → 401 REFRESH_INVALIDO', rf2.status === 401 && rf2.error.codigo === 'REFRESH_INVALIDO');
  const rf3 = await post('/auth/refresh', { refresh_token: rf.data.refresh_token });
  check('…y revoca toda la familia de sesiones', rf3.status === 401);

  console.log('\n# Recuperar contraseña');
  await post('/auth/olvide-password', { email });
  await poner(nuevo.id, 'reset_password');
  const rs = await post('/auth/reset-password', { email, codigo: '123456', password: 'Nueva12345' });
  check('Reset de contraseña', rs.data?.actualizado === true);
  check('La contraseña vieja ya no sirve', (await post('/auth/login', { email, password: 'Clave1234' })).status === 401);
  const olvidoFalso = await post('/auth/olvide-password', { email: `no-existe${sufijo}@ejemplo.com` });
  check('No revela si el email existe', olvidoFalso.data?.enviado === true);

  console.log('\n# Redes sociales');
  const soc = await post('/auth/social', { proveedor: 'github', code: 'falso', redirect_uri: 'x' });
  check('GitHub sin configurar/inválido → 502 PROVEEDOR_SOCIAL', soc.status === 502 && soc.error.codigo === 'PROVEEDOR_SOCIAL');
  check('Proveedor inválido → 400', (await post('/auth/social', { proveedor: 'myspace', token: 'x' })).status === 400);

  console.log('\n# Catálogo');
  const cats = await post('/categorias/listar', {}, lucia.token);
  check('8 categorías con conteo de libros', cats.data?.categorias?.length === 8 && cats.data.categorias.every((c) => c.total_libros >= 3));
  const ficc = cats.data.categorias.find((c) => c.codigo === 'F');
  const libs = await post('/libros/listar', { categoria_id: ficc.id }, lucia.token);
  check('Libros por categoría con disponibles', libs.data?.libros?.length === 3 && libs.data.libros.every((l) => typeof l.disponibles === 'number'));
  check('Búsqueda por autor', (await post('/libros/listar', { q: 'borges' }, lucia.token)).data.libros.length === 2);
  const nuevoLibro = await post('/libros/crear', { titulo: `Libro de prueba ${sufijo}`, autor: 'Autora Nueva', categoria_id: ficc.id, stock_total: 2, descripcion: 'Descripción' }, biblio.token);
  check('Bibliotecario crea libro (y su autor)', nuevoLibro.status === 201 && nuevoLibro.data.libro.autor === 'Autora Nueva' && nuevoLibro.data.libro.disponibles === 2);
  const lid = nuevoLibro.data.libro.id;
  check('Stock negativo rechazado', (await post('/libros/actualizar', { id: lid, stock_total: -1 }, biblio.token)).status === 400);
  check('Actualizar stock', (await post('/libros/actualizar', { id: lid, stock_total: 3 }, biblio.token)).data?.libro?.stock_total === 3);

  console.log('\n# Reservas');
  const hz = await post('/reservas/horarios', { tipo: 'retiro' }, lucia.token);
  const hs = await post('/reservas/horarios', { tipo: 'sala' }, lucia.token);
  check('Hay horarios disponibles agrupados por día', hz.status === 200 && hz.data.dias.length >= 1 && hz.data.dias[0].horas.length >= 1 && !!hz.data.dias[0].etiqueta);
  const VS = { retiro: hz.data.dias[0].horas[0].iso, sala: hs.data.dias[0].horas[0].iso };
  check('Horarios con tipo inválido → 400', (await post('/reservas/horarios', { tipo: 'x' }, lucia.token)).status === 400);
  check('Reservar sin datos del lector → 400', (await post('/reservas/crear', { libro_id: lid, tipo: 'retiro' }, lucia.token)).status === 400);
  check('DNI inválido → 400', (await post('/reservas/crear', { libro_id: lid, tipo: 'retiro', ...DATOS, visita: VS.retiro, dni: '12' }, lucia.token)).status === 400);
  check('Reservar sin fecha y hora de visita → 400', (await post('/reservas/crear', { libro_id: lid, tipo: 'retiro', ...DATOS }, lucia.token)).status === 400);
  check('Un horario fuera de los disponibles → 400', (await post('/reservas/crear', { libro_id: lid, tipo: 'retiro', ...DATOS, visita: '2020-01-01T12:00:00.000Z' }, lucia.token)).status === 400);
  const res1 = await post('/reservas/crear', { libro_id: lid, tipo: 'retiro', ...DATOS, visita: VS.retiro }, lucia.token);
  check('Usuario reserva para retirar', res1.status === 201 && res1.data.reserva.estado === 'activa');
  check('La reserva guarda la fecha y hora de la visita', res1.data.reserva.visita?.en === VS.retiro && /^\d{4}-\d{2}-\d{2}$/.test(res1.data.reserva.visita.fecha) && /^\d{2}:\d{2}$/.test(res1.data.reserva.visita.hora));
  const codigoReserva = res1.data.reserva.codigo_retiro;
  check('La reserva devuelve un código de retiro de 6 caracteres', /^[A-Z2-9]{6}$/.test(codigoReserva));
  check('La reserva guarda curso y DNI del lector (DNI sin puntos)', res1.data.reserva.usuario.curso === '5° B' && res1.data.reserva.usuario.dni === '40123456');
  const perf = await post('/usuarios/perfil', {}, lucia.token);
  check('Los datos quedan en el perfil', perf.data.usuario.curso === '5° B' && perf.data.usuario.dni === '40123456');
  check('El personal encuentra la reserva por su código', (await post('/reservas/listar', { q: codigoReserva.toLowerCase() }, biblio.token)).data.reservas.some((r) => r.id === res1.data.reserva.id));
  check('La reserva descuenta stock', (await post('/libros/detalle', { id: lid }, lucia.token)).data.libro.disponibles === 2);
  check('No se reserva dos veces el mismo libro', (await post('/reservas/crear', { libro_id: lid, tipo: 'sala', ...DATOS, visita: VS.sala }, lucia.token)).error?.codigo === 'YA_RESERVADO');
  const bloq = await post('/reservas/crear', { libro_id: lid, tipo: 'sala', ...DATOS, visita: VS.sala }, tomas.token);
  check('Usuario bloqueado no puede reservar (403)', bloq.status === 403 && bloq.error.codigo === 'USUARIO_BLOQUEADO');
  const mis = await post('/reservas/mis', {}, lucia.token);
  check('"Mis reservas" lista las propias', mis.data.reservas.some((r) => r.id === res1.data.reserva.id));
  check('Otro usuario no puede cancelar mi reserva (404)', (await post('/reservas/cancelar', { id: res1.data.reserva.id }, nuevoTok)).status === 404);
  const atend = await post('/reservas/atender', { id: res1.data.reserva.id, dias: 7 }, biblio.token);
  check('Bibliotecario atiende reserva de retiro → crea préstamo', atend.data?.prestamo?.items?.[0]?.libro_id === lid && atend.data.reserva.estado === 'cumplida');
  const pid = atend.data.prestamo.id;
  check('El préstamo conserva el código de retiro de la reserva', atend.data.prestamo.codigo_retiro === codigoReserva);
  check('El préstamo muestra los datos del lector', atend.data.prestamo.usuario.curso === '5° B' && atend.data.prestamo.usuario.dni === '40123456');
  const res2 = await post('/reservas/crear', { libro_id: lid, tipo: 'sala', ...DATOS, visita: VS.sala }, lucia.token);
  check('Reserva para sala', res2.status === 201);
  check('Cancelar reserva', (await post('/reservas/cancelar', { id: res2.data.reserva.id }, lucia.token)).data?.reserva?.estado === 'cancelada');
  check('No se cancela dos veces (422)', (await post('/reservas/cancelar', { id: res2.data.reserva.id }, lucia.token)).status === 422);

  console.log('\n# Préstamos');
  const sinDatos = await post('/prestamos/crear', { usuario_id: nuevo.id, libro_ids: [lid] }, biblio.token);
  check('Préstamo directo a un lector sin curso/DNI → 400 con detalle', sinDatos.status === 400 && !!sinDatos.error.detalles?.dni);
  const conDatos = await post('/prestamos/crear', { usuario_id: nuevo.id, libro_ids: [lid], nombre: 'Prueba', apellido: 'Test', curso: '3° A', dni: '30111222' }, biblio.token);
  check('Préstamo directo con datos del lector genera su propio código', conDatos.status === 201 && /^[A-Z2-9]{6}$/.test(conDatos.data.prestamo.codigo_retiro) && conDatos.data.prestamo.codigo_retiro !== codigoReserva);
  check('Se encuentra un préstamo por su código', (await post('/prestamos/listar', { q: conDatos.data.prestamo.codigo_retiro }, biblio.token)).data.prestamos.length === 1);
  await post('/prestamos/devolver', { prestamo_id: conDatos.data.prestamo.id }, biblio.token);
  const otro = await post('/libros/crear', { titulo: `Otro libro ${sufijo}`, autor: 'Autora Nueva', categoria_id: ficc.id, stock_total: 1 }, biblio.token);
  const oid = otro.data.libro.id;
  check('Agregar libros a un préstamo abierto', (await post('/prestamos/agregar-libros', { prestamo_id: pid, libro_ids: [oid] }, biblio.token)).data?.prestamo?.items?.length === 2);
  check('No se repite un libro del préstamo (409)', (await post('/prestamos/agregar-libros', { prestamo_id: pid, libro_ids: [oid] }, biblio.token)).status === 409);
  const sinStock = await post('/prestamos/crear', { usuario_id: lucia.usuario.id, libro_ids: [oid] }, biblio.token);
  check('Sin stock → 409 SIN_STOCK', sinStock.status === 409 && sinStock.error.codigo === 'SIN_STOCK');
  check('Bibliotecario NO puede eliminar libros (403)', (await post('/libros/eliminar', { id: oid }, biblio.token)).status === 403);
  check('No se elimina un libro prestado (409)', (await post('/libros/eliminar', { id: oid }, dueno.token)).error?.codigo === 'LIBRO_EN_USO');
  check('No se baja el stock por debajo de lo prestado', (await post('/libros/actualizar', { id: oid, stock_total: 0 }, biblio.token)).error?.codigo === 'LIBRO_EN_USO');
  check('Usuario no puede crear préstamos (403)', (await post('/prestamos/crear', { usuario_id: lucia.usuario.id, libro_ids: [oid] }, lucia.token)).status === 403);
  const ext = await post('/prestamos/extender', { prestamo_id: pid, dias: 5 }, biblio.token);
  check('Extender plazo', ext.status === 200 && ext.data.prestamo.dias_restantes === 12);
  const misP = await post('/prestamos/mis', {}, lucia.token);
  check('"Mis préstamos" incluye el nuevo', misP.data.prestamos.some((p) => p.id === pid));
  check('Otro usuario no ve mi préstamo (404)', (await post('/prestamos/detalle', { id: pid }, nuevoTok)).status === 404);
  const dev1 = await post('/prestamos/devolver', { prestamo_id: pid, libro_id: lid }, biblio.token);
  check('Devolver un libro deja el préstamo abierto', dev1.data?.prestamo?.estado === 'activo');
  const dev2 = await post('/prestamos/devolver', { prestamo_id: pid }, biblio.token);
  check('Devolver el resto cierra el préstamo', dev2.data?.prestamo?.estado === 'cerrado');
  check('No se devuelve dos veces (422)', (await post('/prestamos/devolver', { prestamo_id: pid }, biblio.token)).status === 422);
  check('El dueño elimina un libro sin uso (baja lógica)', (await post('/libros/eliminar', { id: oid }, dueno.token)).data?.eliminado === true);
  check('Ya no aparece en el listado', !(await post('/libros/listar', {}, lucia.token)).data.libros.some((l) => l.id === oid));
  const lp = await post('/prestamos/listar', { estado: 'vencido' }, dueno.token);
  check('Listado de vencidos incluye el de Tomás', lp.data.prestamos.some((p) => p.usuario.id === tomas.usuario.id && p.vencido));

  console.log('\n# Calendario de visitas (personal)');
  const prRes = await post('/prestamos/detalle', { id: pid }, biblio.token);
  check('El préstamo tiene fecha y hora de visita', !!prRes.data.prestamo.visita?.en);
  const hoyL = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 30 * 3600000).toISOString().slice(0, 10);
  const cal = await post('/calendario/listar', { desde: hoyL, hasta: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) }, biblio.token);
  check('Bibliotecario ve el calendario', cal.status === 200 && Array.isArray(cal.data.eventos));
  const evP = cal.data.eventos.find((e) => e.clave === `prestamo-${pid}`);
  check('El calendario trae nombre, apellido y libro de cada visita', !!evP && !!evP.usuario.nombre && !!evP.usuario.apellido && evP.libros.length >= 1 && !!evP.visita.hora);
  check('Dueño también ve el calendario', (await post('/calendario/listar', { desde: hoyL, hasta: manana }, dueno.token)).status === 200);
  check('Usuario no ve el calendario (403)', (await post('/calendario/listar', { desde: hoyL, hasta: manana }, lucia.token)).status === 403);
  check('Fechas con formato inválido → 400', (await post('/calendario/listar', { desde: 'ayer', hasta: manana }, biblio.token)).status === 400);
  const futuro = new Date(Math.floor(Date.now() / 60000) * 60000 + 2 * 86400000).toISOString();
  const pFut = await post('/prestamos/crear', { usuario_id: lucia.usuario.id, libro_ids: [lid], visita: futuro }, biblio.token);
  check('Préstamo cargado con una fecha de visita elegida', pFut.status === 201 && pFut.data.prestamo.visita.en === futuro);
  if (pFut.status === 201) await post('/prestamos/devolver', { prestamo_id: pFut.data.prestamo.id }, biblio.token);
  check('Visita de préstamo con fecha inválida → 400', (await post('/prestamos/crear', { usuario_id: lucia.usuario.id, libro_ids: [lid], visita: '2001-01-01T00:00:00.000Z' }, biblio.token)).status === 400);

  console.log('\n# Bloqueo y desbloqueo automático');
  const blq = await post('/usuarios/bloquear', { id: nuevo.id, motivo: 'Devolvé los libros que te llevaste.' }, biblio.token);
  check('Bibliotecario bloquea con mensaje', blq.data?.usuario?.estado === 'bloqueado' && blq.data.usuario.motivo_bloqueo.includes('Devolvé'));
  check('No se puede bloquear al dueño (403)', (await post('/usuarios/bloquear', { id: dueno.usuario.id, motivo: 'x' }, biblio.token)).status === 403);
  const perfilB = await post('/usuarios/perfil', {}, nuevoTok);
  check('El usuario bloqueado ve su mensaje', perfilB.data.usuario.estado === 'bloqueado');
  check('Desbloquear a mano', (await post('/usuarios/desbloquear', { id: nuevo.id }, biblio.token)).data?.usuario?.estado === 'activo');
  // Préstamo vencido de Tomás: devolverlo desbloquea solo
  const pTomas = lp.data.prestamos.find((p) => p.usuario.id === tomas.usuario.id);
  const devT = await post('/prestamos/devolver', { prestamo_id: pTomas.id }, biblio.token);
  check('Al devolver el último libro se desbloquea solo', devT.data?.usuario_desbloqueado === true);
  const tomas2 = await post('/usuarios/perfil', {}, tomas.token);
  check('Tomás ya está activo', tomas2.data.usuario.estado === 'activo');
  const notis = await post('/notificaciones/listar', {}, tomas.token);
  check('Tomás recibió la notificación de desbloqueo', notis.data.notificaciones.some((n) => n.tipo === 'desbloqueo'));
  check('Marcar notificaciones como leídas', (await post('/notificaciones/marcar-leidas', {}, tomas.token)).data.marcadas >= 1);
  check('Contador de no leídas en 0', (await post('/notificaciones/cantidad', {}, tomas.token)).data.total === 0);

  console.log('\n# Tarea diaria (recordatorios y bloqueo por vencimiento)');
  const resumen = await ejecutarRecordatorios();
  check('Envía el recordatorio de Lucía (vence en 2 días)', resumen.recordatorios >= 1 || (await pool.query("SELECT 1 FROM notificaciones WHERE usuario_id = ? AND tipo = 'recordatorio_devolucion'", [lucia.usuario.id]))[0].length > 0);
  const vencido = await post('/libros/listar', { q: 'Frankenstein' }, lucia.token);
  // Se fuerza un vencimiento de Lucía para comprobar el bloqueo automático
  await pool.query("UPDATE prestamos SET fecha_vencimiento = DATE_SUB(CURDATE(), INTERVAL 3 DAY) WHERE usuario_id = ? AND estado = 'activo'", [lucia.usuario.id]);
  const r2 = await ejecutarRecordatorios();
  check('Bloquea automáticamente a quien tiene libros vencidos', r2.bloqueados >= 1);
  check('Lucía queda bloqueada', (await post('/usuarios/perfil', {}, lucia.token)).data.usuario.estado === 'bloqueado');
  check('El cron externo exige secreto (403)', (await post('/mantenimiento/recordatorios')).status === 403);
  void vencido;

  console.log('\n# Mensajes');
  const hl = await post('/mensajes/hilos', {}, lucia.token);
  check('Usuario ve su consulta con mensajes sin leer', hl.data.hilos.length >= 1 && hl.data.hilos[0].con.rol === 'biblioteca');
  const nueva = await post('/mensajes/crear', { tipo: 'consulta', asunto: 'Consulta de prueba', cuerpo: '¿Tienen más ejemplares de Rayuela?' }, nuevoTok);
  check('Usuario crea una consulta', nueva.status === 201);
  check('Usuario no puede crear mensajes internos (403)', (await post('/mensajes/crear', { tipo: 'interno', asunto: 'x', cuerpo: 'y', destinatario_id: biblio.usuario.id }, nuevoTok)).status === 403);
  check('Staff ve la consulta con su autor', (await post('/mensajes/hilos', {}, biblio.token)).data.hilos.some((h) => h.id === nueva.data.hilo.id && h.no_leidos === 1 && h.con.nombre.startsWith('Prueba')));
  check('Hay mensajes sin leer para el staff', (await post('/mensajes/no-leidos', {}, biblio.token)).data.total >= 1);
  const resp = await post('/mensajes/enviar', { hilo_id: nueva.data.hilo.id, cuerpo: 'Sí, tenemos 2 ejemplares.' }, dueno.token);
  check('El dueño responde una consulta', resp.status === 201 && resp.data.mensaje.mio);
  const ver2 = await post('/mensajes/hilo', { hilo_id: nueva.data.hilo.id }, nuevoTok);
  check('El usuario lee la respuesta', ver2.data.mensajes.length === 2 && ver2.data.mensajes[1].remitente.rol === 'dueno' && !ver2.data.mensajes[1].mio);
  check('Otro usuario no ve la consulta (404)', (await post('/mensajes/hilo', { hilo_id: nueva.data.hilo.id }, lucia.token)).status === 404);
  const cont = await post('/mensajes/contactos', {}, dueno.token);
  check('El dueño ve a los bibliotecarios como contactos', cont.data.contactos.some((c) => c.id === biblio.usuario.id));
  const interno = await post('/mensajes/crear', { tipo: 'interno', asunto: 'Pedido', cuerpo: 'Hay que reponer stock', destinatario_id: biblio.usuario.id }, dueno.token);
  check('Dueño escribe un mensaje interno', interno.status === 201);
  check('Interno: solo ven los participantes', (await post('/mensajes/hilo', { hilo_id: interno.data.hilo.id }, lucia.token)).status === 404);
  check('Bibliotecario recibe el interno', (await post('/mensajes/hilos', {}, biblio.token)).data.hilos.some((h) => h.id === interno.data.hilo.id && h.tipo === 'interno' && h.con.rol === 'dueno'));

  console.log('\n# Panel de administración y usuarios');
  const lu = await post('/usuarios/listar', { rol: 'bibliotecario' }, dueno.token);
  check('El dueño lista bibliotecarios', lu.data.usuarios.some((u) => u.id === biblio.usuario.id));
  const lb = await post('/usuarios/listar', { rol: 'dueno' }, biblio.token);
  check('El bibliotecario solo ve usuarios comunes', lb.data.usuarios.every((u) => u.rol === 'usuario'));
  check('Buscar usuarios por texto', (await post('/usuarios/listar', { q: 'lucía' }, biblio.token)).data.usuarios.length === 1);
  const det = await post('/usuarios/detalle', { id: lucia.usuario.id }, biblio.token);
  check('Detalle de usuario con préstamos y reservas', Array.isArray(det.data.prestamos) && det.data.prestamos.length > 0);
  check('No se puede cambiar el propio rol', (await post('/admin/cambiar-rol', { id: dueno.usuario.id, rol: 'usuario' }, dueno.token)).status === 403);
  const cr = await post('/admin/cambiar-rol', { id: nuevo.id, rol: 'bibliotecario' }, dueno.token);
  check('El dueño promueve un usuario a bibliotecario', cr.data?.usuario?.rol === 'bibliotecario');
  check('El cambio de rol aplica de inmediato (token viejo)', (await post('/usuarios/listar', {}, nuevoTok)).status === 200);
  await post('/admin/cambiar-rol', { id: nuevo.id, rol: 'usuario' }, dueno.token);
  check('…y al volver a usuario pierde el acceso', (await post('/usuarios/listar', {}, nuevoTok)).status === 403);
  const pf = await post('/usuarios/actualizar-perfil', { telefono: '+54 11 1234-5678' }, nuevoTok);
  check('Actualizar perfil', pf.data?.usuario?.telefono === '+54 11 1234-5678');
  const foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
  check('Subir foto de perfil (imagen)', (await post('/usuarios/actualizar-perfil', { foto_url: foto }, nuevoTok)).data?.usuario?.foto_url === foto);
  check('Foto con formato inválido → 400', (await post('/usuarios/actualizar-perfil', { foto_url: 'javascript:alert(1)' }, nuevoTok)).status === 400);
  check('Cambiar contraseña pide la actual', (await post('/usuarios/cambiar-password', { password_actual: 'mala', password_nueva: 'Otra123456' }, nuevoTok)).status === 400);
  check('Cambiar contraseña', (await post('/usuarios/cambiar-password', { password_actual: 'Nueva12345', password_nueva: 'Otra123456' }, nuevoTok)).data?.actualizado === true);

  console.log('\n# Categorías (CRUD)');
  const cc = await post('/categorias/crear', { codigo: 'X', nombre: `Categoría ${sufijo}`, icono: 'star', color: '#112233' }, dueno.token);
  check('Crear categoría', cc.status === 201);
  check('Código repetido → 409', (await post('/categorias/crear', { codigo: 'X', nombre: 'Otra', color: '#112233' }, dueno.token)).status === 409);
  check('Actualizar categoría', (await post('/categorias/actualizar', { id: cc.data.categoria.id, nombre: `Cat editada ${sufijo}` }, dueno.token)).data?.categoria?.nombre.startsWith('Cat editada'));
  check('No se elimina una categoría con libros (409)', (await post('/categorias/eliminar', { id: ficc.id }, dueno.token)).error?.codigo === 'CATEGORIA_CON_LIBROS');
  check('Bibliotecario NO puede eliminar categorías (403)', (await post('/categorias/eliminar', { id: cc.data.categoria.id }, biblio.token)).status === 403);
  check('Eliminar categoría vacía (dueño)', (await post('/categorias/eliminar', { id: cc.data.categoria.id }, dueno.token)).data?.eliminado === true);

  console.log('\n# Distribuidora y reposición (solo dueño)');
  const dl = await post('/distribuidoras/listar', {}, dueno.token);
  check('El dueño lista distribuidoras', dl.data.distribuidoras.length >= 1);
  check('Bibliotecario no accede a distribuidoras (403)', (await post('/distribuidoras/listar', {}, biblio.token)).status === 403);
  check('Bibliotecario no puede pedir libros (403)', (await post('/reposicion/crear', { distribuidora_id: dl.data.distribuidoras[0].id, items: [{ titulo: 'X', cantidad: 1 }] }, biblio.token)).status === 403);
  check('Usuario no accede (403)', (await post('/distribuidoras/listar', {}, lucia.token)).status === 403);
  const dc = await post('/distribuidoras/crear', { nombre: `Dist ${sufijo}`, email: 'dist@ejemplo.com' }, dueno.token);
  check('Crear distribuidora', dc.status === 201);
  const rp = await post('/reposicion/crear', { distribuidora_id: dl.data.distribuidoras[0].id, mensaje: 'Urgente, por favor', items: [{ libro_id: libs.data.libros[0].id, cantidad: 3 }, { titulo: 'Libro nuevo que queremos', cantidad: 1 }] }, dueno.token);
  check('Pedido de reposición enviado', rp.status === 201 && rp.data.pedido.estado_envio === 'enviado');
  check('Renglón sin libro ni título → 400', (await post('/reposicion/crear', { distribuidora_id: dl.data.distribuidoras[0].id, items: [{ cantidad: 1 }] }, dueno.token)).status === 400);
  const rl = await post('/reposicion/listar', {}, dueno.token);
  check('Historial de pedidos con renglones', rl.data.pedidos[0].items.length === 2);
  check('Eliminar distribuidora (baja lógica)', (await post('/distribuidoras/eliminar', { id: dc.data.distribuidora.id }, dueno.token)).data?.eliminado === true);

  console.log('\n# Portadas (internet simulada)');
  const { buscarPortada } = require('../src/services/portadas');
  const fetchReal = global.fetch;
  global.fetch = async (url) => {
    const u = String(url);
    const json = (o) => ({ ok: true, json: async () => o });
    if (u.includes('openlibrary.org/search.json') && u.includes('title=Rayuela')) return json({ docs: [{ title: 'Rayuela' }, { cover_i: 12345 }] });
    if (u.includes('googleapis.com/books') && u.includes('Ficciones')) return json({ items: [{ volumeInfo: { imageLinks: { thumbnail: 'http://books.google.com/x.jpg&edge=curl' } } }] });
    return json({ docs: [], items: [] });
  };
  check('Open Library: arma el link con el cover_i', (await buscarPortada('Rayuela', 'Julio Cortázar')) === 'https://covers.openlibrary.org/b/id/12345-L.jpg');
  check('Si Open Library no tiene, usa Google Books (https)', (await buscarPortada('Ficciones', 'Borges')) === 'https://books.google.com/x.jpg');
  check('Sin resultados devuelve null (no falla)', (await buscarPortada('Libro inexistente zzz', 'Nadie')) === null);
  global.fetch = async () => { throw new Error('sin internet'); };
  check('Sin internet devuelve null (no falla)', (await buscarPortada('Rayuela', 'Cortázar')) === null);
  global.fetch = fetchReal;
  check('Endpoint buscar-portada responde para el personal', (await post('/libros/buscar-portada', { titulo: 'Rayuela', autor: 'Cortázar' }, biblio.token)).status === 200);
  check('Usuario no puede buscar portadas (403)', (await post('/libros/buscar-portada', { titulo: 'Rayuela' }, lucia.token)).status === 403);

  console.log('\n# Estadísticas (solo dueño)');
  const est = await post('/estadisticas/resumen', {}, dueno.token);
  const e = est.data;
  check('Totales presentes', e?.totales?.libros >= 24 && e.totales.usuarios >= 3 && typeof e.totales.prestamos_vencidos === 'number');
  check('Últimos 6 meses', e.prestamos_por_mes.length === 6 && e.prestamos_por_mes.some((m) => m.total > 0));
  check('Libro más prestado = Sapiens', e.libros_mas_prestados[0].titulo === 'Sapiens');
  check('Préstamos por categoría', e.por_categoria.length >= 8);

  await pool.end();
  console.log(`\n${ok} pruebas correctas, ${fallos.length} con error`);
  if (fallos.length) { console.log('Fallaron:\n - ' + fallos.join('\n - ')); process.exit(1); }
}

main().catch((e) => { console.error('\n✘ El test se interrumpió:', e.message); process.exit(1); });
