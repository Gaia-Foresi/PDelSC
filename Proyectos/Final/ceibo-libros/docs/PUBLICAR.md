# Publicar Ceibo Libros (base en Aiven + backend en Railway + web en Netlify)

Tres piezas, todas en internet: **la base de datos** (Aiven), **el backend** (Railway) y **la app web** (Netlify). Al final, los botones de Google/GitHub/Discord y los emails funcionan igual que en tu compu, pero con direcciones reales.

> Los nombres de los botones de cada sitio pueden cambiar un poco; si algo no coincide, buscá la opción equivalente.
> **Nunca subas a GitHub** `backend/.env`, `mobile/.env` ni `ca.pem` (el `.gitignore` ya los excluye; verificalo antes de subir).

---

## Parte 1 · Base de datos: seguir con Aiven

No hace falta crear otra base: la app publicada usa **la misma base de Aiven** que ya tenés (con tus usuarios, libros y reservas). Solo hay que prepararla para recibir conexiones desde Railway.

1. Entrá a <https://console.aiven.io> → tu servicio MySQL. Verificá que esté en estado **Running** (si está apagado, encendelo).
2. Buscá **Allowed IP addresses** (o *Network access*) y permití el acceso desde cualquier lugar: `0.0.0.0/0`. Railway no tiene una IP fija; con otra restricción la conexión se rechaza.
3. En la pestaña **Overview** anotá los datos de conexión: *Host*, *Port*, *User*, *Password* y la base (`defaultdb`, salvo que hayas creado otra). Descargá el **CA certificate** (`ca.pem`).
4. Convertí el certificado a **una sola línea** para poder pegarlo en Railway. En la terminal de VSCode, dentro de `backend`:
   ```bash
   node -e "console.log(require('fs').readFileSync('ca.pem','utf8').trim().replace(/\r?\n/g,'\\\\n'))"
   ```
   Copiá todo lo que imprime (empieza con `-----BEGIN CERTIFICATE-----\n...`): ese es el valor de `DB_SSL_CA`.

> Las tablas se crean y actualizan solas cada vez que arranca el servidor. Si es la primera vez en una base vacía, corré una vez `npm run db:init` desde tu compu (con tu `.env` de Aiven).

---

## Parte 2 · Backend en Railway

1. Subí el proyecto a un repositorio **privado** de GitHub (carpeta `ceibo-libros` completa).
2. Entrá a <https://railway.com> e iniciá sesión con GitHub. **New Project → Deploy from GitHub repo** y elegí el repositorio.
3. En el servicio nuevo → **Settings**:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start` (suele detectarlo solo)
   - **Networking → Generate Domain:** te da una dirección tipo `https://ceibo-libros-production.up.railway.app`.
4. En **Variables** del servicio, cargá:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | los datos de Aiven (Parte 1, paso 3) |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | el certificado en una sola línea (Parte 1, paso 4) |
| `JWT_ACCESS_SECRET` | un secreto nuevo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TZ_OFFSET_HORAS` | `-3` (hora de Argentina; define "hoy", vencimientos y horarios de visita) |
| `CORS_ORIGIN` | la dirección de tu web (Parte 3); mientras tanto `*` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | los mismos que en tu `.env` (así llegan los códigos a cualquier Gmail) |
| `GOOGLE_CLIENT_IDS`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID` | los mismos que en tu `.env` |
| `VISITA_HORA_APERTURA`, `VISITA_HORA_CIERRE`, `VISITA_DIAS`, `VISITA_PASO_MIN` | opcionales: horarios del calendario de visitas (por defecto 8 a 18, lunes a viernes, cada 30 min) |
| `CRON_SECRET` | un texto largo (opcional, para los recordatorios) |

   No hace falta definir `PORT`: Railway lo pone solo.
5. Esperá a que termine el despliegue. Probalo desde una terminal (la API es solo POST, así que abrirla en el navegador no sirve):
   ```bash
   curl -X POST https://TU-DIRECCION/api/salud
   ```
   Debe responder `{"ok":true,"data":{"estado":"ok"}}`.

Al arrancar, el servidor agrega solo las tablas y columnas nuevas (por ejemplo, las de día y hora de visita), así que no tenés que correr migraciones a mano. En los registros (*Deployments → View logs*) tiene que aparecer `[db] Conectado a ...aivencloud.com...`.

---

## Parte 3 · App web en Netlify

1. En `mobile/.env` poné la dirección del backend publicado (el valor se incorpora al construir la web) y las claves públicas de los logins:
   ```ini
   EXPO_PUBLIC_API_URL=https://TU-DIRECCION/api
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   EXPO_PUBLIC_GITHUB_CLIENT_ID=...
   EXPO_PUBLIC_DISCORD_CLIENT_ID=...
   ```
2. Construí la web:
   ```bash
   cd mobile
   npm run build:web
   ```
   Se crea la carpeta `mobile/dist`.
3. Entrá a <https://app.netlify.com/drop> y arrastrá la carpeta `dist`. Te da una dirección tipo `https://nombre.netlify.app` (podés cambiarle el nombre en *Site settings*).
4. Volvé a Railway y poné `CORS_ORIGIN=https://nombre.netlify.app` en el backend (sin barra al final).

Cada vez que cambies algo de la app, repetí los pasos 2 y 3.

---

## Parte 4 · Habilitar el login social con la dirección real

Agregá la dirección de tu web (`https://nombre.netlify.app`) a cada servicio, **además** de `localhost`:

* **Google** (credencial tipo *Aplicación web*): en *Orígenes de JavaScript autorizados* → `https://nombre.netlify.app`; en *URI de redireccionamiento* → `https://nombre.netlify.app`. Para que entre cualquier persona, en **Público** pasá la app a **En producción**.
* **GitHub:** una OAuth App admite una sola dirección de retorno. Creá una **segunda OAuth App** con *callback* `https://nombre.netlify.app/oauth` y usá su Client ID y Secret en las variables de Railway y en `mobile/.env` de la web publicada.
* **Discord:** en *OAuth2 → Redirects* agregá `https://nombre.netlify.app/oauth`.

---

## Lista de comprobación final

- [ ] `curl -X POST https://TU-DIRECCION/api/salud` responde `ok`.
- [ ] Entrás con `gerente@ceibolibros.com` (el dueño) desde la web publicada.
- [ ] Te registrás con un email nuevo y **llega** el código a tu Gmail.
- [ ] Los botones de Google, GitHub y Discord abren la ventana del servicio y vuelven a la app.
- [ ] Una reserva te deja elegir día y hora en el mini calendario y muestra su código de retiro.
- [ ] El gerente y el bibliotecario ven esa visita en el **Calendario de visitas** (menú lateral).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| La web dice "No pudimos conectarnos con el servidor" | `EXPO_PUBLIC_API_URL` no se cargó antes de `build:web`, o termina sin `/api`. Corregí el `.env` y volvé a construir. |
| Error de CORS en la consola del navegador | `CORS_ORIGIN` en Railway no coincide exactamente con la dirección de la web (sin barra final). |
| En los logs de Railway: `ETIMEDOUT`, `ECONNREFUSED` o `Access denied` | En Aiven falta permitir `0.0.0.0/0` en *Allowed IP addresses*, el servicio está apagado, o hay un dato mal copiado (host, puerto, usuario o clave). |
| `self-signed certificate in certificate chain` o error de SSL | `DB_SSL_CA` está mal pegado: tiene que ser el contenido de `ca.pem` en **una sola línea**, con los saltos escritos como `\n`, y `DB_SSL=true`. |
| Al reservar no aparecen días ni horarios (404 en `/reservas/horarios`) | El backend publicado es una versión vieja. Subí la carpeta `backend` actualizada a GitHub y esperá el nuevo despliegue. |
| Los horarios de visita salen corridos | Falta `TZ_OFFSET_HORAS=-3` en las variables del backend. |
| Al recargar una página interna de la web da 404 | Falta el archivo `mobile/public/_redirects` (ya viene en el proyecto) o no se volvió a construir. |
| Los botones sociales vuelven con error | La dirección registrada no es exactamente `https://nombre.netlify.app` (o `/oauth` para GitHub y Discord). |
