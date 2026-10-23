// Envío de emails con nodemailer. Sin SMTP configurado, el email se imprime en consola (modo desarrollo).
const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');

let transporte = null;
if (smtp.host) {
  transporte = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Plantilla simple con los colores de la marca. `html` ya debe venir escapado por quien llama. */
function plantilla(titulo, htmlCuerpo) {
  return `<div style="font-family:Arial,sans-serif;background:#F3E5D8;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px;color:#37474F">
    <h2 style="margin:0 0 12px;color:#2E4A2E">Ceibo Libros · Biblioteca</h2>
    <h3 style="margin:0 0 12px">${escapar(titulo)}</h3>
    ${htmlCuerpo}
    <p style="font-size:12px;color:#8D6E63;margin-top:24px">Este es un mensaje automático, no lo respondas.</p>
  </div></div>`;
}

/** Envía un email. Devuelve { simulado }. Lanza error si el SMTP falla. */
async function enviarEmail({ para, asunto, texto, html }) {
  if (!transporte) {
    console.log(`\n[EMAIL SIMULADO] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return { simulado: true };
  }
  await transporte.sendMail({ from: smtp.from, to: para, subject: asunto, text: texto, html });
  return { simulado: false };
}

/** Código de un solo uso (verificación, 2 pasos, reset). */
async function enviarCodigo(para, nombre, proposito, codigo) {
  const titulos = {
    verificar_email: 'Verificá tu email',
    login_2fa: 'Código de inicio de sesión',
    reset_password: 'Recuperá tu contraseña',
  };
  const asunto = `${titulos[proposito]} · Ceibo Libros`;
  const texto = `Hola ${nombre}, tu código es ${codigo}. Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.`;
  const html = plantilla(titulos[proposito],
    `<p>Hola ${escapar(nombre)}, tu código es:</p>
     <p style="font-size:32px;letter-spacing:6px;font-weight:bold;color:#2E4A2E">${escapar(codigo)}</p>
     <p>Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>`);
  return enviarEmail({ para, asunto, texto, html });
}

module.exports = { enviarEmail, enviarCodigo, plantilla, escapar };
