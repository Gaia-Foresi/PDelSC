// Autenticación: registro, verificación de email, login (con 2 pasos opcional), redes sociales,
// renovación de tokens y recuperación de contraseña.
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { consultar, transaccion } from '../config/db.js';
import { err, HttpError } from '../utils/httpError.js';
import { SQL_USUARIO } from '../utils/serializers.js';
import { generarCodigo, sha256 } from '../utils/codigos.js';
import { enviarCodigo } from '../services/mailer.js';
import * as tokens from '../services/tokens.js';
import * as oauth from '../services/oauth.js';

// COSTO_BCRYPT: cuántas vueltas de cálculo hace bcrypt al encriptar (más alto = más seguro y más lento).
const COSTO_BCRYPT = 10;
// Cantidad de veces que se puede errar un código antes de que quede inutilizado.
const MAX_INTENTOS_CODIGO = 5;
// Hash de relleno: se compara igual aunque el email no exista, para no revelar si la cuenta existe por el tiempo de respuesta.
const HASH_RELLENO = bcrypt.hashSync('relleno-no-usar', COSTO_BCRYPT);

// Busca un usuario por email (incluye el hash de la contraseña, por eso es solo para uso interno).
const buscarPorEmail = async (email) =>
  (await consultar(
    'SELECT id, nombre, email, password_hash, email_verificado, dos_pasos_activo, estado, motivo_bloqueo, tipo_bloqueo FROM usuarios WHERE email = ?', [email]))[0];

// Carga el usuario completo con su rol, en el formato público (sin contraseña).
const cargarUsuario = async (id) => (await consultar(`${SQL_USUARIO} WHERE u.id = ?`, [id]))[0];

/** Genera un código de 6 dígitos (invalida los anteriores) y lo envía por email. */
async function emitirCodigo(usuario, proposito) {
  // El código se guarda como hash (sha256), nunca en texto plano, y vence a los 10 minutos.
  const codigo = generarCodigo();
  // Primero anulamos los códigos anteriores del mismo tipo: solo vale el último que se mandó.
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

  // timingSafeEqual compara tardando siempre lo mismo, así no se puede adivinar el código midiendo tiempos.
  const esperado = Buffer.from(c.codigo_hash, 'hex');
  const recibido = Buffer.from(sha256(codigo), 'hex');
  if (!crypto.timingSafeEqual(esperado, recibido)) {
    // Si el código está mal, sumamos un intento fallido.
    await consultar('UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = ?', [c.id]);
    throw err.codigoInvalido();
  }
  // Marcar como usado de forma atómica: si dos pedidos llegan a la vez, solo uno gana.
  const r = await consultar('UPDATE codigos_verificacion SET usado = 1 WHERE id = ? AND usado = 0', [c.id]);
  if (r.affectedRows === 0) throw err.codigoInvalido();
}

/** Una cuenta bloqueada no puede iniciar sesión (ni por contraseña, ni con 2 pasos, ni con redes sociales). */
const exigirNoBloqueado = (u) => {
  if (u?.estado === 'bloqueado') throw err.bloqueado(`Tu cuenta está bloqueada ${u.tipo_bloqueo === 'dano' ? 'por daño a un libro' : 'por atraso en la devolución'} y no podés iniciar sesión.${u.motivo_bloqueo ? ` Motivo: ${u.motivo_bloqueo}` : ''} Acercate a la biblioteca para regularizarla.`);
};

// Arma la sesión (tokens) de un usuario, previo chequeo de que no esté bloqueado.
const sesionDe = async (id) => {
  const usuario = await cargarUsuario(id);
  exigirNoBloqueado(usuario);
  return tokens.emitirSesion(usuario);
};

// Registro: crea la cuenta (o actualiza una anterior sin verificar) y manda un código al email.
// Si el email ya pertenece a una cuenta verificada, responde 409. El rol 3 es el de usuario común.
export const registro = async (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  const existente = await buscarPorEmail(email);
  if (existente?.email_verificado) throw err.conflicto('EMAIL_EN_USO', 'Ese email ya está registrado. Iniciá sesión.');

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

// Verificar email
// Confirma que el email del usuario es realmente suyo.
// El usuario manda su email y el código que le llegó por correo.
// Si el código es correcto, el email queda marcado como verificado y el usuario queda logueado.
export const verificarEmail = async (req, res) => {
  // Sacamos el email y el código que mandó el usuario
  const { email, codigo } = req.body;

  // Buscamos en la base al usuario con ese email
  const u = await buscarPorEmail(email);

  // Si no existe, respondemos "código inválido" en vez de "el email no existe".
  // Es a propósito: así nadie puede averiguar qué emails están registrados.
  if (!u) throw err.codigoInvalido();

  // Revisamos que el código sea el correcto para este usuario y para esta tarea.
  // Si está mal o venció, esta función lanza un error y se corta todo acá.
  await verificarCodigo(u.id, 'verificar_email', codigo);

  // El código estaba bien: marcamos el email como verificado (1 = sí)
  await consultar('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [u.id]);

  // Respondemos que salió todo bien y mandamos la sesión,
  // así el usuario queda logueado sin tener que volver a ingresar.
  res.json({ ok: true, data: await sesionDe(u.id) });
};

export const login = async (req, res) => {
  // recibe email y contraseña, se fija si son correctos y, 
  // si no lo son, rechaza el ingreso sin dar pistas a quien está intentando entrar.
  const { email, password } = req.body;
  const u = await buscarPorEmail(email);
  // Si el usuario no existe se compara con HASH_RELLENO: así la respuesta tarda lo mismo exista o no.
  const coincide = await bcrypt.compare(password, u?.password_hash || HASH_RELLENO);
  if (!u || !u.password_hash || !coincide) throw err.credenciales();
  exigirNoBloqueado(u); // recién después de validar la contraseña: no se revela el estado a quien no la conoce

  // si la contraseña es correcta pero el usuario no confirmó su email, no se inicia la sesión. 
  // Se le manda un código por email y se responde para que el frontend muestre la pantalla del código.
  if (!u.email_verificado) {
    await emitirCodigo(u, 'verificar_email');
    return res.json({ ok: true, data: { requiere_verificacion: true, email } });
  }
  // cuando el usuario ya puso bien su email y contraseña, y decide qué pasa después: 
  // si tiene la verificación en dos pasos activada, le manda un código 
  // y todavía no lo deja entrar; si no la tiene, lo deja entrar directo.
  if (u.dos_pasos_activo) {
    await emitirCodigo(u, 'login_2fa');
    return res.json({ ok: true, data: { requiere_2fa: true, email } });
  }
  res.json({ ok: true, data: await sesionDe(u.id) });
};

// login con verificación en dos pasos. Recibe email y código. 
// Busca al usuario y revisa tres cosas: que exista y tenga 2FA activado, 
// que no esté bloqueado y que el código sea correcto y sea para login
export const login2fa = async (req, res) => {
  const { email, codigo } = req.body;
  const u = await buscarPorEmail(email);
  if (!u || !u.dos_pasos_activo) throw err.codigoInvalido();
  exigirNoBloqueado(u);
  await verificarCodigo(u.id, 'login_2fa', codigo);
  res.json({ ok: true, data: await sesionDe(u.id) });
};

// reenvía un código de verificación. Recibe email y proposito. 
// Si el usuario existe, decide si corresponde mandarlo: verificar un email todavía no verificado, 
// entrar con 2 pasos si los tiene activados, o recuperar la contraseña siempre.
export const reenviarCodigo = async (req, res) => {
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

// Login con Google, GitHub o Discord. Si la cuenta social ya estaba vinculada, entra directo.
// Si no, la vincula a un usuario con el mismo email o crea uno nuevo (todo dentro de una transacción).
export const social = async (req, res) => {
  // Toma los datos que manda el usuario, le pregunta al proveedor quién es esa persona y se queda con su email.
  const { proveedor, modo = 'registro' } = req.body;
  // oauth[proveedor] elige la función según el nombre: oauth.google, oauth.github u oauth.discord.
  const datos = await oauth[proveedor](req.body);
  const email = datos.email.toLowerCase();

  const [identidad] = await consultar(
    'SELECT usuario_id FROM identidades_sociales WHERE proveedor = ? AND proveedor_uid = ?', [proveedor, datos.uid]);

  let usuarioId = identidad?.usuario_id;
  //  Si todavía no sabemos qué usuario es, lo buscamos por email o lo creamos.
  if (!usuarioId) {
    // FOR UPDATE "traba" la fila mientras dura la transacción, para que dos pedidos simultáneos no creen dos cuentas.
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
        // crea un usuario nuevo en la base de datos y guarda su id
        const [r] = await conn.query(
          'INSERT INTO usuarios (nombre, apellido, email, rol_id, email_verificado, foto_url) VALUES (?, ?, ?, 3, 1, ?)',
          [datos.nombre.slice(0, 60), (datos.apellido || '').slice(0, 60), email, datos.foto]);
        id = r.insertId;
      }
      // Guardamos el vínculo entre la cuenta social y el usuario, para que la próxima vez entre directo.
      await conn.query('INSERT INTO identidades_sociales (usuario_id, proveedor, proveedor_uid) VALUES (?, ?, ?)', [id, proveedor, datos.uid]);
      return id;
    });
  }
  res.json({ ok: true, data: await sesionDe(usuarioId) });
};

// endpoint para renovar la sesión del usuario sin pedirle que vuelva a loguearse.
export const refresh = async (req, res) => {
  res.json({ ok: true, data: await tokens.rotarRefresh(req.body.refresh_token) });
};

// Cuando el usuario toca “Cerrar sesión”, la app llama a esta ruta, 
// que anula su refresh token para que no se pueda volver a usar.
export const logout = async (req, res) => {
  await tokens.revocarRefresh(req.body.refresh_token);
  res.json({ ok: true, data: { ok: true } });
};

// Busca al usuario por email y, si existe, le manda un código de tipo reset_password
export const olvidePassword = async (req, res) => {
  const u = await buscarPorEmail(req.body.email);
  // Responde siempre lo mismo, exista o no el email, para no revelar qué cuentas hay.
  if (u) await emitirCodigo(u, 'reset_password');
  res.json({ ok: true, data: { enviado: true } });
};

// Restablece la contraseña de un usuario que se la olvidó.
export const resetPassword = async (req, res) => {
  // Sacamos del body lo que mandó el usuario desde el formulario.
  const { email, codigo, password } = req.body;

  // Buscamos al usuario por su email.
  const u = await buscarPorEmail(email);

  // Si el email no existe, decimos "código inválido" en vez de
  // "el email no existe". Así nadie puede usar este formulario
  // para averiguar qué emails están registrados.
  if (!u) throw err.codigoInvalido();

  // Revisamos que el código sea correcto, que sea de este usuario,
  // que sea para cambiar la contraseña y que no haya vencido.
  // Si algo falla, esta función tira el error y se corta todo acá.
  await verificarCodigo(u.id, 'reset_password', codigo);

  // Encriptamos la contraseña nueva. Nunca se guarda tal cual,
  // solo su "hash" (una versión ilegible que no se puede revertir).
  const hash = await bcrypt.hash(password, COSTO_BCRYPT);

  // Guardamos la contraseña nueva y marcamos el email como verificado:
  // si recibió el código en su email y lo usó, quedó probado
  // que es el dueño de esa casilla.
  await consultar(
    'UPDATE usuarios SET password_hash = ?, email_verificado = 1 WHERE id = ?',
    [hash, u.id]
  );

  // Cerramos todas las sesiones abiertas del usuario en todos los
  // dispositivos. Si alguien se había metido en su cuenta, queda afuera.
  await tokens.revocarTodos(u.id);

  // Le avisamos al frontend que salió todo bien.
  res.json({ ok: true, data: { actualizado: true } });
};
