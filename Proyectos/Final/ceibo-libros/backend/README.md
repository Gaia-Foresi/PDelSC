# Ceibo Libros · Backend (API REST)

API de la biblioteca **Ceibo Libros**: Node.js + Express + MySQL (base de datos en la nube), autenticación con JWT (acceso + renovación), roles y middlewares.

> **Regla del proyecto:** todos los endpoints usan el método **`POST`** (no existe ningún `GET`). Los datos viajan siempre en el cuerpo JSON y el token en el header `Authorization: Bearer <access_token>`. Cualquier otro método devuelve `405`.

## Contenido

1. [Instalación y configuración](#1-instalación-y-configuración)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Convenciones de la API](#3-convenciones-de-la-api)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Endpoints](#5-endpoints)
6. [Códigos de error](#6-códigos-de-error)
7. [Reglas de negocio](#7-reglas-de-negocio)

---

## 1. Instalación y configuración

Ver la guía completa en [`../docs/GUIA_INSTALACION.md`](../docs/GUIA_INSTALACION.md). Resumen:

```bash
cd backend
npm install
cp .env.example .env        # completar con los datos de tu base MySQL en la nube
npm run db:init             # crea las tablas (sql/schema.sql)
npm run db:seed             # carga categorías, libros y usuarios de prueba
npm run db:migrar           # actualiza una base ya creada a la versión nueva (curso, DNI y código de retiro), sin borrar datos
npm run portadas            # busca en internet el link de la portada de los libros que no tienen (-- --todas: de todos)
npm start                   # http://localhost:4000
```

Variables de entorno (`.env`): ver `.env.example` (base de datos, secretos JWT, SMTP para emails, credenciales OAuth).

## 2. Estructura de carpetas

```
backend/
├── sql/schema.sql            # esquema de la base (3FN)
├── scripts/                  # db-init, seed, recordatorios y smoke-test (npm test)
├── src/
│   ├── server.js             # arranque + cron de recordatorios
│   ├── app.js                # express, middlewares globales, rutas
│   ├── config/               # env y pool MySQL
│   ├── middlewares/          # auth (JWT), roles, validate (zod), errores
│   ├── routes/               # una ruta por módulo
│   ├── controllers/          # lógica de cada endpoint
│   ├── services/             # mailer, oauth, recordatorios, préstamos
│   └── utils/
└── README.md                 # esta documentación
```

## 3. Convenciones de la API

* Base URL: `http://<host>:4000/api`
* Todas las peticiones: `POST`, `Content-Type: application/json`.
* Respuesta correcta: `200` (o `201` al crear) con `{ "ok": true, "data": { ... } }`.
* Respuesta con error: `{ "ok": false, "error": { "codigo": "EMAIL_EN_USO", "mensaje": "Texto para mostrar al usuario", "detalles": { "campo": "mensaje" } } }` (`detalles` solo en errores de validación).
* Fechas: `DATE` como `YYYY-MM-DD`; `DATETIME` en ISO 8601 (UTC).
* Los access tokens duran 15 min; el refresh token 30 días y se **rota** en cada renovación.

**Objeto `usuario`** (se devuelve en login/perfil):

```json
{ "id": 1, "nombre": "Ana", "apellido": "Pérez", "email": "ana@mail.com",
  "rol": "usuario", "estado": "activo", "motivo_bloqueo": null,
  "telefono": null, "foto_url": null, "dos_pasos_activo": false, "creado_en": "2026-10-01T12:00:00.000Z" }
```
`rol` ∈ `dueno | bibliotecario | usuario` · `estado` ∈ `activo | bloqueado`.

**Objeto `libro`**:

```json
{ "id": 3, "titulo": "Cien años de soledad", "autor": "Gabriel García Márquez",
  "categoria_id": 7, "categoria": "Clásicos", "categoria_codigo": "C",
  "descripcion": "...", "portada_url": null, "stock_total": 4, "disponibles": 2 }
```

**Objeto `prestamo`**:

```json
{ "id": 10, "usuario": { "id": 5, "nombre": "Ana Pérez", "email": "ana@mail.com" },
  "registrado_por": "Bibi Bibliotecaria",
  "fecha_inicio": "2026-10-01", "fecha_vencimiento": "2026-10-15",
  "estado": "activo", "vencido": false, "dias_restantes": 3,
  "items": [ { "libro_id": 3, "titulo": "…", "autor": "…", "devuelto_en": null } ] }
```
`estado` ∈ `activo | cerrado` (un préstamo activo con `fecha_vencimiento` pasada trae `vencido: true`).

**Objeto `reserva`**:

```json
{ "id": 4, "tipo": "sala", "estado": "activa", "creada_en": "…", "fecha_limite": "…",
  "libro": { "id": 3, "titulo": "…", "autor": "…" },
  "usuario": { "id": 5, "nombre": "Ana Pérez" } }
```
`tipo` ∈ `sala` (leer en la biblioteca) | `retiro` (reservar para llevar) · `estado` ∈ `activa | cumplida | cancelada | vencida`.

## 4. Roles y permisos

| Símbolo | Rol |
|---|---|
| **D** | `dueno` |
| **B** | `bibliotecario` |
| **U** | `usuario` |
| **S** | staff = D + B |

Los endpoints indican qué roles pueden usarlos; el middleware `requiereRol` responde `403 SIN_PERMISO` al resto.

## 5. Endpoints

### 5.1 Autenticación (`/api/auth`, sin token)

| Endpoint | Body | Respuesta `data` |
|---|---|---|
| `POST /auth/registro` | `nombre, apellido, email, password` (mín. 8, letra y número) | `{ requiere_verificacion: true, email }` — envía un código por email |
| `POST /auth/verificar-email` | `email, codigo` | `{ usuario, access_token, refresh_token }` |
| `POST /auth/login` | `email, password` | Una de: `{ usuario, access_token, refresh_token }` · `{ requiere_2fa: true, email }` (tiene 2 pasos activo; se envió código) · `{ requiere_verificacion: true, email }` (email sin verificar; se reenvió código) |
| `POST /auth/login-2fa` | `email, codigo` | `{ usuario, access_token, refresh_token }` |
| `POST /auth/reenviar-codigo` | `email, proposito` (`verificar_email` · `login_2fa` · `reset_password`) | `{ enviado: true }` |
| `POST /auth/social` | `proveedor` (`google` · `github` · `discord`) + `token` (Google/Discord: access token) **o** `code` + `redirect_uri` (+ `code_verifier`) (GitHub) | `{ usuario, access_token, refresh_token }` (crea la cuenta como `usuario` si no existe) |
| `POST /auth/refresh` | `refresh_token` | `{ access_token, refresh_token }` (el anterior queda revocado) |
| `POST /auth/logout` | `refresh_token` | `{ ok: true }` |
| `POST /auth/olvide-password` | `email` | `{ enviado: true }` (siempre, exista o no el email) |
| `POST /auth/reset-password` | `email, codigo, password` | `{ actualizado: true }` |

### 5.2 Usuarios y administración (`/api/usuarios`, `/api/admin`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /usuarios/perfil` | todos | — | `{ usuario, resumen: { prestamos_activos, reservas_activas } }` |
| `POST /usuarios/actualizar-perfil` | todos | `nombre?, apellido?, telefono?, curso?, dni?, foto_url?` (URL `https://…` o imagen `data:image/jpeg;base64,…` de hasta ~200 KB; `''` la quita) | `{ usuario }` |
| `POST /usuarios/cambiar-password` | todos | `password_actual?` (obligatoria si ya tenía), `password_nueva` | `{ actualizado: true }` |
| `POST /usuarios/dos-pasos` | todos | `activar: boolean` | `{ usuario }` |
| `POST /usuarios/listar` | S | `q?, rol?, estado?, pagina? (1), limite? (30)` | `{ usuarios: [{ ...usuario, prestamos_activos }], total }` |
| `POST /usuarios/detalle` | S | `id` | `{ usuario, prestamos: [prestamo], reservas: [reserva] }` |
| `POST /usuarios/bloquear` | S | `id, motivo` | `{ usuario }` — solo a rol `usuario`; el motivo se le muestra y se le envía una notificación |
| `POST /usuarios/desbloquear` | S | `id` | `{ usuario }` |
| `POST /admin/cambiar-rol` | D | `id, rol` | `{ usuario }` — no podés cambiar tu propio rol |

### 5.3 Categorías (`/api/categorias`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /categorias/listar` | todos | — | `{ categorias: [{ id, codigo, nombre, descripcion, icono, color, total_libros }] }` |
| `POST /categorias/crear` | S | `codigo, nombre, descripcion?, icono?, color?` | `{ categoria }` |
| `POST /categorias/actualizar` | S | `id` + campos | `{ categoria }` |
| `POST /categorias/eliminar` | D | `id` | `{ eliminado: true }` — `409 CATEGORIA_CON_LIBROS` si tiene libros |

### 5.4 Libros / stock (`/api/libros`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /libros/listar` | todos | `categoria_id?, q?, solo_disponibles?` | `{ libros: [libro] }` |
| `POST /libros/detalle` | todos | `id` | `{ libro }` |
| `POST /libros/crear` | S | `titulo, autor, categoria_id, descripcion?, stock_total, portada_url?` | `{ libro }` (crea el autor si no existe; si no se manda `portada_url` la busca sola en Open Library / Google Books y guarda el **link**) |
| `POST /libros/buscar-portada` | S | `titulo, autor?` | `{ portada_url: string \| null }` — vista previa del formulario |
| `POST /libros/actualizar` | S | `id` + campos | `{ libro }` |
| `POST /libros/eliminar` | D | `id` | `{ eliminado: true }` — baja lógica; `409 LIBRO_EN_USO` si está prestado o reservado |

### 5.5 Reservas (`/api/reservas`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /reservas/crear` | U (también B/D para sí mismos) | `libro_id, tipo, nombre, apellido, curso, dni` (los datos quedan guardados en el perfil) | `{ reserva }` con `codigo_retiro` (6 caracteres) |
| `POST /reservas/mis` | todos | `estado?` | `{ reservas: [reserva] }` |
| `POST /reservas/listar` | S | `estado?, q?` | `{ reservas: [reserva] }` |
| `POST /reservas/cancelar` | dueña de la reserva o S | `id` | `{ reserva }` |
| `POST /reservas/atender` | S | `id, dias?` (14) | `{ reserva, prestamo? }` — `sala`: queda `cumplida`; `retiro`: crea el préstamo y queda `cumplida` |

> `q` en `reservas/listar` y `prestamos/listar` también encuentra por **código de retiro** (exacto), **DNI**, nombre o título del libro.

### 5.6 Préstamos (`/api/prestamos`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /prestamos/crear` | S | `usuario_id, libro_ids: number[], dias? (14), nombre?, apellido?, curso?, dni?` (si al lector le faltan apellido, curso o DNI y no se mandan → `400` con el detalle) | `{ prestamo }` con `codigo_retiro` y `usuario.curso/dni` |
| `POST /prestamos/mis` | todos | — | `{ prestamos: [prestamo] }` |
| `POST /prestamos/listar` | S | `estado? (activo · cerrado · vencido), usuario_id?, q?` | `{ prestamos: [prestamo] }` |
| `POST /prestamos/detalle` | dueño del préstamo o S | `id` | `{ prestamo }` |
| `POST /prestamos/agregar-libros` | S | `prestamo_id, libro_ids` | `{ prestamo }` |
| `POST /prestamos/devolver` | S | `prestamo_id, libro_id?` (sin `libro_id` devuelve todos) | `{ prestamo, usuario_desbloqueado: boolean }` |
| `POST /prestamos/extender` | S | `prestamo_id, dias` (1–30) | `{ prestamo }` |

### 5.7 Mensajes (`/api/mensajes`)

Dos tipos de hilo: **`consulta`** (usuario → biblioteca; lo ven y responden D y B) e **`interno`** (entre D y B).

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /mensajes/hilos` | todos | — | `{ hilos: [{ id, tipo, asunto, ultimo_mensaje, ultimo_en, no_leidos, con }] }` — `con` = `{ id, nombre, rol }` de la otra parte (el usuario que consulta, o el otro miembro del staff) |
| `POST /mensajes/hilo` | participante o S (consultas) | `hilo_id` | `{ hilo, mensajes: [{ id, remitente: { id, nombre, rol }, cuerpo, creado_en, mio }] }` — marca como leído |
| `POST /mensajes/crear` | U: `consulta` · S: `interno` | `tipo, asunto, cuerpo, destinatario_id?` (obligatorio en `interno`) | `{ hilo }` |
| `POST /mensajes/enviar` | participante o S | `hilo_id, cuerpo` | `{ mensaje }` |
| `POST /mensajes/no-leidos` | todos | — | `{ total }` |
| `POST /mensajes/contactos` | S | — | `{ contactos: [{ id, nombre, rol }] }` — el dueño ve bibliotecarios; el bibliotecario ve dueños |

### 5.8 Distribuidoras y reposición (`/api/distribuidoras`, `/api/reposicion`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /distribuidoras/listar` | D | — | `{ distribuidoras: [{ id, nombre, email, telefono }] }` |
| `POST /distribuidoras/crear` | D | `nombre, email, telefono?` | `{ distribuidora }` |
| `POST /distribuidoras/actualizar` | D | `id` + campos | `{ distribuidora }` |
| `POST /distribuidoras/eliminar` | D | `id` | `{ eliminado: true }` |
| `POST /reposicion/crear` | D | `distribuidora_id, mensaje?, items: [{ libro_id?, titulo?, cantidad }]` | `{ pedido: { id, estado_envio } }` — envía el email a la distribuidora |
| `POST /reposicion/listar` | D | — | `{ pedidos: [{ id, distribuidora, mensaje, estado_envio, creado_en, items }] }` |

### 5.9 Notificaciones (`/api/notificaciones`)

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /notificaciones/listar` | todos | `solo_no_leidas?` | `{ notificaciones: [{ id, tipo, titulo, cuerpo, leida, creada_en }] }` |
| `POST /notificaciones/marcar-leidas` | todos | `ids?` (sin `ids` marca todas) | `{ marcadas }` |
| `POST /notificaciones/cantidad` | todos | — | `{ total }` (no leídas) |

### 5.10 Estadísticas y salud

| Endpoint | Rol | Body | Respuesta `data` |
|---|---|---|---|
| `POST /estadisticas/resumen` | D | — | `{ totales: { libros, ejemplares, usuarios, bibliotecarios, bloqueados, prestamos_activos, prestamos_vencidos, reservas_activas }, prestamos_por_mes: [{ mes, total }], libros_mas_prestados: [{ titulo, total }], por_categoria: [{ categoria, total }] }` |
| `POST /salud` | público | — | `{ estado: "ok" }` |

## 6. Códigos de error

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 400 | `VALIDACION` | Datos inválidos (`detalles` indica el campo) |
| 401 | `NO_AUTENTICADO` | Falta el token o es inválido |
| 401 | `TOKEN_EXPIRADO` | El access token venció → usar `/auth/refresh` |
| 401 | `CREDENCIALES_INVALIDAS` | Email o contraseña incorrectos |
| 401 | `CODIGO_INVALIDO` | Código de email incorrecto o vencido |
| 401 | `REFRESH_INVALIDO` | Refresh token inválido, vencido o revocado |
| 403 | `SIN_PERMISO` | El rol no puede usar el endpoint |
| 403 | `USUARIO_BLOQUEADO` | Acción no permitida a un usuario bloqueado (reservar) |
| 404 | `NO_ENCONTRADO` | El recurso no existe |
| 405 | `METODO_NO_PERMITIDO` | Se usó otro método distinto de `POST` |
| 409 | `EMAIL_EN_USO` · `LIBRO_EN_USO` · `CATEGORIA_CON_LIBROS` · `SIN_STOCK` · `LIMITE_ALCANZADO` · `YA_RESERVADO` | Conflictos de negocio |
| 422 | `ESTADO_INVALIDO` | La operación no corresponde al estado actual |
| 429 | `DEMASIADOS_INTENTOS` | Límite de peticiones (login/códigos) |
| 502 | `PROVEEDOR_SOCIAL` | Falló la verificación con Google/GitHub/Discord |
| 500 | `ERROR_INTERNO` | Error inesperado |

## 7. Reglas de negocio

* **Registro:** crea siempre rol `usuario`. Solo el dueño puede cambiar roles (panel de admin).
* **Disponibilidad:** `disponibles = stock_total − ejemplares prestados sin devolver − reservas activas`.
* **Reservas:** máx. 3 activas por usuario. `sala` vence a las 24 h, `retiro` a los 3 días. Un usuario bloqueado no puede reservar.
* **Préstamos:** máx. 5 libros por préstamo, plazo por defecto 14 días. Se pueden agregar libros a un préstamo abierto.
* **No se eliminan usuarios:** se **bloquean** con un mensaje. El bloqueo se levanta automáticamente cuando devuelve el último libro (o a mano con `/usuarios/desbloquear`).
* **Bloqueo automático:** si un préstamo está vencido, la tarea diaria bloquea al usuario con un mensaje para que devuelva los libros.
* **Recordatorios:** la tarea diaria (cron) avisa por notificación y email **2 días antes** del vencimiento (configurable con `RECORDATORIO_DIAS`).
* **Eliminar** un libro/categoría/distribuidora es una baja lógica o falla si está en uso; la app siempre pide confirmación antes. **Solo el dueño** puede eliminar libros y categorías (el bibliotecario puede crearlos y editarlos).
* **Fotos de perfil:** la app reduce la imagen (256 px, JPEG) y la guarda en la base (`usuarios.foto_url`); en los listados de usuarios no se envían las fotos subidas, solo en el perfil/detalle.
