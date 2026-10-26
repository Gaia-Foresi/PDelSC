# Portfolio de Gaia Foresi

Portfolio personal con panel de administración. Todo lo que cambies en el panel se guarda en la base de datos (TiDB Cloud) y aparece en la página al instante.

- **Frontend:** TypeScript + Vite + CSS
- **Backend:** Node.js + Express (carpeta `server/`)
- **Base de datos:** TiDB Cloud (compatible con MySQL)
- **Hosting recomendado:** Vercel (gratis)

---

## 1. Correrlo en tu compu

Necesitás Node.js 18 o más nuevo.

```bash
cd portfolio
npm install
```

Revisá que exista el archivo `.env` con tus datos (si no, copiá `.env.example` como `.env` y completalo).

### Preparar la base de datos (una sola vez)

```bash
npm run db:setup
```

Crea todas las tablas y carga el contenido que ya tenías en la página. Podés correrlo las veces que quieras, porque nunca borra nada.

### Crear tu usuario del panel

```bash
npm run admin:crear -- gaia TuClaveNueva2026
```

Cambiá `gaia` y `TuClaveNueva2026` por el usuario y la contraseña que quieras (mínimo 8 caracteres).
**Si te olvidás la contraseña**, corré el mismo comando con una nueva y queda reemplazada.

### Levantar todo

```bash
npm run dev:full
```

- Portfolio: http://localhost:5173
- Panel: http://localhost:5173/#admin

---

## 2. Publicarlo en internet (Vercel + TiDB Cloud)

### ¿Por qué así?

El panel necesita **guardar** cambios. Un hosting de páginas estáticas (GitHub Pages, Netlify sin funciones) solo muestra archivos, no puede guardar nada. Por eso usamos:

| Parte | Dónde vive | Costo |
|---|---|---|
| La página (HTML/CSS/JS) | Vercel | Gratis |
| La API (`/api/...`) | Vercel, como "función serverless" | Gratis |
| Los datos (textos, proyectos, mensajes, usuarios) | TiDB Cloud | Gratis |

Vercel ya está configurado en `vercel.json` y la API entra por `api/index.ts`.

### Paso a paso

1. **Subí el proyecto a GitHub.**
   El `.gitignore` ya evita que se suba el `.env` con tus contraseñas. Verificalo en GitHub: el `.env` **no** tiene que aparecer.

2. **Entrá a [vercel.com](https://vercel.com)** con tu cuenta de GitHub, tocá **Add New → Project** e importá el repositorio.

3. **Configurá el proyecto:**
   - **Root Directory:** `portfolio` (si el repo tiene la carpeta `portfolio` adentro; si el repo ya *es* esa carpeta, dejalo vacío)
   - **Framework Preset:** Vite (lo detecta solo)
   - Build y Output: dejá lo que viene (usa `vercel.json`)

4. **Cargá las variables de entorno** (Settings → Environment Variables), las mismas de tu `.env`:

   | Nombre | Valor |
   |---|---|
   | `TIDB_HOST` | el host de tu cluster |
   | `TIDB_PORT` | `4000` |
   | `TIDB_USER` | tu usuario de TiDB |
   | `TIDB_PASSWORD` | tu contraseña de TiDB |
   | `TIDB_DB_NAME` | `test` (o el nombre de tu base) |
   | `JWT_SECRET` | el texto largo de tu `.env` |

5. **Deploy.** En un minuto te da una dirección tipo `https://tu-portfolio.vercel.app`.

6. **Probá que la base conecte:** entrá a `https://tu-portfolio.vercel.app/api/health`. Tiene que decir `{"ok":true,"db":"conectada"}`.

7. **Entrá al panel:** `https://tu-portfolio.vercel.app/#admin` con el usuario que creaste con `npm run admin:crear`.

> La base de datos es la misma para tu compu y para Vercel, así que `db:setup` y `admin:crear` se corren **desde tu compu** y ya sirven para la versión publicada.

Cada vez que hagas `git push`, Vercel vuelve a publicar solo.

### Alternativa: Render o Railway

Si preferís un servidor Node "siempre prendido":

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Las mismas variables de entorno.

El servidor sirve la página y la API juntas. (En el plan gratis de Render el servidor "se duerme" y tarda unos segundos en despertar.)

---

## 3. Estructura

```
portfolio/
├── api/index.ts          ← entrada de la API en Vercel
├── server/
│   ├── app.ts            ← app de Express (la usan Vercel y el server local)
│   ├── index.ts          ← server local / Render
│   ├── routes.ts         ← todas las rutas /api/...
│   ├── middleware.ts     ← login con token (JWT) y límite de intentos
│   ├── db.ts             ← conexión a TiDB
│   ├── schema.ts         ← tablas y contenido inicial
│   └── scripts/
│       ├── setup-db.ts   ← npm run db:setup
│       └── crear-admin.ts← npm run admin:crear
├── src/
│   ├── main.ts           ← arma la página (o el panel si la URL es #admin)
│   ├── lib/content.ts    ← pide el contenido a la API
│   ├── components/       ← cada sección del portfolio
│   ├── admin/            ← panel de administración
│   └── styles/style.css  ← estilos (colores en las variables de arriba de todo)
└── public/foto-perfil.jpg
```

### Tablas

| Tabla | Para qué |
|---|---|
| `admin_usuarios` | usuarios del panel (contraseña encriptada con bcrypt) |
| `perfil` | textos sueltos: nombre, sobre mí, números, contacto |
| `habilidades` | nombre, nivel (1 a 5), categoría, orden |
| `experiencias` | título, lugar, fecha, descripción, tecnologías, orden |
| `proyectos` | nombre, fecha, descripción, características, tecnologías, links, orden |
| `contactos` | mensajes del formulario (con marca de leído) |

### API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/contenido` | público |
| POST | `/api/contacto` | público |
| GET | `/api/health` | público |
| POST | `/api/admin/login` | público |
| GET | `/api/admin/contactos` | admin |
| PATCH / DELETE | `/api/admin/contactos/:id` | admin |
| PUT | `/api/admin/perfil` | admin |
| POST | `/api/admin/{habilidades,experiencias,proyectos}` | admin |
| PUT / DELETE | `/api/admin/{...}/:id` | admin |
| PUT | `/api/admin/{...}/orden` | admin |
| PUT | `/api/admin/password` | admin |
