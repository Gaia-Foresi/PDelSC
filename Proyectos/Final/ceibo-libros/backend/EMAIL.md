# Que lleguen los emails (código de recuperar contraseña, verificación, etc.)

Si el servidor no tiene SMTP configurado, **no manda nada**: solo escribe el email en el registro (log) del servidor.
En Vercel hay que cargar las variables a mano.

## Con Gmail (gratis)

1. En la cuenta de Google que va a enviar: activar la **verificación en 2 pasos**.
2. Entrar a https://myaccount.google.com/apppasswords y crear una **contraseña de aplicación** (16 letras). Se puede copiar con o sin espacios.
3. En Vercel, proyecto de la API (`ceibo-libros-api`) -> Settings -> Environment Variables, cargar:

| Variable | Valor |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | tu_cuenta@gmail.com |
| `SMTP_PASS` | la contraseña de aplicación de 16 letras (no la contraseña normal) |
| `MAIL_FROM` | `Ceibo Libros <tu_cuenta@gmail.com>` (opcional) |

4. Hacer **Redeploy** de la API (las variables nuevas no se aplican hasta redeployar).
5. Probar "Olvidé mi contraseña" con un email de una cuenta existente. Revisar también Spam.

## Si sigue sin llegar

- Vercel -> Deployments -> Functions/Logs: buscar `[email] no se pudo enviar el código`. Ahí figura el motivo (clave incorrecta, 2 pasos apagado, etc.).
- Por seguridad, si el email no existe en la base el sistema responde igual y no manda nada: usar el mismo email con el que se creó la cuenta.
- Esperar 30 segundos entre reenvíos.
