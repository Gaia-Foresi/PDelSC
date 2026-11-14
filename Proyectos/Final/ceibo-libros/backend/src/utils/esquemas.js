// zod describe cómo tienen que ser los datos (tipo, largo, formato) y los valida. Estos son los "ladrillos"
// que después se combinan en cada ruta.
// Validadores zod reutilizables (mensajes en español).
import { z } from 'zod';

// id: número entero positivo. "coerce" convierte "5" (texto) en 5 (número).
const id = z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').positive('Debe ser positivo');

// texto obligatorio: sin espacios a los costados, no vacío y con un máximo de caracteres.
const texto = (max = 255) =>
  z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
    .trim().min(1, 'Obligatorio').max(max, `Máximo ${max} caracteres`);

// texto opcional: puede faltar o ser null.
const textoOpc = (max = 255) => z.string({ invalid_type_error: 'Debe ser texto' }).trim().max(max, `Máximo ${max} caracteres`).nullish();

// email: se limpia, se pasa a minúscula y se valida el formato.
const email = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
  .trim().toLowerCase().email('Email inválido').max(120, 'Máximo 120 caracteres');

// contraseña: 8 a 72 caracteres, con al menos una letra y un número (72 es el máximo que usa bcrypt).
const password = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' })
  .min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

// código de verificación: exactamente 6 dígitos.
const codigo = z.string({ required_error: 'Obligatorio' }).trim().regex(/^\d{6}$/, 'El código tiene 6 dígitos');

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (ej. #8FAE8B)');

const urlOpc = z.string().trim().max(500).url('URL inválida').nullish().or(z.literal(''));

const curso = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' }).trim().min(1, 'Obligatorio').max(40, 'Máximo 40 caracteres');
// DNI: se le sacan puntos y espacios y después se valida que tenga entre 6 y 9 números.
const dni = z.string({ required_error: 'Obligatorio', invalid_type_error: 'Debe ser texto' }).trim()
  .transform((v) => v.replace(/[.\s]/g, '')).pipe(z.string().regex(/^\d{6,9}$/, 'El DNI debe tener entre 6 y 9 números'));

export { curso, dni, z, id, texto, textoOpc, email, password, codigo, color, urlOpc };
