// Mensajería. Dos tipos de hilo:
//   consulta: la inicia un usuario; la ven y responden el dueño y los bibliotecarios.
//   interno : entre el dueño y un bibliotecario; solo lo ven sus dos participantes.
const { pool, consultar, transaccion } = require('../config/db');
const { err } = require('../utils/httpError');
const { esStaff } = require('../middlewares/roles');

const BIBLIOTECA = { id: null, nombre: 'Biblioteca Ceibo Libros', rol: 'biblioteca' };
const nombreCompleto = (u) => `${u.nombre} ${u.apellido || ''}`.trim();

/** Un hilo es visible si: es una consulta y soy staff, o soy participante. */
async function cargarHiloVisible(hiloId, usuario, conn) {
  const [[h]] = await conn.query(
    `SELECT h.id, h.tipo, h.asunto, h.creado_por,
            EXISTS (SELECT 1 FROM hilo_participantes hp WHERE hp.hilo_id = h.id AND hp.usuario_id = ?) AS participa
     FROM hilos h WHERE h.id = ?`, [usuario.id, hiloId]);
  const visible = h && (h.participa || (h.tipo === 'consulta' && esStaff(usuario)));
  if (!visible) throw err.noEncontrado('La conversación');
  return h;
}

/** Con quién habla `usuario` en cada hilo (para mostrar el nombre en la lista). */
async function resolverContrapartes(hilos, usuario, conn) {
  const mapa = new Map();
  if (!hilos.length) return mapa;
  const consultas = hilos.filter((h) => h.tipo === 'consulta');
  const internos = hilos.filter((h) => h.tipo === 'interno');

  if (esStaff(usuario) && consultas.length) {
    const [us] = await conn.query(
      'SELECT u.id, u.nombre, u.apellido, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id IN (?)',
      [[...new Set(consultas.map((h) => h.creado_por))]]);
    for (const h of consultas) {
      const u = us.find((x) => x.id === h.creado_por);
      mapa.set(h.id, u ? { id: u.id, nombre: nombreCompleto(u), rol: u.rol } : BIBLIOTECA);
    }
  } else {
    for (const h of consultas) mapa.set(h.id, BIBLIOTECA);
  }

  if (internos.length) {
    const [otros] = await conn.query(
      `SELECT hp.hilo_id, u.id, u.nombre, u.apellido, r.nombre AS rol
       FROM hilo_participantes hp JOIN usuarios u ON u.id = hp.usuario_id JOIN roles r ON r.id = u.rol_id
       WHERE hp.hilo_id IN (?) AND hp.usuario_id <> ?`, [internos.map((h) => h.id), usuario.id]);
    for (const h of internos) {
      const o = otros.find((x) => x.hilo_id === h.id);
      mapa.set(h.id, o ? { id: o.id, nombre: nombreCompleto(o), rol: o.rol } : BIBLIOTECA);
    }
  }
  return mapa;
}

const SQL_VISIBLES = `
  FROM hilos h
  LEFT JOIN hilo_participantes hp ON hp.hilo_id = h.id AND hp.usuario_id = ?
  WHERE (hp.usuario_id IS NOT NULL OR (h.tipo = 'consulta' AND ?))`;

exports.hilos = async (req, res) => {
  const staff = esStaff(req.usuario) ? 1 : 0;
  const filas = await consultar(
    `SELECT h.id, h.tipo, h.asunto, h.creado_por,
            lm.cuerpo AS ultimo_mensaje, lm.creado_en AS ultimo_en,
            (SELECT COUNT(*) FROM mensajes m
              WHERE m.hilo_id = h.id AND m.remitente_id <> ? AND m.id > COALESCE(hp.ultimo_leido_id, 0)) AS no_leidos
     ${SQL_VISIBLES.replace('FROM hilos h', 'FROM hilos h JOIN mensajes lm ON lm.id = (SELECT MAX(id) FROM mensajes WHERE hilo_id = h.id)')}
     ORDER BY lm.id DESC LIMIT 200`,
    [req.usuario.id, req.usuario.id, staff]);

  const contrapartes = await resolverContrapartes(filas, req.usuario, pool);
  res.json({
    ok: true,
    data: {
      hilos: filas.map((h) => ({
        id: h.id, tipo: h.tipo, asunto: h.asunto,
        ultimo_mensaje: h.ultimo_mensaje, ultimo_en: h.ultimo_en,
        no_leidos: Number(h.no_leidos), con: contrapartes.get(h.id),
      })),
    },
  });
};

exports.hilo = async (req, res) => {
  const datos = await transaccion(async (conn) => {
    const h = await cargarHiloVisible(req.body.hilo_id, req.usuario, conn);
    const [mensajes] = await conn.query(
      `SELECT m.id, m.cuerpo, m.creado_en, m.remitente_id, u.nombre, u.apellido, r.nombre AS rol
       FROM mensajes m JOIN usuarios u ON u.id = m.remitente_id JOIN roles r ON r.id = u.rol_id
       WHERE m.hilo_id = ? ORDER BY m.id`, [h.id]);

    // Marcar como leído (si es un bibliotecario/dueño que mira una consulta, pasa a ser participante)
    if (mensajes.length) {
      await conn.query(
        `INSERT INTO hilo_participantes (hilo_id, usuario_id, ultimo_leido_id) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE ultimo_leido_id = GREATEST(COALESCE(ultimo_leido_id, 0), VALUES(ultimo_leido_id))`,
        [h.id, req.usuario.id, mensajes[mensajes.length - 1].id]);
    }
    const con = (await resolverContrapartes([h], req.usuario, conn)).get(h.id);
    return { h, mensajes, con };
  });

  res.json({
    ok: true,
    data: {
      hilo: { id: datos.h.id, tipo: datos.h.tipo, asunto: datos.h.asunto, con: datos.con },
      mensajes: datos.mensajes.map((m) => ({
        id: m.id,
        remitente: { id: m.remitente_id, nombre: nombreCompleto(m), rol: m.rol },
        cuerpo: m.cuerpo,
        creado_en: m.creado_en,
        mio: m.remitente_id === req.usuario.id,
      })),
    },
  });
};

exports.crear = async (req, res) => {
  const { tipo, asunto, cuerpo, destinatario_id } = req.body;
  const staff = esStaff(req.usuario);

  if (tipo === 'consulta' && staff) throw err.sinPermiso('Las consultas las inician los usuarios; vos podés responderlas.');
  if (tipo === 'interno' && !staff) throw err.sinPermiso('Los mensajes internos son solo para el equipo de la biblioteca.');

  if (tipo === 'interno') {
    if (!destinatario_id) throw err.validacion('Elegí a quién le escribís.', { destinatario_id: 'Obligatorio' });
    const [dest] = await consultar(
      'SELECT u.id, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?', [destinatario_id]);
    if (!dest || !esStaff(dest) || dest.id === req.usuario.id) throw err.validacion('Ese destinatario no es válido.', { destinatario_id: 'Destinatario inválido' });
    // Los mensajes internos son entre dueño y bibliotecario
    if (dest.rol === req.usuario.rol) throw err.validacion('Los mensajes internos son entre el dueño y un bibliotecario.', { destinatario_id: 'Destinatario inválido' });
  }

  const hiloId = await transaccion(async (conn) => {
    const [h] = await conn.query('INSERT INTO hilos (tipo, asunto, creado_por) VALUES (?, ?, ?)', [tipo, asunto, req.usuario.id]);
    const [m] = await conn.query('INSERT INTO mensajes (hilo_id, remitente_id, cuerpo) VALUES (?, ?, ?)', [h.insertId, req.usuario.id, cuerpo]);
    await conn.query('INSERT INTO hilo_participantes (hilo_id, usuario_id, ultimo_leido_id) VALUES (?, ?, ?)', [h.insertId, req.usuario.id, m.insertId]);
    if (tipo === 'interno') {
      await conn.query('INSERT INTO hilo_participantes (hilo_id, usuario_id) VALUES (?, ?)', [h.insertId, destinatario_id]);
    }
    return h.insertId;
  });
  res.status(201).json({ ok: true, data: { hilo: { id: hiloId, tipo, asunto } } });
};

exports.enviar = async (req, res) => {
  const mensaje = await transaccion(async (conn) => {
    const h = await cargarHiloVisible(req.body.hilo_id, req.usuario, conn);
    const [m] = await conn.query('INSERT INTO mensajes (hilo_id, remitente_id, cuerpo) VALUES (?, ?, ?)', [h.id, req.usuario.id, req.body.cuerpo]);
    await conn.query(
      `INSERT INTO hilo_participantes (hilo_id, usuario_id, ultimo_leido_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE ultimo_leido_id = VALUES(ultimo_leido_id)`, [h.id, req.usuario.id, m.insertId]);
    return { id: m.insertId, hilo_id: h.id };
  });
  const [m] = await consultar(
    `SELECT m.id, m.cuerpo, m.creado_en, m.remitente_id, u.nombre, u.apellido, r.nombre AS rol
     FROM mensajes m JOIN usuarios u ON u.id = m.remitente_id JOIN roles r ON r.id = u.rol_id WHERE m.id = ?`, [mensaje.id]);
  res.status(201).json({
    ok: true,
    data: {
      mensaje: {
        id: m.id, hilo_id: mensaje.hilo_id, cuerpo: m.cuerpo, creado_en: m.creado_en, mio: true,
        remitente: { id: m.remitente_id, nombre: nombreCompleto(m), rol: m.rol },
      },
    },
  });
};

exports.noLeidos = async (req, res) => {
  const staff = esStaff(req.usuario) ? 1 : 0;
  const [{ total }] = await consultar(
    `SELECT COUNT(*) AS total FROM mensajes m
     JOIN hilos h ON h.id = m.hilo_id
     LEFT JOIN hilo_participantes hp ON hp.hilo_id = h.id AND hp.usuario_id = ?
     WHERE (hp.usuario_id IS NOT NULL OR (h.tipo = 'consulta' AND ?))
       AND m.remitente_id <> ? AND m.id > COALESCE(hp.ultimo_leido_id, 0)`,
    [req.usuario.id, staff, req.usuario.id]);
  res.json({ ok: true, data: { total: Number(total) } });
};

exports.contactos = async (req, res) => {
  const buscado = req.usuario.rol === 'dueno' ? 'bibliotecario' : 'dueno';
  const filas = await consultar(
    "SELECT u.id, u.nombre, u.apellido, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = ? ORDER BY u.nombre",
    [buscado]);
  res.json({ ok: true, data: { contactos: filas.map((u) => ({ id: u.id, nombre: nombreCompleto(u), rol: u.rol })) } });
};
