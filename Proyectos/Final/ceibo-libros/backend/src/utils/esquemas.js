// Validadores zod reutilizables (mensajes en español).
const { z } = require('zod');

const id = z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').positive('Debe ser positivo');

const texto = (max = 255) =>
  z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
    .trim().min(1, 'Obligatorio').max(max, `Máximo ${max} caracteres`);

const textoOpc = (max = 255) => z.string({ invalid_type_error: 'Debe ser texto' }).trim().max(max, `Máximo ${max} caracteres`).nullish();

const email = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
  .trim().toLowerCase().email('Email inválido').max(120, 'Máximo 120 caracteres');

const password = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
  .min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

const codigo = z.string({ required_error: 'Obligatorio' }).trim().regex(/^\d{6}$/, 'El código tiene 6 dígitos');

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (ej. #8FAE8B)');

const urlOpc = z.string().trim().max(500).url('URL inválida').nullish().or(z.literal(''));

const curso = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' }).trim().min(1, 'Obligatorio').max(40, 'Máximo 40 caracteres');
const dni = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' }).trim()
  .transform((v) => v.replace(/[.\s]/g, '')).pipe(z.string().regex(/^\d{6,9}$/, 'El DNI debe tener entre 6 y 9 números'));

module.exports = { curso, dni, z, id, texto, textoOpc, email, password, codigo, color, urlOpc };
