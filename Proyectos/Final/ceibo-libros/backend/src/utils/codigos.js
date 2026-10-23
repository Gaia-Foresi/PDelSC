const crypto = require('crypto');

/** Código numérico de 6 dígitos criptográficamente seguro. */
const generarCodigo = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** Hash SHA-256 (hex) — así nunca se guardan códigos ni tokens en claro. */
const sha256 = (texto) => crypto.createHash('sha256').update(String(texto)).digest('hex');

/** Token aleatorio opaco para los refresh tokens. */
const tokenAleatorio = () => crypto.randomBytes(48).toString('base64url');

module.exports = { generarCodigo, sha256, tokenAleatorio };

// Código de retiro: 6 caracteres sin letras que se confunden (sin 0/O, 1/I/L)
const ALFABETO_RETIRO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generarCodigoRetiro = () => Array.from({ length: 6 }, () => ALFABETO_RETIRO[crypto.randomInt(0, ALFABETO_RETIRO.length)]).join('');

/** Genera un código de retiro que no exista en reservas ni préstamos. `conn` puede ser un pool o una conexión. */
async function codigoRetiroUnico(conn) {
  for (let i = 0; i < 20; i += 1) {
    const c = generarCodigoRetiro();
    const [[{ n }]] = await conn.query(
      'SELECT (SELECT COUNT(*) FROM reservas WHERE codigo_retiro = ?) + (SELECT COUNT(*) FROM prestamos WHERE codigo_retiro = ?) AS n', [c, c]);
    if (Number(n) === 0) return c;
  }
  throw new Error('No se pudo generar un código de retiro único');
}

module.exports.generarCodigoRetiro = generarCodigoRetiro;
module.exports.codigoRetiroUnico = codigoRetiroUnico;
