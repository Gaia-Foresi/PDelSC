# Guía de instalación y configuración

Esta guía deja funcionando **Ceibo Libros** de principio a fin: base de datos MySQL en la nube, API, app en el celular y APK.

> **Requisito del proyecto:** la base de datos **no puede ser local**. En esta guía se usa un servicio MySQL en la nube; el backend solo se conecta con las variables del archivo `.env`.

## Resumen del orden

1. Instalar Node.js y Git (abajo).
2. Crear la base MySQL en la nube (paso 1).
3. **Backend:** instalar dependencias, completar `backend/.env`, crear las tablas y arrancar (paso 2).
4. **App:** instalar dependencias, completar `mobile/.env` y arrancar (paso 4).
5. Opcional: login social (paso 5), APK (paso 6) y publicación en internet (ver [`PUBLICAR.md`](PUBLICAR.md)).

Siempre abrí **dos terminales**: una en la carpeta `backend` y otra en `mobile`. Los archivos `.env` no se suben a GitHub: cada persona crea el suyo copiando `.env.example`.

## Qué necesitás instalar

| Programa | Para qué | Versión |
|---|---|---|
| [Node.js](https://nodejs.org) | backend y app | 18 o superior (probado con 22) |
| [Git](https://git-scm.com) | control de versiones | cualquiera |
| App **Expo Go** (Play Store) | probar la app en tu celular | última |
| Cuenta en [expo.dev](https://expo.dev) | generar el APK con EAS Build | gratis |

---

## Paso 1 · Base de datos MySQL en la nube

Opciones gratuitas que sirven (elegí una): **Aiven for MySQL** (plan gratuito), **Railway**, **TiDB Cloud** o **Clever Cloud**. Con Aiven:

1. Creá una cuenta en <https://aiven.io> y un servicio **MySQL** con el plan *Free*.
2. Cuando esté en estado *Running*, en la pestaña **Overview** copiá: *Host*, *Port*, *User*, *Password* y *Database name* (por defecto `defaultdb`).
3. Descargá el **CA certificate** (botón en la misma pantalla) y guardalo, por ejemplo, como `backend/ca.pem`.

> Cualquier otro proveedor funciona igual: solo necesitás host, puerto, usuario, contraseña y nombre de base. Casi todos exigen SSL.

## Paso 2 · Backend (API)

```bash
cd backend
npm install
cp .env.example .env     # en Windows: copy .env.example .env
```

Abrí `.env` y completá **como mínimo**:

```ini
DB_HOST=el-host-de-tu-proveedor.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=la-contraseña
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_CA_PATH=./ca.pem        # el certificado del paso 1
JWT_ACCESS_SECRET=...          # generá uno: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crear las tablas y cargar los datos de ejemplo:

```bash
npm run db:init     # crea las 18 tablas (sql/schema.sql)
npm run db:seed     # categorías, 24 libros y los usuarios de prueba (ver credenciales.txt)
npm start           # API en http://localhost:4000
```

Comprobá que anda: `curl -X POST http://localhost:4000/api/salud` → `{"ok":true,"data":{"estado":"ok"}}`.

> ⚠ `db:init` falla si ya hay tablas, para no borrar datos por accidente. Para empezar de cero: `npm run db:init -- --reset` (**borra todo**).

### Si ya tenías la base creada con una versión anterior

No hace falta borrar nada. Esto agrega las columnas nuevas (curso y DNI del lector, código de retiro) y deja todo lo demás como está:

```bash
npm run db:migrar     # se puede ejecutar varias veces
```

### Portadas de los libros (links)

Las portadas se guardan como **link** (no se descargan imágenes). Se buscan en Open Library y, si no está, en Google Books:

* Al **agregar un libro**, la portada se completa sola (y el formulario muestra cómo queda antes de guardar).
* Al **iniciar el servidor**, los libros que no tienen portada la buscan solos en segundo plano.
* A mano, para todos los libros que no tengan: `npm run portadas` (o `npm run portadas -- --todas` para volver a buscar todas).
* Si alguna no se encuentra, se pega el link de la imagen en el campo "Portada" del libro.

> El servidor necesita salida a internet para esto. Si no hay conexión, la app funciona igual y muestra la inicial del título.

### Probar toda la API automáticamente

Con la API corriendo y una base **de pruebas** recién cargada:

```bash
LIMITE_AUTH=1000 npm start      # (otra terminal) el test hace muchos logins seguidos
npm test                        # ~137 comprobaciones: roles, permisos, préstamos, bloqueo, mensajes, etc.
```

El test modifica datos (bloquea usuarios, crea préstamos…). Para repetirlo: `npm run db:init -- --reset && npm run db:seed`.

### Emails (códigos de verificación, 2 pasos, avisos y pedidos a la distribuidora)

Sin configurar `SMTP_*`, los emails **no se envían**: se imprimen en la consola del servidor (sirve para desarrollar). Para enviarlos de verdad, completá en `.env`:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASS=contraseña-de-aplicación     # Google: Cuenta > Seguridad > Contraseñas de aplicaciones (requiere verificación en 2 pasos)
MAIL_FROM="Ceibo Libros <tu-cuenta@gmail.com>"
```

También sirven Brevo, Resend o Mailgun (todos dan datos SMTP). Además, cargá el email real de la distribuidora desde la app (menú > Pedir libros > Distribuidoras).

## Paso 3 · Publicar el backend (para que el celular lo alcance)

Mientras desarrollás, la app se conecta a tu computadora (ver paso 4). Para el APK final necesitás la API en internet. Con **Render** (gratis):

1. Subí el proyecto a GitHub.
2. En <https://render.com> → *New* → *Web Service* → elegí el repositorio.
3. **Root Directory:** `backend` · **Build Command:** `npm install` · **Start Command:** `npm start`.
4. En *Environment* pegá las mismas variables de tu `.env` (sin `DB_SSL_CA_PATH`: usá `DB_SSL_CA` con el contenido del certificado, reemplazando los saltos de línea por `\n`).
5. Render te da una URL tipo `https://ceibo-libros.onrender.com`. La API queda en `https://ceibo-libros.onrender.com/api`.

**Que funcione "en todo momento":** el plan gratuito de Render duerme el servicio tras ~15 min sin uso (la primera petición tarda unos segundos). Para evitarlo y para que las tareas diarias corran siempre:

* definí `CRON_SECRET=un-texto-largo` en las variables de Render;
* en <https://cron-job.org> (gratis) creá una tarea cada 10 minutos: `POST https://TU-URL/api/mantenimiento/recordatorios` con el header `x-cron-secret: <tu secreto>`. Eso mantiene despierto el servidor y ejecuta las tareas (recordatorios, vencimientos y bloqueos), que son idempotentes (no duplican avisos).

## Paso 4 · App móvil (Expo)

```bash
cd mobile
npm install
cp .env.example .env
```

En `mobile/.env` poné la URL de la API:

* **Celular físico con Expo Go + API en tu PC:** `EXPO_PUBLIC_API_URL=http://IP-DE-TU-PC:4000/api` (ej. `192.168.0.15`; el celular y la PC en el mismo wifi; permití el puerto 4000 en el firewall). Mirá tu IP con `ipconfig` (Windows) o `ip a` (Linux/Mac).
* **Emulador de Android:** `http://10.0.2.2:4000/api`.
* **API publicada:** `https://TU-URL/api`.

```bash
npx expo start          # escaneá el QR con Expo Go
npx expo start --web --port 8081   # o probala en el navegador de la compu
```

Ingresá con cualquiera de los usuarios de [`credenciales.txt`](../credenciales.txt).

## Paso 5 · Ingreso con Google, GitHub y Discord

La app ya trae los tres botones, pero **funcionan recién cuando cargás las credenciales de cada servicio** (son cuentas tuyas, no se pueden incluir en el código). La guía completa, con los datos exactos para la compu, Expo Go y el APK, está en [`LOGIN_SOCIAL.md`](LOGIN_SOCIAL.md). Resumen:

### Google
1. <https://console.cloud.google.com> → crear proyecto → *APIs y servicios* → *Pantalla de consentimiento OAuth* (externo) → agregá tu email como usuario de prueba.
2. *Credenciales* → *Crear ID de cliente OAuth*:
   * tipo **Aplicación web** → copiá el ID → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (sirve para probar en Expo Go / web; agregá como URI de redirección la que muestra Expo en la consola).
   * tipo **Android** → *Nombre del paquete* `com.ceibolibros.biblioteca` y la **huella SHA-1** de tu build (con `eas credentials` o en la consola de EAS) → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
3. En el **backend** (`.env` / Render): `GOOGLE_CLIENT_IDS=<id-web>,<id-android>` (el servidor verifica que el token sea de tu app).

### GitHub
1. GitHub → *Settings* → *Developer settings* → *OAuth Apps* → *New*. **Authorization callback URL:** `ceibolibros://oauth`.
2. Client ID → `EXPO_PUBLIC_GITHUB_CLIENT_ID` (app). Client ID y **Client secret** → `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` (**solo backend**; el secret nunca va en la app).

### Discord
1. <https://discord.com/developers/applications> → *New Application* → *OAuth2* → agregá el redirect `ceibolibros://oauth`.
2. Application ID → `EXPO_PUBLIC_DISCORD_CLIENT_ID` (app) y `DISCORD_CLIENT_ID` (backend).

> Quien entra por primera vez con una red social queda registrado como **Usuario**. Si ya existía una cuenta con ese email, se vincula.

## Paso 6 · Generar el APK (Android)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure                 # solo la primera vez (acepta lo que propone)
```

1. Abrí `mobile/eas.json` y reemplazá `https://TU-BACKEND.onrender.com/api` por la URL real de tu API (perfil `preview`).
2. Si usás ingreso social, agregá en ese mismo perfil `env` las variables `EXPO_PUBLIC_GOOGLE_*`, `EXPO_PUBLIC_GITHUB_CLIENT_ID`, `EXPO_PUBLIC_DISCORD_CLIENT_ID`.
3. Construí:

```bash
npm run build:apk                   # = eas build -p android --profile preview
```

4. Al terminar (unos 10–20 min) EAS te da un **enlace de descarga del `.apk`**. Descargalo, copialo al celular e instalalo (permití "instalar apps de orígenes desconocidos"). Ese archivo es el que se entrega.

## Regenerar el manual de usuario en PDF

El manual vive en `mobile/src/content/manual.json` (se muestra en la app y alimenta el PDF):

```bash
cd mobile
npm run manual:pdf      # genera un PDF por rol en mobile/assets/manuales/ y en docs/ (más docs/Manual_Completo.pdf)
```

## Limpiar usuarios de prueba

Para borrar cuentas de la base (solo lectores, nunca el dueño ni los bibliotecarios), desde `backend`:

```bash
npm run usuarios:limpiar                  # muestra a quién borraría, sin borrar
npm run usuarios:limpiar -- --confirmar   # borra a los lectores salvo Lucía y Tomás de demostración
```

Más opciones (`--email=`, `--incluir-demo`) en el [`README`](../README.md).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `No se pudo conectar a la base de datos (ECONNREFUSED / ETIMEDOUT)` | Datos de `.env` incorrectos o el proveedor bloquea tu IP: revisá la lista de IP permitidas en el panel de la base. |
| `self-signed certificate in certificate chain` | Falta el certificado: `DB_SSL_CA_PATH=./ca.pem`. Solo para probar: `DB_SSL_REJECT_UNAUTHORIZED=false`. |
| La app dice "No pudimos conectarnos con el servidor" | La URL de `EXPO_PUBLIC_API_URL` no es alcanzable desde el celular (IP, wifi, firewall) o el servidor está dormido (esperá unos segundos y reintentá). Reiniciá `npx expo start -c` tras cambiar el `.env`. |
| No llegan los emails | Falta `SMTP_*` (se imprimen en la consola del servidor) o la contraseña de aplicación es incorrecta. Revisá spam. |
| `429 Demasiados intentos` | Límite anti fuerza bruta de login (20 cada 15 min por IP). Esperá o ajustá `LIMITE_AUTH`. |
| El botón de Google dice "Falta configurar" | Faltan las variables `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` en `mobile/.env` (paso 5). |
