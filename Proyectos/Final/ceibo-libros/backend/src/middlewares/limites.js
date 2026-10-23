// Límites de peticiones (anti fuerza bruta).
const rateLimit = require('express-rate-limit');

const respuesta = {
  ok: false,
  error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' },
};

// Login, códigos y registro: 20 intentos cada 15 minutos por IP (configurable con LIMITE_AUTH)
const limiteAuth = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.LIMITE_AUTH) || 20, standardHeaders: true, legacyHeaders: false, message: respuesta });

// Resto de la API: 600 por minuto por IP (configurable con LIMITE_GENERAL; varios celulares en un mismo wifi comparten IP)
const limiteGeneral = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.LIMITE_GENERAL) || 600, standardHeaders: true, legacyHeaders: false, message: respuesta });

module.exports = { limiteAuth, limiteGeneral };
