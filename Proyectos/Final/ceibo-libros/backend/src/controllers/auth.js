// Autenticación: registro, verificación de email, login (con 2 pasos opcional), redes sociales,
// renovación de tokens y recuperación de contraseña.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { consultar, transaccion } = require('../config/db');
const { err, HttpError } = require('../utils/httpError');
const { SQL_USUARIO } = require('../utils/serializers');
const { generarCodigo, sha256 } = require('../utils/codigos');
const { enviarCodigo } = require('../services/mailer');
const tokens = require('../services/tokens');
const oauth = require('../services/oauth');

const COSTO_BCRYPT = 10;
const MAX_INTENTOS_CODIGO = 5;
// Hash de relleno: se compara igual aunque el email no exista, para no revelar si la cuenta existe por el tiempo de respuesta.
const HASH_RELLENO = bcrypt.hashSync('relleno-no-usar', COSTO_BCRYPT);

const buscarPorEmail = async (email) =>
  (await consultar(
    'SELECT id, nombre, email, password_hash, email_verificado, dos_pasos_activo FROM usuarios WHERE email = ?', [email]))[0];

const cargarUsuario = async (id) => (await consultar(`${SQL_USUARIO} WHERE u.id = ?`, [id]))[0];

/** Genera un código de 6 dígitos (invalida los anteriores) y lo envía por email. */
async function emitirCodigo(usuario, proposito) {
  const codigo = generarCodigo();
  await consultar('UPDATE codigos_verificacion SET usado = 1 WHERE usuario_id = ? AND proposito = ? AND usado = 0', [usuario.id, proposito]);
  await consultar(
    'INSERT INTO codigos_verificacion (usuario_id, proposito, codigo_hash, expira_en) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
    [usuario.id, proposito, sha256(codigo)]);
  try {
    await enviarCodigo(usuario.email, usuario.nombre, proposito, codigo);
  } catch (e) {
    console.error('[email] no se pudo enviar el código:', e.message);
    throw new HttpError(502, 'EMAIL_NO_ENVIADO', 'No pudimos enviarte el email con el código. Probá de nuevo en un rato.');
  }
}

/** Valida un código (un solo uso, 10 min, máx. 5 intentos). Lanza CODIGO_INVALIDO si no corresponde. */
async function verificarCodigo(usuarioId, proposito, codigo) {
  const [c] = await consultar(
    `SELECT id, codigo_hash, intentos FROM codigos_verificacion
     WHERE usuario_id = ? AND proposito = ? AND usado = 0 AND expira_en > NOW() ORDER BY id DESC LIMIT 1`,
    [usuarioId, proposito]);
  if (!c || c.intentos >= MAX_INTENTOS_CODIGO) throw err.codigoInvalido();

  // Comparación segura de hashes: timingSafeEqual evita ataques de tiempo que revelen el hash correcto.
  const esperado = Buffer.from(c.codigo_hash, 'hex');
  const recibido = Buffer.from(sha256(codigo), 'hex');
  if (!crypto.timingSafeEqual(esperado, recibido)) {
    await consultar('UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = ?', [c.id]);
    throw err.codigoInvalido();
  }
  // Marcar como usado de forma atómica: si dos pedidos llegan a la vez, solo uno gana.
  const r = await consultar('UPDATE codigos_verificacion SET usado = 1 WHERE id = ? AND usado = 0', [c.id]);
  if (r.affectedRows === 0) throw err.codigoInvalido();
}

const sesionDe = async (id) => tokens.emitirSesion(await cargarUsuario(id));

// Registro de un nuevo usuario (o reenvío de código si ya estaba registrado pero no verificado)
exports.registro = async (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  const existente = await buscarPorEmail(email);
  if (existente?.email_verificado) throw err.conflicto('EMAIL_EN_USO', 'Ese email ya está registrado. Iniciá sesión.');

  // Si ya había un registro sin verificar, se pisa el nombre, apellido y contraseña. Si no, se crea uno nuevo.
  const hash = await bcrypt.hash(password, COSTO_BCRYPT);
  let usuario;
  if (existente) {
    // Registro anterior sin verificar: se pisan los datos y se reenvía el código.
    await consultar('UPDATE usuarios SET nombre = ?, apellido = ?, password_hash = ? WHERE id = ?', [nombre, apellido, hash, existente.id]);
    usuario = { id: existente.id, nombre, email };
  } else {
    const r = await consultar(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id) VALUES (?, ?, ?, ?, 3)', [nombre, apellido, email, hash]);
    usuario = { id: r.insertId, nombre, email };
  }
  await emitirCodigo(usuario, 'verificar_email');
  res.status(201).json({ ok: true, data: { requiere_verificacion: true, email } });
};

// Verifica el código de verificación de email
exports.verificarEmail = async (req, res) => {
  const { email, codigo } = req.body;
  const u = await buscarPorEmail(email);
  if (!u) throw err.codigoInvalido();
  await verificarCodigo(u.id, 'verificar_email', codigo);
  await consultar('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [u.id]);
  res.json({ ok: true, data: await sesionDe(u.id) });
};

// Login con email y contraseña. Si el usuario tiene 2FA activo, devuelve un mensaje indicando que debe ingresar el código.
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const u = await buscarPorEmail(email);
  const coincide = await bcrypt.compare(password, u?.password_hash || HASH_RELLENO);
  if (!u || !u.password_hash || !coincide) throw err.credenciales();

  // Si el email no está verificado, se envía un código de verificación y se indica que requiere verificación.
  if (!u.email_verificado) {
    await emitirCodigo(u, 'verificar_email');
    return res.json({ ok: true, data: { requiere_verificacion: true, email } });
  }

  // Si el usuario tiene 2FA activo, se envía un código de verificación y se indica que requiere 2FA.
  if (u.dos_pasos_activo) {
    await emitirCodigo(u, 'login_2fa');
    return res.json({ ok: true, data: { requiere_2fa: true, email } });
  }
  res.json({ ok: true, data: await sesionDe(u.id) });
};

// Login con código de 2FA. Se llama después de login si el usuario tiene 2FA activo.
exports.login2fa = async (req, res) => {
  const { email, codigo } = req.body;
  const u = await buscarPorEmail(email);
  if (!u || !u.dos_pasos_activo) throw err.codigoInvalido();
  await verificarCodigo(u.id, 'login_2fa', codigo);
  res.json({ ok: true, data: await sesionDe(u.id) });
};

// Reenvía un código de verificación de email, 2FA o reset de contraseña. No revela si el email existe.
exports.reenviarCodigo = async (req, res) => {
  const { email, proposito } = req.body;
  const u = await buscarPorEmail(email);
  // Siempre responde igual (no revela si el email existe). Espera 30 s entre envíos.
  if (u) {
    const aplica =
      (proposito === 'verificar_email' && !u.email_verificado) ||
      (proposito === 'login_2fa' && u.dos_pasos_activo) ||
      proposito === 'reset_password';
    const [reciente] = await consultar(
      'SELECT id FROM codigos_verificacion WHERE usuario_id = ? AND proposito = ? AND creado_en > DATE_SUB(NOW(), INTERVAL 30 SECOND) LIMIT 1',
      [u.id, proposito]);
    if (aplica && !reciente) await emitirCodigo(u, proposito);
  }
  res.json({ ok: true, data: { enviado: true } });
};

// Login o registro con redes sociales (Google, Facebook, etc.). Si el email ya existe, se asocia la identidad social a esa cuenta.
exports.social = async (req, res) => {
  const { proveedor, modo = 'registro' } = req.body;
  const datos = await oauth[proveedor](req.body);
  const email = datos.email.toLowerCase();

  // Se busca si ya existe una identidad social asociada a un usuario
  const [identidad] = await consultar(
    'SELECT usuario_id FROM identidades_sociales WHERE proveedor = ? AND proveedor_uid = ?', [proveedor, datos.uid]);

  // Si no existe, se busca si ya hay un usuario con ese email. Si tampoco existe, se crea uno nuevo.
  let usuarioId = identidad?.usuario_id;
  if (!usuarioId) {
    usuarioId = await transaccion(async (conn) => {
      const [[existente]] = await conn.query(
        'SELECT id, email_verificado, foto_url FROM usuarios WHERE email = ? FOR UPDATE', [email]);
      let id;
      if (existente) {
        id = existente.id;
        // El proveedor ya verificó el email. Si la cuenta estaba SIN verificar se borra su contraseña,
        // para que quien la haya creado con un email ajeno no pueda entrar después.
        if (!existente.email_verificado) {
          await conn.query('UPDATE usuarios SET email_verificado = 1, password_hash = NULL WHERE id = ?', [id]);
        }
        if (!existente.foto_url && datos.foto) await conn.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [datos.foto, id]);
      } else {
        // Desde la pantalla de ingreso no se crean cuentas nuevas
        if (modo === 'ingreso') {
          throw new HttpError(404, 'CUENTA_INEXISTENTE', 'No hay una cuenta con ese email. Primero creala con "Crear cuenta".');
        }
        const [r] = await conn.query(
          'INSERT INTO usuarios (nombre, apellido, email, rol_id, email_verificado, foto_url) VALUES (?, ?, ?, 3, 1, ?)',
          [datos.nombre.slice(0, 60), (datos.apellido || '').slice(0, 60), email, datos.foto]);
        id = r.insertId;
      }
      await conn.query('INSERT INTO identidades_sociales (usuario_id, proveedor, proveedor_uid) VALUES (?, ?, ?)', [id, proveedor, datos.uid]);
      return id;
    });
  }
  res.json({ ok: true, data: await sesionDe(usuarioId) });
};

// Renueva el token de acceso usando un refresh token válido. Devuelve un nuevo par de tokens.
exports.refresh = async (req, res) => {
  res.json({ ok: true, data: await tokens.rotarRefresh(req.body.refresh_token) });
};

// Revoca un refresh token (logout). No revela si el token existía.
exports.logout = async (req, res) => {
  await tokens.revocarRefresh(req.body.refresh_token);
  res.json({ ok: true, data: { ok: true } });
};

// Inicia el proceso de recuperación de contraseña: envía un código al email si existe.
exports.olvidePassword = async (req, res) => {
  const u = await buscarPorEmail(req.body.email);
  if (u) await emitirCodigo(u, 'reset_password');
  res.json({ ok: true, data: { enviado: true } });
};

// Cambia la contraseña de un usuario usando un código de recuperación. Cierra todas las sesiones abiertas.
exports.resetPassword = async (req, res) => {
  const { email, codigo, password } = req.body;
  const u = await buscarPorEmail(email);
  if (!u) throw err.codigoInvalido();
  await verificarCodigo(u.id, 'reset_password', codigo);
  const hash = await bcrypt.hash(password, COSTO_BCRYPT);
  // Recibir el código en su email también prueba que es dueño de la casilla.
  await consultar('UPDATE usuarios SET password_hash = ?, email_verificado = 1 WHERE id = ?', [hash, u.id]);
  await tokens.revocarTodos(u.id); // cierra todas las sesiones abiertas
  res.json({ ok: true, data: { actualizado: true } });
};

exports._internos = { COSTO_BCRYPT };
